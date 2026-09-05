import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import nodemailer from 'nodemailer';
import { transporter as gmailTransporter, isConfigured, EMAIL_USER } from './config/mailConfig.js';
import bloodRequestRoutes from './routes/bloodRequests.js';
import donorRoutes from './routes/donors.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import donationRoutes from './routes/donations.js';
import directRequestRoutes from './routes/directRequests.js';
import { sendAdminBloodRequestCompletedAlert } from './services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'ubms_super_secret_jwt_key_2024';

// ── HTTP + Socket.IO Server ──────────────────────────
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Attach io instance to every request so routes can emit events
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Serve static files from Vite build output
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// ── Socket.IO Connection Handling ────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`   User ${userId} joined room user_${userId}`);
  });

  socket.on('join_admin', () => {
    socket.join('admin_room');
    console.log(`   Admin joined admin_room`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// ── Health Check ─────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    res.json({ status: 'ok', message: 'Backend and MySQL connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// ── Blood Request Routes ─────────────────────────────
app.use('/api/blood-request', bloodRequestRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/donation', donationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/direct-request', directRequestRoutes);

// ── Mark Request as Completed Endpoint ───────────────
app.post('/api/requests/mark-completed', async (req, res) => {
  const t0 = Date.now();
  try {
    const { requestId } = req.body;
    if (!requestId) {
      return res.status(400).json({ success: false, message: 'requestId is required' });
    }

    // 1. Find the request using requestId
    const [requests] = await pool.execute('SELECT * FROM blood_requests WHERE request_id = ?', [requestId]);
    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'Blood request not found' });
    }
    const request = requests[0];

    // 2. Update status and completedAt, 3. Save to database
    await pool.execute(
      'UPDATE blood_requests SET status = "Completed", completedAt = CURRENT_TIMESTAMP WHERE request_id = ?',
      [requestId]
    );

    // Update ALL notifications linked to this request with completion message
    await pool.execute(
      `UPDATE notifications 
       SET message = 'This donation was completed', is_read = TRUE
       WHERE request_id = ? AND type IN ('BloodRequest', 'DonationAccepted', 'direct_request', 'direct_request_accepted')`,
      [requestId]
    );

    // 4. Identify requester (user who created request)
    const [requesterRows] = await pool.execute('SELECT * FROM users WHERE id = ?', [request.user_id]);
    const requester = requesterRows[0];

    // Identify accepted donor
    const [donorRows] = await pool.execute(
      `SELECT dr.*, u.name, u.email, u.phone 
       FROM donation_responses dr 
       JOIN users u ON dr.donor_id = u.id 
       WHERE dr.request_id = ? AND dr.response = "Accepted"`,
      [requestId]
    );
    const acceptedDonor = donorRows.length > 0 ? donorRows[0] : null;

    // Identify all notified donors
    const [notifiedDonors] = await pool.execute(
      `SELECT DISTINCT u.* 
       FROM notifications n 
       JOIN users u ON n.user_id = u.id 
       WHERE n.request_id = ? AND n.type = "BloodRequest"`,
      [requestId]
    );

    // 5. Trigger Email ONLY to Admin (ubms.support@gmail.com)
    try {
      const completionTimeStr = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      });

      await sendAdminBloodRequestCompletedAlert({
        requesterName: requester?.name || 'N/A',
        bloodGroup: request?.blood_group || 'N/A',
        location: request?.location || 'N/A',
        donorName: acceptedDonor?.name || 'None',
        completionTime: completionTimeStr,
        requestId
      });
      console.log(`[Email] Admin completion alert sent to ubms.support@gmail.com for request #${requestId}`);
    } catch (mailErr) {
      console.error('[Email] Failed to send completed request alert to admin:', mailErr.message);
    }

    // Trigger Notifications to all users
    const [allUsers] = await pool.execute('SELECT id FROM users');
    const notifTitle = 'Request Completed 🎉';
    const notifMessage = `The blood request for ${requester?.name || 'User'} has been successfully completed.`;

    for (const u of allUsers) {
      try {
        await pool.execute(
          'INSERT INTO notifications (sender_id, user_id, request_id, title, message, type, action_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [request.user_id, u.id, requestId, notifTitle, notifMessage, 'Status', 'none']
        );
        if (req.io) {
          req.io.to(`user_${u.id}`).emit('new_notification', {
            title: notifTitle,
            message: notifMessage,
            type: 'Status',
            request_id: requestId,
            action_status: 'none',
            created_at: new Date(),
          });
        }
      } catch (e) {
        console.error(`[Notification] Failed to notify user ${u.id}:`, e.message);
      }
    }

    // Real-Time Socket Updates
    if (req.io) {
      req.io.emit('request_status_updated', {
        request: { ...request, status: 'Completed', completedAt: new Date() },
        old_status: request.status,
        new_status: 'Completed'
      });
      req.io.emit('request_stats_updated');
      // Broadcast request_completed so ALL donor notification panels update instantly
      req.io.emit('request_completed', { request_id: requestId });
    }

    console.log(`[mark-completed] Request #${requestId} processed successfully (${Date.now() - t0}ms)`);
    res.json({
      success: true,
      message: "Request marked as completed"
    });

  } catch (error) {
    console.error('[mark-completed] error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ── Contact Us / Support Endpoint ────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const subject = `📬 New Contact Message from ${name}`;
    const text = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 10px;">New Support Inquiry</h2>
        <p><strong>From:</strong> ${name} (<a href="mailto:${email}">${email}</a>)</p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
        <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">This message was sent from the UBMS Contact Form.</p>
      </div>
    `;

    // Forward the user's message to the support email
    await sendEmail('ubms.support@gmail.com', subject, text, html);

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact endpoint error:', error);
    res.status(500).json({ message: 'Failed to send message. Please try again later.' });
  }
});

// ── Real-Time Availability Routes ────────────────────
import { authenticateToken } from './middleware/auth.js';

app.put('/api/users/update-profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      name, email, phone, blood_group, location, 
      gender, age, address, state, pincode, 
      profile_pic, emergency_contact, medical_notes 
    } = req.body;

    // 1. Validation
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    if (location && location.includes('@')) {
      return res.status(400).json({ message: 'Location/Address cannot be an email address' });
    }

    // 2. Check email conflict
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already in use by another account' });
    }

    // 3. Update User (with defaults for optional fields)
    await pool.execute(
      `UPDATE users SET 
        name = ?, email = ?, phone = ?, blood_group = ?, location = ?,
        gender = ?, age = ?, address = ?, state = ?, pincode = ?,
        profile_pic = ?, emergency_contact = ?, medical_notes = ?,
        last_active_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        name || null, 
        email || null, 
        phone || null, 
        blood_group || null, 
        location || null,
        gender || null, 
        age || null, 
        address || null, 
        state || null, 
        pincode || null,
        profile_pic || null, 
        emergency_contact || null, 
        medical_notes || null,
        userId
      ]
    );

    // 4. Fetch updated user
    const [updated] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
    const { password: _, ...userData } = updated[0];

    // 5. Emit Real-time update
    if (req.io) {
      req.io.emit('profile_updated', { userId, userData });
    }

    res.json({ message: 'Profile updated successfully', user: userData });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: `Error updating profile: ${err.message}` });
  }
});

