import express from 'express';
import pool from '../db.js';
import webpush from 'web-push';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ── Web Push Configuration ──────────────────────────
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:ubms.support@gmail.com',
  publicVapidKey,
  privateVapidKey
);

/**
 * POST /api/notifications/subscribe
 * Register a client for Web Push.
 */
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const subscription = req.body;
    const userId = req.user.id;

    // Check if subscription already exists
    const [existing] = await pool.execute(
      'SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      [userId, subscription.endpoint]
    );

    if (existing.length === 0) {
      await pool.execute(
        'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)',
        [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
      );
    }

    res.status(201).json({ message: 'Subscribed to push notifications' });
  } catch (error) {
    console.error('[notifications] Subscription error:', error);
    res.status(500).json({ message: 'Failed to subscribe' });
  }
});

/**
 * GET /api/notifications
 * Fetch user notifications with sender info and action status.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT n.*, u.name AS sender_name,
              COALESCE(br.status, dr.status) AS request_status
       FROM notifications n 
       LEFT JOIN users u ON n.sender_id = u.id 
       LEFT JOIN blood_requests br ON n.request_id = br.request_id AND (n.type = 'DonationAccepted' OR n.type = 'BloodRequest')
       LEFT JOIN direct_requests dr ON n.request_id = dr.id AND (n.type = 'direct_request_accepted' OR n.type = 'direct_request')
       WHERE n.user_id = ? 
       ORDER BY n.created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('[notifications] GET error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for the badge.
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const [[{ count }]] = await pool.execute(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ count: Number(count) });
  } catch (error) {
    console.error('[notifications] Unread count error:', error);
    res.status(500).json({ message: 'Failed to fetch count' });
  }
});

/**
 * PUT /api/notifications/read/:id
 * Mark notification as read.
 */
router.put('/read/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
      [id, req.user.id]
    );
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('[notifications] Mark read error:', error);
    res.status(500).json({ message: 'Failed to update notification' });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read.
 */
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ message: 'All marked as read' });
  } catch (error) {
    console.error('[notifications] Read all error:', error);
    res.status(500).json({ message: 'Failed to update notifications' });
  }
});

/**
 * Internal Helper: sendNotification
 * Triggers both DB, Socket, and Web Push.
 * Enhanced with sender_id and request_id tracking.
 */
export async function sendNotification(userId, title, message, type, io, senderId = null, requestId = null) {
  try {
    // 1. Save to DB with sender and request tracking
    await pool.execute(
      'INSERT INTO notifications (user_id, sender_id, request_id, title, message, type) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, senderId, requestId, title, message, type]
    );

    // 2. Emit via Socket.IO for instant UI update
    if (io) {
      io.to(`user_${userId}`).emit('new_notification', {
        title,
        message,
        type,
        sender_id: senderId,
        request_id: requestId,
        created_at: new Date(),
      });
    }

    // 3. Send Web Push
    try {
      const [subs] = await pool.execute('SELECT * FROM push_subscriptions WHERE user_id = ?', [userId]);
      
      const payload = JSON.stringify({ title, message, type });
      
      const pushPromises = subs.map(sub => {
        const pushConfig = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };
        return webpush.sendNotification(pushConfig, payload).catch(err => {
          if (err.statusCode === 404 || err.statusCode === 410) {
            // Subscription expired/invalid, remove it
            return pool.execute('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
          }
          console.error('[notifications] Push error:', err.message);
        });
      });

      await Promise.all(pushPromises);
    } catch (pushErr) {
      // Web push is non-critical, don't break the flow
      console.warn('[notifications] Web push skipped:', pushErr.message);
    }
  } catch (error) {
    console.error('[notifications] Helper error:', error);
  }
}

export default router;
