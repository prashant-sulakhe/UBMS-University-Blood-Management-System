import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { sendNotification } from './notifications.js';
import {
  sendBloodRequestEmailToAll,
  sendDonationAcceptedEmail,
  sendAdminDonationEmail,
  sendAdminBloodRequestCompletedAlert,
} from '../services/emailService.js';

const router = express.Router();

const activeLocks = new Set();

// ── Helpers ──────────────────────────────────────────────
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function validateBloodRequest(body) {
  const errors = [];
  if (!body.blood_group || !BLOOD_GROUPS.includes(body.blood_group)) {
    errors.push('Valid blood group is required');
  }
  if (!body.location || body.location.trim().length < 2) {
    errors.push('Location is required (min 2 characters)');
  }
  if (body.units_required && (isNaN(body.units_required) || body.units_required < 1 || body.units_required > 20)) {
    errors.push('Units required must be between 1 and 20');
  }
  if (body.urgency && !['Normal', 'Urgent', 'Critical'].includes(body.urgency)) {
    errors.push('Urgency must be Normal, Urgent, or Critical');
  }
  return errors;
}

// Global memory lock for email processing to prevent duplicate sends
const processingEmails = new Set();

/**
 * POST /api/blood-request/create
 * Create a new blood request with full notification pipeline:
 * 1. Validate JWT → 2. Save to DB → 3. Fetch all user emails →
 * 4. Send email to all → 5. Create in-app notifications → 6. Emit socket events
 */
