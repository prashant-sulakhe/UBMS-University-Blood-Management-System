import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/donor/register
 * Register or update donor availability profile.
 */
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { blood_group, last_donation_date, city, health_status } = req.body;
    const userId = req.user.id;

    if (!blood_group || !city) {
      return res.status(400).json({ message: 'Blood group and city are required' });
    }

    if (city.includes('@')) {
      return res.status(400).json({ message: 'City/Location cannot be an email address' });
    }

    // Check if profile exists
    const [existing] = await pool.execute('SELECT * FROM donor_availability WHERE user_id = ?', [userId]);

    if (existing.length > 0) {
      // Update
      await pool.execute(
        `UPDATE donor_availability 
         SET blood_group = ?, last_donation_date = ?, city = ?, health_status = ? 
         WHERE user_id = ?`,
        [blood_group, last_donation_date || null, city, health_status || 'Good', userId]
      );
    } else {
      // Create
      await pool.execute(
        `INSERT INTO donor_availability (user_id, blood_group, last_donation_date, city, health_status) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, blood_group, last_donation_date || null, city, health_status || 'Good']
      );
    }

    // Update user role to donor if it wasn't already
    await pool.execute('UPDATE users SET role = "donor", blood_group = ?, location = ? WHERE id = ?', [blood_group, city, userId]);

    if (req.io) {
      req.io.emit('donor_profile_updated', { userId });
    }

    res.json({ message: 'Donor profile saved successfully' });
  } catch (error) {
    console.error('[donor] Register error:', error);
    res.status(500).json({ message: 'Failed to save donor profile' });
  }
});

/**
 * GET /api/donor/profile
 * Get current user's donor profile.
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT da.*, u.name, u.email, u.phone, u.location as user_location, 
              u.availability_status, u.last_active_at, u.gender, u.age, 
              u.address, u.state, u.pincode, u.profile_pic, 
              u.emergency_contact, u.medical_notes 
       FROM donor_availability da 
       JOIN users u ON da.user_id = u.id 
       WHERE da.user_id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Donor profile not found' });
    }

    // Calculate eligibility
    const profile = rows[0];
    const lastDonation = profile.last_donation_date ? new Date(profile.last_donation_date) : null;
    const today = new Date();
    const daysSince = lastDonation ? Math.floor((today - lastDonation) / (1000 * 60 * 60 * 24)) : 999;
    
    profile.is_eligible = daysSince >= 90;
    profile.days_remaining = Math.max(0, 90 - daysSince);

    res.json(profile);
  } catch (error) {
    console.error('[donor] Get profile error:', error);
    res.status(500).json({ message: 'Failed to fetch donor profile' });
  }
});

/**
 * GET /api/donor/available
 * Get all available and eligible donors.
 * Eligibility: available_status = 1 AND (last_donation_date IS NULL OR DATEDIFF >= 90)
 */
router.get('/available', async (req, res) => {
  try {
    const { blood_group, city } = req.query;
    
    let query = `
      SELECT da.*, u.name, u.phone, u.email, u.availability_status, u.last_active_at, u.profile_pic 
      FROM donor_availability da 
      JOIN users u ON da.user_id = u.id 
      WHERE u.availability_status = 'ON' 
      AND (da.last_donation_date IS NULL OR DATEDIFF(CURDATE(), da.last_donation_date) >= 90)
    `;
    const params = [];

    if (blood_group) {
      query += ' AND da.blood_group = ?';
      params.push(blood_group);
    }
    if (city) {
      query += ' AND da.city LIKE ?';
      params.push(`%${city}%`);
    }

    const [donors] = await pool.execute(query, params);
    res.json(donors);
  } catch (error) {
    console.error('[donor] Get available error:', error);
    res.status(500).json({ message: 'Failed to fetch available donors' });
  }
});

/**
 * PUT /api/donor/status
 * Toggle availability status.
 */
router.put('/status', authenticateToken, async (req, res) => {
  try {
    const { available_status } = req.body;
    const userId = req.user.id;

    await pool.execute(
      'UPDATE donor_availability SET available_status = ? WHERE user_id = ?',
      [available_status ? 1 : 0, userId]
    );

    if (req.io) {
      req.io.emit('donor_status_changed', { userId, available_status });
    }

    res.json({ message: 'Availability status updated' });
  } catch (error) {
    console.error('[donor] Update status error:', error);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

/**
 * GET /api/donor/admin/all
 * Admin view of all donors.
 */
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [donors] = await pool.execute(`
      SELECT da.*, u.name, u.email, u.phone, u.availability_status, u.last_active_at, u.created_at as user_since
      FROM donor_availability da
      JOIN users u ON da.user_id = u.id
      ORDER BY u.last_active_at DESC
    `);
    res.json(donors);
  } catch (error) {
    console.error('[donor] Admin fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch donors' });
  }
});

/**
 * DELETE /api/donor/admin/:id
 * Block/Delete donor profile. Admin only.
 */
router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const donorId = req.params.id;
    await pool.execute('DELETE FROM donor_availability WHERE donor_id = ?', [donorId]);
    
    if (req.io) {
      req.io.emit('donor_removed', { donorId });
    }
    
    res.json({ message: 'Donor profile removed successfully' });
  } catch (error) {
    console.error('[donor] Admin delete error:', error);
    res.status(500).json({ message: 'Failed to remove donor' });
  }
});

export default router;
