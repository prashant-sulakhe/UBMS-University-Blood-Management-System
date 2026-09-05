CREATE DATABASE IF NOT EXISTS ubms;
USE ubms;

-- ─── Users Table (existing — do not modify) ────────
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
);

-- ─── Admin Table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);

-- ─── Blood Requests Table (enhanced) ──────────────
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
  completedAt TIMESTAMP NULL DEFAULT NULL,
  email_sent BOOLEAN DEFAULT FALSE,
  admin_email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Notifications Table ──────────────────────────
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
);

-- ─── Donation Responses Table ─────────────────────
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
);

-- ─── Email Activity Logs ──────────────────────────
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
);

-- ─── Password Resets ──────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

-- ─── Push Subscriptions ───────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
);

-- ─── Direct Requests ──────────────────────────────
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
  status ENUM('Pending', 'Accepted', 'Declined') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_requester (requester_id),
  INDEX idx_receiver (receiver_id)
);