app.get('/api/users/profile/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const [users] = await pool.execute(
      'SELECT id as user_id, name, email, blood_group, gender, location, phone, availability_status, profile_pic, medical_notes as bio, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    let profile = { ...users[0] };
    
    // Default values if missing
    if (!profile.profile_pic) profile.profile_pic = '';
    if (!profile.bio) profile.bio = '';

    // Check if donor availability data exists
    try {
      const [donorData] = await pool.execute(
        'SELECT last_donation_date, health_status, city FROM donor_availability WHERE user_id = ?',
        [userId]
      );
      if (donorData.length > 0) {
        profile = { ...profile, ...donorData[0] };
      }
    } catch (e) { /* ignores if not a donor or table missing */ }

    // Count accepted donations
    try {
      const [[{ count }]] = await pool.execute(
        "SELECT COUNT(*) AS count FROM donation_responses WHERE donor_id = ? AND response = 'Accepted'",
        [userId]
      );
      profile.donation_count = count;
    } catch (e) { 
      profile.donation_count = 0;
    }

    res.json(profile);
  } catch (err) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ message: 'Error fetching profile data' });
  }
});

app.get('/api/users/:id/availability', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, availability_status, last_active_at, updated_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching availability' });
  }
});

app.put('/api/users/:id/availability', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { availability_status } = req.body;

    if (parseInt(id) !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to update this user' });
    }

    if (!['ON', 'OFF'].includes(availability_status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // 1. Update Users table (Source of truth)
    await pool.execute(
      'UPDATE users SET availability_status = ?, last_active_at = CURRENT_TIMESTAMP WHERE id = ?',
      [availability_status, id]
    );

    // 2. Sync with donor_availability table if exists
    await pool.execute(
      'UPDATE donor_availability SET available_status = ? WHERE user_id = ?',
      [availability_status === 'ON' ? 1 : 0, id]
    );

    const [updated] = await pool.execute(
      'SELECT id, availability_status, last_active_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    // 📡 Emit Global Real-Time Event
    if (req.io) {
      req.io.emit('availability_updated', {
        userId: id,
        availability_status,
        updated_at: updated[0].updated_at
      });
    }

    res.json(updated[0]);
  } catch (err) {
    console.error('Update availability error:', err);
    res.status(500).json({ message: 'Error updating availability' });
  }
});

// ── Registration ─────────────────────────────────────
app.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, blood_group, location, role } = req.body;

    // 1. Get user data & 2. Validate input
    if (!name || !email || !password || !blood_group || !location || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (location.includes('@')) {
      return res.status(400).json({ message: 'Location/Address cannot be an email address' });
    }

    // 3. Check if email already exists
    const [existingUsers] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    
    // 4. If exists -> return "User already exists"
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 5. Hash password using bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 6. Insert into MySQL ensuring permanent storage
    const [result] = await pool.execute(
      `INSERT INTO users (name, email, phone, password, blood_group, location, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone || '', hashedPassword, blood_group, location, role]
    );

    const userId = result.insertId;

    // 6b. If role is donor, also initialize donor_availability
    if (role === 'donor') {
      await pool.execute(
        `INSERT INTO donor_availability (user_id, blood_group, city, health_status, available_status) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, blood_group, location, 'Good', 1] // Default to available on registration
      );
    }

    // 7. Return success message
    return res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ── User Login ───────────────────────────────────────
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Get email and password
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // 2. Query database: SELECT * FROM users WHERE email = ?
    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);

    // 3. If user not found -> return "Invalid email"
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email' });
    }

    const user = users[0];

    // 4. Compare password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    // 6. If wrong -> return "Invalid password"
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // 5. If correct: Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last active
    await pool.execute('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    // Return token + user details (omitting password)
    const { password: _, ...userDetails } = user;
    return res.json({ token, user: userDetails });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ── Admin Login ──────────────────────────────────────
app.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const [admins] = await pool.execute('SELECT * FROM admin WHERE email = ?', [email]);

    if (admins.length === 0) {
      return res.status(401).json({ message: 'Invalid Admin Credentials' });
    }

    const admin = admins[0];
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid Admin Credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, role: 'admin', email: admin.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: 'admin'
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ 
      message: 'Internal server error during admin login',
      error: error.message,
      stack: error.stack
    });
  }
});

