import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/admin/users
 * Fetch all registered users. Admin only.
 */
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, role, phone, location, blood_group, created_at, status FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error) {
    console.error('[admin] Fetch users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

/**
 * PUT /api/admin/users/status/:id
 * Toggle user status (Active/Blocked).
 */
router.put('/users/status/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body; // 'active' or 'blocked'
    const userId = req.params.id;

    if (!['active', 'blocked'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await pool.execute('UPDATE users SET status = ? WHERE id = ?', [status, userId]);

    if (req.io) {
      req.io.emit('user_status_updated', { userId, status });
    }

    res.json({ message: `User ${status} successfully` });
  } catch (error) {
    console.error('[admin] Update user status error:', error);
    res.status(500).json({ message: 'Failed to update user status' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Permanently delete a user profile and all related data. Admin only.
 */
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.params.id;
    const adminId = req.user.id;
    const adminName = req.user.name || 'Admin';

    await connection.beginTransaction();

    // 1. Find user before delete
    const [userRows] = await connection.execute('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const targetUser = userRows[0];

    // 2. Prevent deleting self or other admins
    if (targetUser.role === 'admin' || Number(userId) === Number(adminId)) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Cannot delete admin accounts' });
    }

    /* 3. Delete Related Data to avoid Foreign Key errors or orphan records */
    
    // a. donation_responses (linked via donor_id)
    await connection.execute('DELETE FROM donation_responses WHERE donor_id = ?', [userId]);
    
    // b. notifications (linked via user_id OR sender_id)
    await connection.execute('DELETE FROM notifications WHERE user_id = ? OR sender_id = ?', [userId, userId]);
    
    // c. donor_availability (linked via user_id)
    await connection.execute('DELETE FROM donor_availability WHERE user_id = ?', [userId]);
    
    // d. direct_requests (linked via requester_id OR receiver_id)
    await connection.execute('DELETE FROM direct_requests WHERE requester_id = ? OR receiver_id = ?', [userId, userId]);
    
    // e. blood_requests (manually cleaning to be safe)
    await connection.execute('DELETE FROM blood_requests WHERE user_id = ?', [userId]);
    
    // f. push_subscriptions and password_resets
    await connection.execute('DELETE FROM push_subscriptions WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM password_resets WHERE email = ?', [targetUser.email]);

    // 4. Finally delete the user
    await connection.execute('DELETE FROM users WHERE id = ?', [userId]);

    // 5. Log this administrative activity
    await connection.execute(
      `INSERT INTO admin_logs (admin_id, admin_name, action, target_id, target_name, target_email, details) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminId, adminName, 'DELETE_USER', userId, targetUser.name, targetUser.email, `Permanently deleted user: ${targetUser.name}`]
    );

    await connection.commit();

    // 6. Real-time updates
    if (req.io) {
      req.io.emit('user_deleted', { userId });
      req.io.emit('request_stats_updated');
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('[admin] Permanent delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/admin/broadcast-requests
 * Fetch all broadcast blood requests for admin, including completed ones.
 */
router.get('/broadcast-requests', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [requests] = await pool.execute(`
      SELECT br.*, u.name AS requester_name, u.email AS requester_email,
             u.phone AS requester_phone, u.location AS requester_location,
             (SELECT u2.name 
              FROM donation_responses dr 
              JOIN users u2 ON dr.donor_id = u2.id 
              WHERE dr.request_id = br.request_id AND dr.response = 'Accepted' 
              LIMIT 1) AS donor_name,
             (SELECT dr2.donor_id 
              FROM donation_responses dr2 
              WHERE dr2.request_id = br.request_id AND dr2.response = 'Accepted' 
              LIMIT 1) AS donor_id
      FROM blood_requests br
      JOIN users u ON br.user_id = u.id
      WHERE br.is_deleted = 0
      ORDER BY br.created_at DESC
    `);
    res.json(requests);
  } catch (error) {
    console.error('[admin] Fetch broadcast requests error:', error);
    res.status(500).json({ message: 'Failed to fetch broadcast requests' });
  }
});

/**
 * GET /api/admin/users/:userId
 * Fetch full user profile details for admin view, including stats.
 */
router.get('/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;

    // 1. Fetch core user data
    const [users] = await pool.execute(`
      SELECT id, name, email, phone, blood_group, location, role,
             gender, age, address, state, pincode, profile_pic,
             emergency_contact, medical_notes, availability_status,
             status, last_active_at, created_at
      FROM users WHERE id = ?
    `, [userId]);

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const user = users[0];

    // 2. Fetch Donor specific data if any
    const [donorData] = await pool.execute(
      'SELECT last_donation_date, health_status, city FROM donor_availability WHERE user_id = ?',
      [userId]
    );

    // 3. Fetch Statistics
    const [[{ donation_count }]] = await pool.execute(
      "SELECT COUNT(*) AS donation_count FROM donation_responses WHERE donor_id = ? AND response = 'Accepted'",
      [userId]
    );

    const [[{ request_count }]] = await pool.execute(
      "SELECT COUNT(*) AS request_count FROM blood_requests WHERE user_id = ?",
      [userId]
    );

    res.json({
      success: true,
      user: {
        ...user,
        donor_info: donorData[0] || null,
        stats: {
          donation_count,
          request_count
        }
      }
    });

  } catch (error) {
    console.error('[admin] Fetch user profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user profile' });
  }
});

/**
 * DELETE /api/admin/requests/:requestId
 * Permanently delete a blood request and all related data. Admin only.
 */
router.delete('/requests/:requestId', authenticateToken, requireAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const requestId = req.params.requestId;
    const adminId = req.user.id;
    const adminName = req.user.name || 'Admin';

    await connection.beginTransaction();

    // 1. Find request before delete
    const [requestRows] = await connection.execute(
      'SELECT request_id, user_id, blood_group FROM blood_requests WHERE request_id = ?', 
      [requestId]
    );
    
    if (requestRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    const targetRequest = requestRows[0];

    /* 2. Delete Related Data */
    
    // a. donation_responses
    await connection.execute('DELETE FROM donation_responses WHERE request_id = ?', [requestId]);
    
    // b. notifications (linked via request_id)
    await connection.execute('DELETE FROM notifications WHERE request_id = ?', [requestId]);
    
    // c. email_logs (if table exists)
    try {
      await connection.execute('DELETE FROM email_logs WHERE request_id = ?', [requestId]);
    } catch (e) { /* ignore if table missing */ }

    // 3. Finally delete the request itself
    await connection.execute('DELETE FROM blood_requests WHERE request_id = ?', [requestId]);

    // 4. Log the administrative activity
    await connection.execute(
      `INSERT INTO admin_logs (admin_id, admin_name, action, target_id, target_name, details) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [adminId, adminName, 'DELETE_REQUEST', requestId, `Request #${requestId}`, `Permanently deleted blood request #${requestId} (${targetRequest.blood_group})`]
    );

    await connection.commit();

    // 5. Real-time updates
    if (req.io) {
      req.io.emit('request_deleted', { request_id: Number(requestId) });
      req.io.emit('request_stats_updated');
    }

    res.json({ success: true, message: 'Request deleted successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('[admin] Delete request error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete request' });
  } finally {
    if (connection) connection.release();
  }
});

export default router;
