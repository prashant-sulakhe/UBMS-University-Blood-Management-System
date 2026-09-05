import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/donation/history
 * Fetch donation history for the current user.
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM donation_history WHERE donor_user_id = ? ORDER BY donation_date DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('[donations] GET history error:', error);
    res.status(500).json({ message: 'Failed to fetch donation history' });
  }
});

/**
 * POST /api/donation/record
 * Record a new donation (usually by admin or automated).
 */
router.post('/record', authenticateToken, async (req, res) => {
  try {
    const { blood_group, units_donated, donation_date, hospital_name, status } = req.body;
    const userId = req.user.id;

    await pool.execute(
      `INSERT INTO donation_history (donor_user_id, blood_group, units_donated, donation_date, hospital_name, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, blood_group, units_donated || 1, donation_date || new Date(), hospital_name || 'UBMS Center', status || 'Pending']
    );

    if (req.io) {
      req.io.emit('donation_history_updated', { userId });
    }

    res.status(201).json({ message: 'Donation recorded successfully' });
  } catch (error) {
    console.error('[donations] POST record error:', error);
    res.status(500).json({ message: 'Failed to record donation' });
  }
});

/**
 * GET /api/donation/admin/all
 * Admin view of all donations.
 */
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT dh.*, u.name as donor_name, u.email as donor_email
      FROM donation_history dh
      JOIN users u ON dh.donor_user_id = u.id
      ORDER BY dh.donation_date DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('[donations] Admin GET error:', error);
    res.status(500).json({ message: 'Failed to fetch all donations' });
  }
});

export default router;