// Helper: send email using Gmail (real) or Ethereal (fake/dev fallback)
async function sendEmail(to, subject, text, html) {
  let xporter;

  if (isConfigured) {
    // Use the pre-configured, verified Gmail transporter from mailConfig.js
    xporter = gmailTransporter;
    console.log(`[Email] Sending via real Gmail (${EMAIL_USER}) to ${to}`);
  } else {
    // Fallback: create a one-time Ethereal test account
    console.warn('[Email] ⚠️  No real credentials. Using Ethereal test email.');
    console.warn('[Email] Email will NOT arrive in any real inbox.');
    console.warn('[Email] Set EMAIL_USER and EMAIL_PASS in .env to send real emails.');
    const testAccount = await nodemailer.createTestAccount();
    xporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }

  const from = isConfigured ? `"UBMS Support" <${EMAIL_USER}>` : '"UBMS Support" <support@ubms.local>';

  try {
    const info = await xporter.sendMail({ from, to, subject, text, html });
    console.log(`[Email] ✅ Email sent! Message ID: ${info.messageId}`);
    if (!isConfigured) {
      // Print Ethereal preview URL to terminal for developer to view
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`\n============================================================`);
      console.log(`📧 DEV MODE — View fake email here: ${previewUrl}`);
      console.log(`============================================================\n`);
    }
    return info;
  } catch (error) {
    console.error('[Email] ❌ sendMail failed:', error.message);
    throw error;
  }
}