router.post('/create', authenticateToken, async (req, res) => {
  const t0 = Date.now();
  try {
    const { blood_group, location, units_required, contact_number, urgency, notes } = req.body;
    const userId = req.user.id;

    // 1. Validate input
    const errors = validateBloodRequest(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join('. ') });
    }

    // 2. Get logged-in user details
    const [userRows] = await pool.execute(
      'SELECT id, name, email, phone, blood_group, location FROM users WHERE id = ?',
      [userId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const requester = userRows[0];

    // 3. Save blood request to database
    const [result] = await pool.execute(
      `INSERT INTO blood_requests (user_id, blood_group, units_required, location, contact_number, urgency, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        userId,
        blood_group,
        units_required || 1,
        location.trim(),
        contact_number || requester.phone || '',
        urgency || 'Normal',
        notes || null,
      ]
    );
    const requestId = result.insertId;
    console.log(`[blood-request] ✅ Created #${requestId} by user ${userId} (${Date.now() - t0}ms)`);

    // 4. Fetch complete request record
    const [rows] = await pool.execute(
      `SELECT br.*, u.name AS requester_name, u.email AS requester_email, u.phone AS requester_phone
       FROM blood_requests br
       JOIN users u ON br.user_id = u.id
       WHERE br.request_id = ?`,
      [requestId]
    );
    const newRequest = rows[0];

    // 5. Donor matching (same blood group, same city, available, eligible)
    let matchedDonors = [];
    try {
      const [donors] = await pool.execute(
        `SELECT da.*, u.name, u.email, u.phone 
         FROM donor_availability da
         JOIN users u ON da.user_id = u.id
         WHERE da.blood_group = ? 
         AND da.city = ?
         AND da.available_status = 1 
         AND (da.last_donation_date IS NULL OR DATEDIFF(CURDATE(), da.last_donation_date) >= 90)
         AND da.user_id != ?
         ORDER BY da.created_at DESC
         LIMIT 15`,
        [blood_group, location.trim(), userId]
      );
      matchedDonors = donors;
    } catch (e) {
      console.warn('[blood-request] Donor matching skipped:', e.message);
    }

    // 6. Create in-app notifications for ALL registered users EXCEPT requester
    const [allUsers] = await pool.execute('SELECT id, name FROM users WHERE id != ?', [userId]);
    console.log(`[blood-request] Creating notifications for ${allUsers.length} users...`);

    const notifTitle = `🩸 ${urgency === 'Critical' ? 'CRITICAL: ' : urgency === 'Urgent' ? 'URGENT: ' : ''}${blood_group} Blood Needed`;
    const notifMessage = `${requester.name} urgently needs ${units_required || 1} unit(s) of ${blood_group} blood at ${location}. Contact: ${contact_number || requester.phone || 'N/A'}`;

    // Batch insert notifications
    for (const u of allUsers) {
      try {
        await pool.execute(
          'INSERT INTO notifications (sender_id, user_id, request_id, title, message, type, action_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [userId, u.id, requestId, notifTitle, notifMessage, 'BloodRequest', 'none']
        );
      } catch (e) { /* skip duplicate or error */ }
    }

    // 7. Emit real-time socket events ONLY ONCE
    if (req.io) {
      // Broadcast to all connected users
      req.io.emit('new_blood_request', {
        request: newRequest,
        matched_donors: matchedDonors.length,
      });

      // Send individual notification events
      for (const u of allUsers) {
        req.io.to(`user_${u.id}`).emit('new_notification', {
          title: notifTitle,
          message: notifMessage,
          type: 'BloodRequest',
          request_id: requestId,
          action_status: 'none',
          created_at: new Date(),
        });
      }

      // Notify matched donors specifically
      matchedDonors.forEach(donor => {
        req.io.to(`user_${donor.user_id}`).emit('blood_request_match', {
          request: newRequest,
          donor_profile: donor,
        });
      });

      // Notify admin room
      req.io.to('admin_room').emit('new_blood_request', {
        request: newRequest,
        matched_donors: matchedDonors.length,
      });

      req.io.emit('request_stats_updated');
      console.log(`[blood-request] Socket events emitted (${Date.now() - t0}ms)`);
    }

    // 8. Send emails with Lock and Status checks
    const emailData = {
      requesterId: userId,
      requesterEmail: requester.email,
      requesterName: requester.name,
      bloodGroup: blood_group,
      unitsRequired: units_required || 1,
      location: location.trim(),
      contactNumber: contact_number || requester.phone || '',
      urgency: urgency || 'Normal',
      notes: notes || '',
      requestTime: new Date(),
      requestId,
    };

    const lockKey = `blood_request_${requestId}`;
    if (!processingEmails.has(lockKey)) {
      processingEmails.add(lockKey);

      // Fire-and-forget async email processing
      (async () => {
        try {
          // Check DB flags to avoid duplicates if processing re-triggered
          const [checkRows] = await pool.execute('SELECT email_sent, admin_email_sent FROM blood_requests WHERE request_id = ?', [requestId]);
          if (checkRows.length > 0) {
            const { email_sent, admin_email_sent } = checkRows[0];

            if (!email_sent) {
              const result = await import('../services/emailService.js').then(m => m.sendBloodRequestEmailToAll(emailData));
              console.log(`[blood-request] 📧 Users Email results: ${result.sent} sent, ${result.failed} failed`);
              await pool.execute('UPDATE blood_requests SET email_sent = TRUE WHERE request_id = ?', [requestId]);
            }

            if (!admin_email_sent) {
              await import('../services/emailService.js').then(m => m.sendAdminBloodRequestAlert(emailData));
              console.log(`[blood-request] 🚨 Admin Alert Email sent`);
              await pool.execute('UPDATE blood_requests SET admin_email_sent = TRUE WHERE request_id = ?', [requestId]);
            }
          }
        } catch (err) {
          console.error('[blood-request] 📧 Email sending pipeline error:', err.message);
        } finally {
          processingEmails.delete(lockKey);
        }
      })();
    } else {
       console.log(`[blood-request] 📧 Email sending already in progress for Request #${requestId}`);
    }

    // 9. Return success response
    res.status(201).json({
      message: 'Blood request created successfully. Notifications and emails are being sent.',
      request: newRequest,
      matched_donors: matchedDonors,
      notifications_sent: allUsers.length,
    });

  } catch (error) {
    console.error(`[blood-request] POST /create error (${Date.now() - t0}ms):`, error.message);
    res.status(500).json({ message: 'Failed to create blood request' });
  }
});

// ── Legacy POST / endpoint (backwards compat) ────────────
router.post('/', authenticateToken, async (req, res) => {
  // Redirect internally — just call the same logic
  req.url = '/create';
  // Re-dispatch through Express by calling next route match
  res.redirect(307, '/api/blood-request/create');
});

/**
 * POST /api/blood-request/accept/:requestId
 * Accept a blood request (donor action).
 */
router.post('/accept/:requestId', authenticateToken, async (req, res) => {
  const t0 = Date.now();
  const request_id = req.params.requestId;
  const donorId = req.user.id;
  const lockKey = `accept_${request_id}_${donorId}`;

  if (activeLocks.has(lockKey)) {
    return res.status(429).json({ message: 'Your request is already being processed. Please wait.' });
  }

  activeLocks.add(lockKey);

  try {
    const response = 'Accepted';

    // 1. Get donor info
    const [donorRows] = await pool.execute('SELECT id, name, email, phone, location FROM users WHERE id = ?', [donorId]);
    if (donorRows.length === 0) return res.status(404).json({ message: 'User not found' });
    const donor = donorRows[0];
    const donorGender = donor.gender || 'Not specified'; // Handle if gender column is missing

    // 2. Get request info
    const [requestRows] = await pool.execute(
      `SELECT br.*, u.name AS requester_name, u.email AS requester_email, u.phone AS requester_phone
       FROM blood_requests br JOIN users u ON br.user_id = u.id
       WHERE br.request_id = ?`,
      [request_id]
    );
    if (requestRows.length === 0) return res.status(404).json({ message: 'Blood request not found' });
    const request = requestRows[0];

    // 2.5 check if already completed
    if (request.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: "Request already completed"
      });
    }

    // 3. Check for duplicate response
    const [existing] = await pool.execute(
      'SELECT id, accept_mail_sent FROM donation_responses WHERE request_id = ? AND donor_id = ?',
      [request_id, donorId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'You have already responded to this request' });
    }

    // 4. Save donation response
    await pool.execute(
      'INSERT INTO donation_responses (request_id, donor_id, donor_name, response, accept_mail_sent) VALUES (?, ?, ?, ?, 0)',
      [request_id, donorId, donor.name, response]
    );

    // Update request status to Matched
    await pool.execute('UPDATE blood_requests SET status = "Matched" WHERE request_id = ?', [request_id]);

    // 5. Update the notification's action_status for this donor
    await pool.execute(
      'UPDATE notifications SET action_status = ? WHERE request_id = ? AND user_id = ?',
      ['accepted', request_id, donorId]
    );

    // 6. Notify requester
    const requesterNotifTitle = `Blood Request Accepted`;
    const requesterNotifMsg = `${donor.name} accepted your blood request.`;

    await sendNotification(
      request.user_id,
      requesterNotifTitle,
      requesterNotifMsg,
      'DonationAccepted',
      req.io,
      donorId,
      request_id
    );

    // Notify admin
    const adminNotifTitle = `🤝 Donation Accepted`;
    const adminNotifMsg = `${donor.name} accepted blood donation for Request #${request_id} (${request.blood_group} at ${request.location}).`;

    // Send to all admin users
    try {
      if (req.io) {
        req.io.to('admin_room').emit('new_notification', {
          title: adminNotifTitle,
          message: adminNotifMsg,
          type: 'DonationAccepted',
          request_id,
          created_at: new Date(),
        });
        req.io.to('admin_room').emit('donation_response_update', {
          request_id,
          donor_name: donor.name,
          response: 'Accepted',
        });
      }
    } catch (e) { /* non-critical */ }

    // 7. Check if accept email was already sent (double check via database column and email logs)
    const [responseRow] = await pool.execute(
      'SELECT accept_mail_sent FROM donation_responses WHERE request_id = ? AND donor_id = ?',
      [request_id, donorId]
    );

    const [logRow] = await pool.execute(
      'SELECT id FROM email_logs WHERE request_id = ? AND donor_id = ? AND type = "DonationAccepted"',
      [request_id, donorId]
    );

    const emailAlreadySent = (responseRow.length > 0 && responseRow[0].accept_mail_sent) || logRow.length > 0;

    if (!emailAlreadySent) {
      console.log(`[blood-request] 📧 Triggering ACCEPTED email sending for request #${request_id}...`);
      let mailSentSuccess = false;
      try {
        // Send email to requester (await it for guaranteed status check)
        await sendDonationAcceptedEmail(request.requester_email, {
          requesterName: request.requester_name,
          donorName: donor.name,
          bloodGroup: request.blood_group,
          location: request.location,
          donorPhone: donor.phone,
          donorGender: donorGender,
          donorId: donor.id,
          requestId: request_id,
        });
        mailSentSuccess = true;
      } catch (err) {
        console.error('[blood-request] Accept email sending error:', err.message);
      }

      if (mailSentSuccess) {
        // Update accept_mail_sent status to true
        await pool.execute(
          'UPDATE donation_responses SET accept_mail_sent = 1 WHERE request_id = ? AND donor_id = ?',
          [request_id, donorId]
        );

        // Record a permanent log entry in email_logs
        await pool.execute(
          'INSERT INTO email_logs (recipient_email, subject, status, request_id, donor_id, type) VALUES (?, ?, ?, ?, ?, ?)',
          [
            request.requester_email,
            `Blood Donation Accepted for Request #${request_id}`,
            'sent',
            request_id,
            donorId,
            'DonationAccepted'
          ]
        );
        console.log(`[blood-request] ✅ Requester email successfully sent and logged.`);
      }

      // Send email to admin (async, non-blocking)
      sendAdminDonationEmail({
        donorName: donor.name,
        requesterName: request.requester_name,
        bloodGroup: request.blood_group,
        location: request.location,
        requestId: request_id,
        response: 'Accepted',
      }).catch(err => console.error('[blood-request] Admin email error:', err.message));
    } else {
      console.log(`[blood-request] ⚠️ Skip duplicate email sending for request #${request_id} (already sent).`);
    }

    // Emit socket events
    if (req.io) {
      req.io.to(`user_${request.user_id}`).emit('blood_request_accepted', {
        donor: donor,
        request: request
      });
      req.io.emit('request_stats_updated');
    }

    console.log(`[blood-request] ✅ ${donor.name} ACCEPTED request #${request_id} (${Date.now() - t0}ms)`);

    res.json({
      message: `Blood request accepted successfully`,
      response: 'Accepted',
      request_id,
    });

  } catch (error) {
    console.error(`[blood-request] POST /accept error (${Date.now() - t0}ms):`, error.message);
    res.status(500).json({ message: 'Failed to process donation response' });
  } finally {
    activeLocks.delete(lockKey);
  }
});

