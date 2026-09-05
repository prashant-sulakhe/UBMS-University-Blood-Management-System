import mysql from 'mysql2/promise';
import 'dotenv/config';

/**
 * TiDB Cloud Connection Pool
 * Uses SSL for secure cloud connection (required by TiDB).
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'test',
  port: parseInt(process.env.DB_PORT) || 4000,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 20,       // Allow more concurrent connections
  queueLimit: 0,
  enableKeepAlive: true,     // Keep connections alive to avoid cold-start latency
  keepAliveInitialDelay: 0,
  timezone: 'Z',             // Force UTC for consistency with cloud databases
});

/**
 * Initialize database schema on startup.
 * Creates the database and all required tables on TiDB Cloud.
 */
async function initDB() {
  let connection;
  try {
    // 1. First, connect to 'test' or default to check/create the 'ubms' database
    const tempPool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT) || 4000,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    });

    connection = await tempPool.getConnection();
    console.log('🔗 Connected to TiDB Cloud (establishing database...)');
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'ubms'}`);
    await connection.query(`USE ${process.env.DB_NAME || 'ubms'}`);

    // 2. Create tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20) DEFAULT '',
        blood_group VARCHAR(10) NOT NULL,
        location VARCHAR(255) NOT NULL,
        role ENUM('donor', 'receiver') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS blood_requests (
        request_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        blood_group VARCHAR(10) NOT NULL,
        units_required INT NOT NULL DEFAULT 1,
        location VARCHAR(255) NOT NULL,
        contact_number VARCHAR(20) DEFAULT '',
        urgency ENUM('Normal', 'Urgent', 'Critical') DEFAULT 'Normal',
        notes TEXT DEFAULT NULL,
        status ENUM('Pending', 'Approved', 'Matched', 'Completed', 'Rejected') DEFAULT 'Pending',
        is_deleted TINYINT(1) DEFAULT 0,
        completedAt TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email)
      )
    `);

    // ── New tables for Notification System ──────────────────

    // Notifications table with sender/receiver and action tracking
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT DEFAULT NULL,
        user_id INT NOT NULL,
        request_id INT DEFAULT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'General',
        is_read BOOLEAN DEFAULT FALSE,
        action_status ENUM('none', 'accepted', 'declined') DEFAULT 'none',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_request (request_id)
      )
    `);

    // Donation responses table for accept/decline tracking
    await connection.query(`
      CREATE TABLE IF NOT EXISTS donation_responses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        donor_id INT NOT NULL,
        donor_name VARCHAR(255) DEFAULT '',
        response ENUM('Accepted', 'Declined') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_request (request_id),
        INDEX idx_donor (donor_id),
        UNIQUE KEY unique_response (request_id, donor_id)
      )
    `);

    // Email activity log for admin monitoring
    await connection.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient_email VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        status ENUM('sent', 'failed', 'queued') DEFAULT 'queued',
        error_message TEXT DEFAULT NULL,
        request_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_request (request_id)
      )
    `);

    // Push subscriptions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
      )
    `);

    // Direct Requests table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS direct_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        requester_id INT NOT NULL,
        receiver_id INT NOT NULL,
        blood_group VARCHAR(10) NOT NULL,
        units INT DEFAULT 1,
        hospital VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        contact VARCHAR(20) NOT NULL,
        message TEXT,
        status ENUM('Pending', 'Accepted', 'Declined', 'Completed') DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_requester (requester_id),
        INDEX idx_receiver (receiver_id)
      )
    `);

    // Admin activity logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT,
        admin_name VARCHAR(255),
        action VARCHAR(255),
        target_id INT,
        target_name VARCHAR(255),
        target_email VARCHAR(255),
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ TiDB Cloud Database & Schema Ready!');

    // 3. Safely add missing columns to blood_requests (ALTER TABLE is idempotent check)
    const columnsToAdd = [
      { name: 'units_required', sql: "ALTER TABLE blood_requests ADD COLUMN units_required INT NOT NULL DEFAULT 1" },
      { name: 'contact_number', sql: "ALTER TABLE blood_requests ADD COLUMN contact_number VARCHAR(20) DEFAULT ''" },
      { name: 'urgency', sql: "ALTER TABLE blood_requests ADD COLUMN urgency ENUM('Normal', 'Urgent', 'Critical') DEFAULT 'Normal'" },
      { name: 'notes', sql: "ALTER TABLE blood_requests ADD COLUMN notes TEXT DEFAULT NULL" },
      { name: 'email_sent', sql: "ALTER TABLE blood_requests ADD COLUMN email_sent BOOLEAN DEFAULT FALSE" },
      { name: 'admin_email_sent', sql: "ALTER TABLE blood_requests ADD COLUMN admin_email_sent BOOLEAN DEFAULT FALSE" },
      { name: 'completedAt', sql: "ALTER TABLE blood_requests ADD COLUMN completedAt TIMESTAMP NULL DEFAULT NULL" },
      { name: 'is_deleted', sql: "ALTER TABLE blood_requests ADD COLUMN is_deleted TINYINT(1) DEFAULT 0" },
    ];

    for (const col of columnsToAdd) {
      try {
        const [cols] = await connection.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'blood_requests' AND COLUMN_NAME = ?`,
          [process.env.DB_NAME || 'ubms', col.name]
        );
        if (cols.length === 0) {
          await connection.query(col.sql);
          console.log(`   ➕ Added column blood_requests.${col.name}`);
        }
      } catch (e) {
        // Column likely already exists; ignore
      }
    }

    // Safely add columns to notifications table
    const notifColumns = [
      { name: 'sender_id', sql: "ALTER TABLE notifications ADD COLUMN sender_id INT DEFAULT NULL" },
      { name: 'request_id', sql: "ALTER TABLE notifications ADD COLUMN request_id INT DEFAULT NULL" },
      { name: 'action_status', sql: "ALTER TABLE notifications ADD COLUMN action_status ENUM('none', 'accepted', 'declined') DEFAULT 'none'" },
    ];

    for (const col of notifColumns) {
      try {
        const [cols] = await connection.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notifications' AND COLUMN_NAME = ?`,
          [process.env.DB_NAME || 'ubms', col.name]
        );
        if (cols.length === 0) {
          await connection.query(col.sql);
          console.log(`   ➕ Added column notifications.${col.name}`);
        }
      } catch (e) {
        // Column likely already exists; ignore
      }
    }

    // Safely add columns to donation_responses table
    const responseColumns = [
      { name: 'accept_mail_sent', sql: "ALTER TABLE donation_responses ADD COLUMN accept_mail_sent BOOLEAN DEFAULT FALSE" },
    ];

    for (const col of responseColumns) {
      try {
        const [cols] = await connection.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'donation_responses' AND COLUMN_NAME = ?`,
          [process.env.DB_NAME || 'ubms', col.name]
        );
        if (cols.length === 0) {
          await connection.query(col.sql);
          console.log(`   ➕ Added column donation_responses.${col.name}`);
        }
      } catch (e) {
        // Column likely already exists; ignore
      }
    }

    // Safely add columns to email_logs table
    const emailLogColumns = [
      { name: 'donor_id', sql: "ALTER TABLE email_logs ADD COLUMN donor_id INT DEFAULT NULL" },
      { name: 'type', sql: "ALTER TABLE email_logs ADD COLUMN type VARCHAR(100) DEFAULT NULL" },
      { name: 'sent_at', sql: "ALTER TABLE email_logs ADD COLUMN sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" },
    ];

    for (const col of emailLogColumns) {
      try {
        const [cols] = await connection.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'email_logs' AND COLUMN_NAME = ?`,
          [process.env.DB_NAME || 'ubms', col.name]
        );
        if (cols.length === 0) {
          await connection.query(col.sql);
          console.log(`   ➕ Added column email_logs.${col.name}`);
        }
      } catch (e) {
        // Column likely already exists; ignore
      }
    }

    // Safely update direct_requests status column ENUM to support 'Completed'
    try {
      await connection.query("ALTER TABLE direct_requests MODIFY COLUMN status ENUM('Pending', 'Accepted', 'Declined', 'Completed') DEFAULT 'Pending'");
      console.log("   🔄 Updated direct_requests status column ENUM to support 'Completed'");
    } catch (e) {
      // Column modification might fail or already be completed; ignore
    }

    // 5. Cleanup database data: if any user or donor has location/city with '@' symbol (indicates email instead of address)
    try {
      console.log('🧹 Running database cleanup for invalid email locations...');
      // Update specific email addresses to actual location
      // Wait, donor_availability doesn't support JOIN UPDATE in older MySQL / TiDB directly in some syntax, let's do a subquery update to be super compatible
      await connection.query(
        `UPDATE donor_availability SET city = 'Havanagi Plot, Savanur'
         WHERE user_id IN (SELECT id FROM users WHERE email = 'prashantsulakhe30@gmail.com') AND city LIKE '%@%'`
      );

      // Generic fallback for any other users
      await connection.query(
        `UPDATE users SET location = 'Location not specified' WHERE location LIKE '%@%'`
      );
      await connection.query(
        `UPDATE donor_availability SET city = 'Location not specified' WHERE city LIKE '%@%'`
      );
      console.log('✅ Database cleanup completed successfully!');
    } catch (e) {
      console.error('⚠️ Database cleanup warning:', e.message);
    }

    // 4. Create default admin if not exists
    const adminEmail = process.env.ADMIN_EMAIL || 'ubms.support@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'UBMS@2026';
    const [existingAdmins] = await connection.query('SELECT * FROM admin WHERE email = ?', [adminEmail]);

    if (existingAdmins.length === 0) {
      const bcrypt = await import('bcryptjs').then(m => m.default);
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await connection.query(
        'INSERT INTO admin (username, email, password) VALUES (?, ?, ?)',
        ['UBMS Admin', adminEmail, hashedPassword]
      );
      console.log('👤 Default Admin account created successfully.');
    }

    connection.release();
    await tempPool.end();
  } catch (err) {
    console.error('❌ TiDB initialization error:', err.message);
    if (connection) connection.release();
  }
}

// Run initialization
initDB();

export default pool;