// ── Forgot Password ──────────────────────────────────
app.post('/forgot-password', async (req, res) => {
  const t0 = Date.now();
  try {
    const { email } = req.body;
    console.log(`[forgot-password] Request for: ${email}`);
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (users.length === 0) {
      console.log(`[forgot-password] Email not found: ${email} (${Date.now() - t0}ms)`);
      return res.status(404).json({ message: 'Email not found. Please enter a registered email.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    console.log(`[forgot-password] OTP generated (${Date.now() - t0}ms)`);

    // Clear old OTP and insert new one in parallel
    await Promise.all([
      pool.execute('DELETE FROM password_resets WHERE email = ?', [email]),
    ]);
    await pool.execute(
      'INSERT INTO password_resets (email, otp, expires_at) VALUES (?, ?, ?)',
      [email, otp, expiresAt]
    );
    console.log(`[forgot-password] OTP saved to DB (${Date.now() - t0}ms)`);

    // Send email
    const subject = 'UBMS Password Reset OTP';
    const text = `Hello,\nYour OTP for password reset is: ${otp}\nThis OTP is valid for 2 minutes only.\nIf you did not request this, please ignore this email.\n\n— UBMS Team`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:8px">
        <h2 style="color:#d32f2f;margin-top:0">🔐 Password Reset OTP</h2>
        <p style="color:#333">Hello,</p>
        <p style="color:#333">Your one-time password (OTP) for resetting your UBMS account password is:</p>
        <div style="font-size:2.5rem;font-weight:bold;letter-spacing:0.5rem;text-align:center;padding:16px;background:#f5f5f5;border-radius:8px;color:#d32f2f;margin:24px 0">${otp}</div>
        <p style="color:#666;font-size:0.9rem">⏱ This OTP expires in <strong>2 minutes</strong>.</p>
        <p style="color:#666;font-size:0.9rem">If you did not request a password reset, please ignore this email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#999;font-size:0.8rem;margin:0">— University Blood Management System</p>
      </div>
    `;

    await sendEmail(email, subject, text, html);
    console.log(`[forgot-password] ✅ OTP email sent (${Date.now() - t0}ms total)`);

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error(`[forgot-password] ❌ Failed (${Date.now() - t0}ms):`, error.message);
    res.status(500).json({ message: 'Unable to send OTP email. Please check your email configuration.' });
  }
});

// ── Verify OTP ───────────────────────────────────────
app.post('/verify-otp', async (req, res) => {
  const t0 = Date.now();
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    // Only fetch the two columns we need — faster on TiDB Cloud
    const [resets] = await pool.execute(
      'SELECT otp, expires_at FROM password_resets WHERE email = ? ORDER BY created_at DESC LIMIT 1',
      [email]
    );

    if (resets.length === 0 || resets[0].otp !== otp) {
      console.log(`[verify-otp] Invalid OTP attempt for ${email} (${Date.now() - t0}ms)`);
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > new Date(resets[0].expires_at)) {
      console.log(`[verify-otp] OTP expired for ${email} (${Date.now() - t0}ms)`);
      return res.status(400).json({ message: 'OTP expired. Please request again.' });
    }

    console.log(`[verify-otp] ✅ Success for ${email} (${Date.now() - t0}ms)`);
    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error(`[verify-otp] Error (${Date.now() - t0}ms):`, error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ── Reset Password ───────────────────────────────────
app.post('/reset-password', async (req, res) => {
  const t0 = Date.now();
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    // Lean OTP check — only fetch what we need
    const [resets] = await pool.execute(
      'SELECT otp, expires_at FROM password_resets WHERE email = ? ORDER BY created_at DESC LIMIT 1',
      [email]
    );
    if (resets.length === 0 || resets[0].otp !== otp || new Date() > new Date(resets[0].expires_at)) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    console.log(`[reset-password] OTP verified (${Date.now() - t0}ms)`);

    // bcrypt at 10 rounds (~100ms) — optimal balance of speed vs security
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log(`[reset-password] Password hashed (${Date.now() - t0}ms)`);

    // Run UPDATE and DELETE in parallel — saves one full TiDB round-trip
    await Promise.all([
      pool.execute('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]),
      pool.execute('DELETE FROM password_resets WHERE email = ?', [email]),
    ]);

    console.log(`[reset-password] ✅ Done for ${email} (${Date.now() - t0}ms total)`);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(`[reset-password] Error (${Date.now() - t0}ms):`, error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ── SPA Fallback Route ───────────────────────────────
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// ── Start Server ─────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.IO ready`);
});