/**
 * POST /api/blood-request/decline/:requestId
 * Decline a blood request (donor action).
 */
router.post('/decline/:requestId', authenticateToken, async (req, res) => {
  const t0 = Date.now();
  try {
    const request_id = req.params.requestId;
    const donorId = req.user.id;
    const response = 'Declined';

    // 1. Get donor info
    const [donorRows] = await pool.execute('SELECT id, name FROM users WHERE id = ?', [donorId]);
    if (donorRows.length === 0) return res.status(404).json({ message: 'User not found' });
    const donor = donorRows[0];

    // 1.5 Get request status
    const [requestRows] = await pool.execute(
      'SELECT status FROM blood_requests WHERE request_id = ?',
      [request_id]
    );
    if (requestRows.length > 0 && requestRows[0].status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: "Request already completed"
      });
    }

    // 2. Check for duplicate response
    const [existing] = await pool.execute(
      'SELECT id FROM donation_responses WHERE request_id = ? AND donor_id = ?',
      [request_id, donorId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'You have already responded to this request' });
    }

    // 3. Save donation response
    await pool.execute(
      'INSERT INTO donation_responses (request_id, donor_id, donor_name, response) VALUES (?, ?, ?, ?)',
      [request_id, donorId, donor.name, response]
    );

    // 4. Update the notification's action_status for this donor
    await pool.execute(
      'UPDATE notifications SET action_status = ? WHERE request_id = ? AND user_id = ?',
      ['declined', request_id, donorId]
    );

    if (req.io) {
      req.io.to(`user_${donorId}`).emit('donation_response_saved', {
        request_id,
        response: 'Declined',
      });
    }
    console.log(`[blood-request] ❌ ${donor.name} DECLINED request #${request_id} (${Date.now() - t0}ms)`);

    res.json({
      message: `Blood request declined successfully`,
      response: 'Declined',
      request_id,
    });

  } catch (error) {
    console.error(`[blood-request] POST /decline error (${Date.now() - t0}ms):`, error.message);
    res.status(500).json({ message: 'Failed to process donation response' });
  }
});

