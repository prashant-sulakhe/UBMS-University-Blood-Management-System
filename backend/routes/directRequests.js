import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { sendDirectRequestEmail, sendDirectRequestAcceptedEmail } from '../services/emailService.js';
import { sendNotification } from './notifications.js';

const router = express.Router();

/**
 * POST /api/direct-request/send/:receiverId
 * Send a direct blood request to a specific user.
 */
router.post('/send/:receiverId', authenticateToken, async (req, res) => {
  try {
    const receiverId = req.params.receiverId;
    const requesterId = req.user.id;
    const { blood_group, units, hospital, location, contact, message } = req.body;

    if (requesterId == receiverId) {
      return res.status(400).json({ message: 'You cannot send a request to yourself.' });
    }

    // Get requester details
    const [reqRows] = await pool.execute('SELECT name, email, phone FROM users WHERE id = ?', [requesterId]);
    if (reqRows.length === 0) return res.status(404).json({ message: 'Requester not found' });
    const requester = reqRows[0];

    // Get receiver details
    const [recRows] = await pool.execute('SELECT name, email, phone, blood_group FROM users WHERE id = ?', [receiverId]);
    if (recRows.length === 0) return res.status(404).json({ message: 'Receiver not found' });
    const receiver = recRows[0];

    // Insert into database
    const [result] = await pool.execute(
      `INSERT INTO direct_requests (requester_id, receiver_id, blood_group, units, hospital, location, contact, message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [requesterId, receiverId, blood_group, units || 1, hospital, location, contact, message || null]
    );

    const requestId = result.insertId;

    // Send in-app notification
    const notifTitle = `Direct Request from ${requester.name}`;
    const notifMsg = `${requester.name} has requested ${units || 1} unit(s) of ${blood_group} blood from you at ${hospital}.`;
    
    // sendNotification saves to DB and emits socket if io exists
    await sendNotification(receiverId, notifTitle, notifMsg, 'direct_request', req.io, requesterId, requestId);

    // If io exists, also emit a specific direct request event
    if (req.io) {
      req.io.to(`user_${receiverId}`).emit('new_direct_request', {
        request_id: requestId,
        requester: requester.name,
        blood_group,
        units: units || 1,
        hospital,
        location
      });
    }

    // Send Email to Receiver
    sendDirectRequestEmail(receiver.email, {
      requesterName: requester.name,
      bloodGroup: blood_group,
      unitsRequired: units || 1,
      hospital: hospital,
      location: location,
      contactNumber: contact,
      message: message,
      requestId: requestId
    }).catch(err => console.error('[direct-request] Error sending direct request email:', err));

    res.status(201).json({ message: 'Direct request sent successfully', request_id: requestId });

  } catch (error) {
    console.error('[direct-request] POST /send error:', error);
    res.status(500).json({ message: 'Failed to send direct request' });
  }
});

/**
 * POST /api/direct-request/accept/:requestId
 * Accept a direct request.
 */
router.post('/accept/:requestId', authenticateToken, async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const receiverId = req.user.id;

    // Verify request
    const [reqRows] = await pool.execute('SELECT * FROM direct_requests WHERE id = ? AND receiver_id = ?', [requestId, receiverId]);
    if (reqRows.length === 0) return res.status(404).json({ message: 'Request not found or access denied' });
    const directRequest = reqRows[0];

    if (directRequest.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: "Request already completed"
      });
    }

    if (directRequest.status !== 'Pending') {
      return res.status(400).json({ message: 'Request is already processed' });
    }

    // Update status
    await pool.execute("UPDATE direct_requests SET status = 'Accepted' WHERE id = ?", [requestId]);

    // Update notification status
    await pool.execute("UPDATE notifications SET action_status = 'accepted', is_read = TRUE WHERE request_id = ? AND type = 'direct_request'", [requestId]);

    // Get donor details
    const [donorRows] = await pool.execute('SELECT id, name, email, phone, blood_group, location, gender FROM users WHERE id = ?', [receiverId]);
    const donor = donorRows[0];

    // Get requester details
    const [requesterRows] = await pool.execute('SELECT email, name FROM users WHERE id = ?', [directRequest.requester_id]);
    const requester = requesterRows[0];

    // Send Notification to requester
    const notifTitle = 'Direct Request Accepted';
    const notifMsg = `${donor.name} has accepted your direct blood request!`;
    await sendNotification(directRequest.requester_id, notifTitle, notifMsg, 'direct_request_accepted', req.io, receiverId, requestId);

    if (req.io) {
       req.io.to(`user_${directRequest.requester_id}`).emit('direct_request_accepted', {
         request_id: requestId,
         donorName: donor.name
       });
    }

    // Send Email to Requester
    sendDirectRequestAcceptedEmail(requester.email, {
      requesterName: requester.name,
      donorName: donor.name,
      donorEmail: donor.email,
      donorPhone: donor.phone,
      bloodGroup: donor.blood_group,
      location: donor.location,
      donorGender: donor.gender,
      donorId: donor.id,
      requestId: requestId
    }).catch(err => console.error('[direct-request] Error sending accept email:', err));

    res.json({ message: 'Request accepted successfully' });

  } catch (error) {
    console.error('[direct-request] POST /accept error:', error);
    res.status(500).json({ message: 'Failed to accept request' });
  }
});

/**
 * POST /api/direct-request/decline/:requestId
 * Decline a direct request.
 */
router.post('/decline/:requestId', authenticateToken, async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const receiverId = req.user.id;

    // Verify request
    const [reqRows] = await pool.execute('SELECT * FROM direct_requests WHERE id = ? AND receiver_id = ?', [requestId, receiverId]);
    if (reqRows.length === 0) return res.status(404).json({ message: 'Request not found or access denied' });
    const directRequest = reqRows[0];

    if (directRequest.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: "Request already completed"
      });
    }

    if (directRequest.status !== 'Pending') {
      return res.status(400).json({ message: 'Request is already processed' });
    }

    // Update status
    await pool.execute("UPDATE direct_requests SET status = 'Declined' WHERE id = ?", [requestId]);

    // Update notification status
    await pool.execute("UPDATE notifications SET action_status = 'declined', is_read = TRUE WHERE request_id = ? AND type = 'direct_request'", [requestId]);

    // Get donor details
    const [donorRows] = await pool.execute('SELECT name FROM users WHERE id = ?', [receiverId]);
    const donor = donorRows[0];

    // Send Notification to requester
    const notifTitle = 'Direct Request Declined';
    const notifMsg = `${donor.name} has declined your direct blood request.`;
    await sendNotification(directRequest.requester_id, notifTitle, notifMsg, 'direct_request_declined', req.io, receiverId, requestId);

    if (req.io) {
       req.io.to(`user_${directRequest.requester_id}`).emit('direct_request_declined', {
         request_id: requestId,
         donorName: donor.name
       });
    }

    res.json({ message: 'Request declined successfully' });

  } catch (error) {
    console.error('[direct-request] POST /decline error:', error);
    res.status(500).json({ message: 'Failed to decline request' });
  }
});

/**
 * POST /api/direct-request/complete/:requestId
 * Mark a direct request as completed. Owner (requester) or Admin only.
 */
router.post('/complete/:requestId', authenticateToken, async (req, res) => {
  try {
    const requestId = req.params.requestId;

    // Check request exists
    const [existing] = await pool.execute('SELECT * FROM direct_requests WHERE id = ?', [requestId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Direct request not found' });
    }

    const request = existing[0];

    // Only owner (requester) or admin can complete
    if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (request.status === 'Completed') {
      return res.status(400).json({ message: 'Request is already completed' });
    }

    // Update status
    await pool.execute("UPDATE direct_requests SET status = 'Completed' WHERE id = ?", [requestId]);

    // Update ALL notifications linked to this request with completion message
    await pool.execute(
      `UPDATE notifications 
       SET message = 'This donation was completed', is_read = TRUE
       WHERE request_id = ? AND type IN ('direct_request', 'direct_request_accepted', 'BloodRequest', 'DonationAccepted')`,
      [requestId]
    );

    if (req.io) {
      req.io.emit('direct_request_completed', { request_id: requestId });
      req.io.emit('request_stats_updated');
      // Broadcast request_completed so ALL donor notification panels update instantly
      req.io.emit('request_completed', { request_id: requestId });
    }

    console.log(`[direct-request] Direct Request #${requestId} marked completed by user ${req.user.id}`);
    res.json({ message: 'Direct request marked completed successfully' });

  } catch (error) {
    console.error('[direct-request] POST /complete error:', error);
    res.status(500).json({ message: 'Failed to complete direct request' });
  }
});

/**
 * GET /api/direct-request/user/sent
 * Get all requests sent by the logged-in user.
 */
router.get('/user/sent', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT dr.*, u.name as receiver_name, u.email as receiver_email, u.phone as receiver_phone, u.location as receiver_location, u.blood_group as receiver_blood_group 
       FROM direct_requests dr
       JOIN users u ON dr.receiver_id = u.id
       WHERE dr.requester_id = ?
       ORDER BY dr.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch sent requests' });
  }
});

/**
 * GET /api/direct-request/user/received
 * Get all requests received by the logged-in user.
 */
router.get('/user/received', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT dr.*, u.name as requester_name, u.email as requester_email, u.phone as requester_phone 
       FROM direct_requests dr
       JOIN users u ON dr.requester_id = u.id
       WHERE dr.receiver_id = ?
       ORDER BY dr.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch received requests' });
  }
});

/**
 * GET /api/direct-request/admin/all
 * Admin: Get all direct requests.
 */
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT dr.*, req.name as requester_name, rec.name as receiver_name
       FROM direct_requests dr
       JOIN users req ON dr.requester_id = req.id
       JOIN users rec ON dr.receiver_id = rec.id
       ORDER BY dr.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch all requests' });
  }
});

export default router;