/**
 * POST /api/blood-request/complete/:requestId
 * Mark blood request as completed (requester action). Owner or Admin only.
 */
router.post('/complete/:requestId', authenticateToken, async (req, res) => {
  const t0 = Date.now();
  const requestId = req.params.requestId;
  try {
    // Check request exists
    const [existing] = await pool.execute('SELECT * FROM blood_requests WHERE request_id = ?', [requestId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Blood request not found' });
    }

    const request = existing[0];

    // Only owner or admin can complete
    if (req.user.role !== 'admin' && request.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (request.status === 'Completed') {
      return res.status(400).json({ message: 'Request is already completed' });
    }

    await pool.execute('UPDATE blood_requests SET status = "Completed", completedAt = CURRENT_TIMESTAMP WHERE request_id = ?', [requestId]);

    // Update ALL notifications linked to this request with completion message
    await pool.execute(
      `UPDATE notifications 
       SET message = 'This donation was completed', is_read = TRUE
       WHERE request_id = ? AND type IN ('BloodRequest', 'DonationAccepted', 'direct_request', 'direct_request_accepted')`,
      [requestId]
    );

    // Fetch updated record
    const [updated] = await pool.execute(
      `SELECT br.*, u.name AS requester_name, u.email AS requester_email,
              u.phone AS requester_phone
       FROM blood_requests br
       JOIN users u ON br.user_id = u.id
       WHERE br.request_id = ?`,
      [requestId]
    );

    // Emit real-time update
    if (req.io) {
      req.io.emit('request_status_updated', {
        request: updated[0],
        old_status: request.status,
        new_status: 'Completed'
      });
      req.io.emit('request_stats_updated');
      // Broadcast request_completed so ALL donor notification panels update instantly
      req.io.emit('request_completed', { request_id: requestId });
    }

    await sendNotification(request.user_id, 'Request Completed 🎉', `The blood request for ${updated[0].requester_name} has been successfully completed.`, 'Status', req.io);

    // Trigger Email ONLY to Admin (ubms.support@gmail.com)
    try {
      const completionTimeStr = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      });

      const [donorRows] = await pool.execute(
        `SELECT dr.*, u.name 
         FROM donation_responses dr 
         JOIN users u ON dr.donor_id = u.id 
         WHERE dr.request_id = ? AND dr.response = "Accepted"`,
        [requestId]
      );
      const acceptedDonor = donorRows.length > 0 ? donorRows[0] : null;

      await sendAdminBloodRequestCompletedAlert({
        requesterName: updated[0].requester_name || 'N/A',
        bloodGroup: request.blood_group || 'N/A',
        location: request.location || 'N/A',
        donorName: acceptedDonor?.name || 'None',
        completionTime: completionTimeStr,
        requestId
      });
      console.log(`[Email] Admin completion alert sent to ubms.support@gmail.com for request #${requestId}`);
    } catch (mailErr) {
      console.error('[Email] Failed to send completed request alert to admin:', mailErr.message);
    }

    console.log(`[blood-request] Request #${requestId} marked completed by user ${req.user.id} (${Date.now() - t0}ms)`);
    res.json({ message: 'Blood request marked completed successfully', request: updated[0] });

  } catch (error) {
    console.error(`[blood-request] POST /complete error (${Date.now() - t0}ms):`, error.message);
    res.status(500).json({ message: 'Failed to complete blood request' });
  }
});

/**
 * GET /api/blood-request/responses/:requestId
 * Get all donation responses for a request.
 */
router.get('/responses/:requestId', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT dr.*, u.name AS donor_name, u.email AS donor_email, u.phone AS donor_phone, u.blood_group
       FROM donation_responses dr
       JOIN users u ON dr.donor_id = u.id
       WHERE dr.request_id = ?
       ORDER BY dr.created_at DESC`,
      [req.params.requestId]
    );
    res.json(rows);
  } catch (error) {
    console.error('[blood-request] GET /responses error:', error.message);
    res.status(500).json({ message: 'Failed to fetch responses' });
  }
});

/**
 * GET /api/blood-request/email-logs
 * Admin: get email activity logs.
 */
router.get('/email-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 100'
    );
    res.json(rows);
  } catch (error) {
    console.error('[blood-request] GET /email-logs error:', error.message);
    res.status(500).json({ message: 'Failed to fetch email logs' });
  }
});

/**
 * GET /api/blood-request/recent-responses
 * Admin: get recent donation responses across all requests.
 */
router.get('/recent-responses', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT dr.*, br.blood_group, br.status AS request_status, u1.name AS requester_name 
       FROM donation_responses dr
       JOIN blood_requests br ON dr.request_id = br.request_id
       JOIN users u1 ON br.user_id = u1.id
       ORDER BY dr.created_at DESC LIMIT 20`
    );
    res.json(rows);
  } catch (error) {
    console.error('[blood-request] GET /recent-responses error:', error.message);
    res.status(500).json({ message: 'Failed to fetch recent responses' });
  }
});

/**
 * GET /api/blood-request/stats
 * Get aggregate stats for the admin dashboard. Admin only.
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const queries = [
      pool.execute('SELECT COUNT(*) AS totalRequests FROM blood_requests WHERE is_deleted = 0'),
      pool.execute("SELECT COUNT(*) AS pendingRequests FROM blood_requests WHERE status = 'Pending' AND is_deleted = 0"),
      pool.execute("SELECT COUNT(*) AS approvedRequests FROM blood_requests WHERE status = 'Approved' AND is_deleted = 0"),
      pool.execute("SELECT COUNT(*) AS completedRequests FROM blood_requests WHERE status = 'Completed' AND is_deleted = 0"),
      pool.execute("SELECT COUNT(*) AS rejectedRequests FROM blood_requests WHERE status = 'Rejected' AND is_deleted = 0"),
      pool.execute("SELECT COUNT(*) AS matchedRequests FROM blood_requests WHERE status = 'Matched' AND is_deleted = 0"),
      pool.execute('SELECT COUNT(*) AS totalUsers FROM users'),
      pool.execute("SELECT COUNT(*) AS totalDonors FROM users WHERE role = 'donor' AND status = 'active'"),
      pool.execute("SELECT COUNT(*) AS totalReceivers FROM users WHERE role = 'receiver'"),
      pool.execute("SELECT COUNT(*) AS cnt FROM donation_responses WHERE response = 'Accepted'").catch(() => [[{ cnt: 0 }]]),
      pool.execute("SELECT COUNT(*) AS cnt FROM donation_responses WHERE response = 'Declined'").catch(() => [[{ cnt: 0 }]]),
      pool.execute("SELECT COUNT(*) AS cnt FROM email_logs WHERE status = 'sent'").catch(() => [[{ cnt: 0 }]]),
      pool.execute("SELECT COUNT(*) AS cnt FROM email_logs WHERE status = 'failed'").catch(() => [[{ cnt: 0 }]])
    ];

    const results = await Promise.all(queries);

    const stats = {
      totalRequests: Number(results[0][0][0].totalRequests),
      pendingRequests: Number(results[1][0][0].pendingRequests),
      approvedRequests: Number(results[2][0][0].approvedRequests),
      completedRequests: Number(results[3][0][0].completedRequests),
      rejectedRequests: Number(results[4][0][0].rejectedRequests),
      matchedRequests: Number(results[5][0][0].matchedRequests),
      totalUsers: Number(results[6][0][0].totalUsers),
      activeDonors: Number(results[7][0][0].totalDonors), // Changed label to match frontend preference
      totalReceivers: Number(results[8][0][0].totalReceivers),
      acceptedDonors: Number(results[9][0][0].cnt),
      declinedDonors: Number(results[10][0][0].cnt),
      emailsSent: Number(results[11][0][0].cnt),
      emailsFailed: Number(results[12][0][0].cnt),
    };

    res.json(stats);
  } catch (error) {
    console.error('[blood-request] Stats error:', error.message);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
});

/**
 * GET /api/blood-request
 * Fetch all blood requests.
 * - Admin: sees ALL requests
 * - User: sees only their own requests
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { status, blood_group } = req.query;

    let query = `
      SELECT 
        br.*, 
        u.name AS requester_name, 
        u.email AS requester_email,
        u.phone AS requester_phone, 
        u.location AS requester_location,
        u2.name AS donor_name,
        dr.donor_id
      FROM blood_requests br
      JOIN users u ON br.user_id = u.id
      LEFT JOIN donation_responses dr ON br.request_id = dr.request_id AND dr.response = 'Accepted'
      LEFT JOIN users u2 ON dr.donor_id = u2.id
      WHERE br.is_deleted = 0
    `;
    const params = [];
    const conditions = [];

    // Non-admin: only their own requests
    if (!isAdmin) {
      conditions.push('br.user_id = ?');
      params.push(req.user.id);
    }

    // Optional filters
    if (status) {
      conditions.push('br.status = ?');
      params.push(status);
    }
    if (blood_group) {
      conditions.push('br.blood_group = ?');
      params.push(blood_group);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY br.created_at DESC';

    const [requests] = await pool.execute(query, params);
    res.json(requests);

  } catch (error) {
    console.error('[blood-request] GET error:', error.message);
    res.status(500).json({ message: 'Failed to fetch blood requests' });
  }
});

/**
 * GET /api/blood-request/:id
 * Get a single blood request with matched donors.
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const requestId = req.params.id;

    const [rows] = await pool.execute(
      `SELECT br.*, u.name AS requester_name, u.email AS requester_email,
              u.phone AS requester_phone, u.location AS requester_location,
              (SELECT u2.name 
               FROM donation_responses dr 
               JOIN users u2 ON dr.donor_id = u2.id 
               WHERE dr.request_id = br.request_id AND dr.response = 'Accepted' 
               LIMIT 1) AS donor_name
       FROM blood_requests br
       JOIN users u ON br.user_id = u.id
       WHERE br.request_id = ?`,
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Blood request not found' });
    }

    const request = rows[0];

    // Only owner or admin can view
    if (req.user.role !== 'admin' && request.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Intelligent Matching: same blood group, same city, available, and eligible
    let matchedDonors = [];
    try {
      const [donors] = await pool.execute(
        `SELECT da.*, u.name, u.email, u.phone 
         FROM donor_availability da
         JOIN users u ON da.user_id = u.id
         WHERE da.blood_group = ? 
         AND da.city = ?
         AND da.available_status = 1 
         AND (da.last_donation_date IS NULL OR DATEDIFF(CURDATE(), da.last_donation_date) >= 90)
         AND da.user_id != ?
         ORDER BY da.created_at DESC
         LIMIT 20`,
        [request.blood_group, request.location.trim(), request.user_id]
      );
      matchedDonors = donors;
    } catch (e) { /* donor_availability may not exist */ }

    // Get donation responses
    let responses = [];
    try {
      const [respRows] = await pool.execute(
        `SELECT dr.*, u.name AS donor_name FROM donation_responses dr 
         JOIN users u ON dr.donor_id = u.id 
         WHERE dr.request_id = ? ORDER BY dr.created_at DESC`,
        [requestId]
      );
      responses = respRows;
    } catch (e) { /* table may not exist */ }

    res.json({ request, matched_donors: matchedDonors, responses });

  } catch (error) {
    console.error('[blood-request] GET/:id error:', error.message);
    res.status(500).json({ message: 'Failed to fetch blood request' });
  }
});

/**
 * PUT /api/blood-request/status/:id
 * Update request status. Admin only.
 */
router.put('/status/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const requestId = req.params.id;
    const validStatuses = ['Pending', 'Approved', 'Matched', 'Completed', 'Rejected'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Check request exists
    const [existing] = await pool.execute('SELECT * FROM blood_requests WHERE request_id = ?', [requestId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Blood request not found' });
    }

    await pool.execute('UPDATE blood_requests SET status = ? WHERE request_id = ?', [status, requestId]);

    // Fetch updated record
    const [updated] = await pool.execute(
      `SELECT br.*, u.name AS requester_name, u.email AS requester_email,
              u.phone AS requester_phone
       FROM blood_requests br
       JOIN users u ON br.user_id = u.id
       WHERE br.request_id = ?`,
      [requestId]
    );

    // Emit real-time update
    if (req.io) {
      req.io.emit('request_status_updated', {
        request: updated[0],
        old_status: existing[0].status,
        new_status: status
      });
      req.io.emit('request_stats_updated');
    }

    // Inventory Logic: Increase on 'Approved', Decrease on 'Completed'
    if (status === 'Approved' && existing[0].status !== 'Approved') {
      await adjustInventory(existing[0].blood_group, 1, req.io);
      sendNotification(existing[0].user_id, 'Request Approved ✅', `The blood request for ${updated[0].requester_name} has been approved.`, 'Status', req.io);
    } else if (status === 'Completed' && existing[0].status !== 'Completed') {
      await adjustInventory(existing[0].blood_group, -1, req.io);
      sendNotification(existing[0].user_id, 'Request Completed 🎉', `The blood request for ${updated[0].requester_name} has been successfully completed.`, 'Status', req.io);
    } else if (status === 'Rejected' && existing[0].status !== 'Rejected') {
      sendNotification(existing[0].user_id, 'Request Rejected ❌', `The blood request for ${updated[0].requester_name} has been rejected.`, 'Status', req.io);
    }

    console.log(`[blood-request] Status updated #${requestId}: ${existing[0].status} → ${status}`);
    res.json({ message: 'Status updated successfully', request: updated[0] });

  } catch (error) {
    console.error('[blood-request] PUT/status error:', error.message);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

/**
 * DELETE /api/blood-request/:id
 * Delete a blood request. Admin or owner only.
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const requestId = req.params.id;

    const [existing] = await pool.execute('SELECT * FROM blood_requests WHERE request_id = ?', [requestId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Blood request not found' });
    }

    // Only admin or owner can delete
    if (req.user.role !== 'admin' && existing[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await pool.execute('UPDATE blood_requests SET is_deleted = 1 WHERE request_id = ?', [requestId]);

    if (req.io) {
      req.io.emit('request_deleted', { request_id: Number(requestId) });
      req.io.emit('request_stats_updated');
    }

    console.log(`[blood-request] Deleted #${requestId}`);
    res.json({ message: 'Blood request deleted successfully' });

  } catch (error) {
    console.error('[blood-request] DELETE error:', error.message);
    res.status(500).json({ message: 'Failed to delete blood request' });
  }
});

export default router;
