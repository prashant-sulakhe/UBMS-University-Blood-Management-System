/**
 * ── UBMS Email Service ─────────────────────────────────
 * Handles bulk email sending with async queue, error handling,
 * retry logic, and email activity logging to the database.
 */
import pool from '../db.js';
import nodemailer from 'nodemailer';
import validator from 'validator';
import { transporter as gmailTransporter, isConfigured, EMAIL_USER } from '../config/mailConfig.js';
import {
  bloodRequestAlertTemplate,
  donationAcceptedTemplate,
  adminDonationAlertTemplate,
  adminBloodRequestAlertTemplate,
  directRequestTemplate,
  directRequestAcceptedTemplate,
  bloodRequestCompletedTemplate,
} from '../config/emailTemplates.js';

// ── Internal: get a working transporter ──────────────────
async function getTransporter() {
  if (isConfigured && gmailTransporter) return gmailTransporter;

  // Fallback: Ethereal test account (dev only)
  console.warn('[EmailService] ⚠️  No real Gmail credentials. Using Ethereal.');
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
}

// ── Internal: send a single email with retry ──────────────
async function sendSingleEmail(transporter, to, subject, html, requestId = null, retries = 2) {
  const from = isConfigured
    ? `"UBMS Blood Alert" <${EMAIL_USER}>`
    : '"UBMS Support" <support@ubms.local>';

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const info = await transporter.sendMail({ from, to, subject, html });

      // Log success
      try {
        await pool.execute(
          'INSERT INTO email_logs (recipient_email, subject, status, request_id) VALUES (?, ?, ?, ?)',
          [to, subject, 'sent', requestId]
        );
      } catch (logErr) { /* non-critical */ }

      if (!isConfigured) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) console.log(`   📧 DEV preview: ${previewUrl}`);
      }

      return { success: true, to, messageId: info.messageId };
    } catch (err) {
      console.error(`[EmailService] ❌ Attempt ${attempt}/${retries + 1} failed for ${to}: ${err.message}`);
      if (attempt > retries) {
        // Log failure
        try {
          await pool.execute(
            'INSERT INTO email_logs (recipient_email, subject, status, error_message, request_id) VALUES (?, ?, ?, ?, ?)',
            [to, subject, 'failed', err.message, requestId]
          );
        } catch (logErr) { /* non-critical */ }
        return { success: false, to, error: err.message };
      }
      // Wait before retry
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

/**
 * Send blood request alert email to ALL registered users.
 * EXCLUDES the requester and the admin email.
 * Uses async queue — does NOT crash server on individual failures.
 * @returns {{ sent: number, failed: number, errors: string[] }}
 */
export async function sendBloodRequestEmailToAll(requestData) {
  const t0 = Date.now();
  console.log('[EmailService] 📬 Starting bulk email for blood request...');

  // 1. Fetch ALL user emails from database
  const [users] = await pool.execute('SELECT email FROM users');
  
  // 2. Filter out invalid emails, the requester, and the admin
  const adminEmail = (process.env.EMAIL_USER || 'ubms.support@gmail.com').toLowerCase().trim();
  const reqEmail = (requestData.requesterEmail || '').toLowerCase().trim();

  const validRecipients = users.filter(user => {
    if (!user.email || typeof user.email !== 'string') return false;
    if (!validator.isEmail(user.email)) return false;
    
    const currentEmail = user.email.toLowerCase().trim();
    if (currentEmail === reqEmail) return false;
    if (currentEmail === adminEmail) return false;
    if (currentEmail === 'ubms.support@gmail.com') return false; // Hardcode safeguard
    
    return true;
  });
  
  if (validRecipients.length === 0) {
    console.log('[EmailService] No valid users to notify (excluding requester/admin).');
    return { sent: 0, failed: 0, errors: [] };
  }

  console.log(`[EmailService] Found ${validRecipients.length} valid registered users to email.`);

  // 3. Build HTML template
  const subject = `🩸 UBMS Emergency: ${requestData.bloodGroup} Blood Needed at ${requestData.location}`;
  const html = bloodRequestAlertTemplate(requestData);

  // 3. Get transporter
  const transporter = await getTransporter();

  // 5. Send emails in parallel batches (5 at a time to avoid SMTP throttle)
  const BATCH_SIZE = 5;
  const results = [];

  for (let i = 0; i < validRecipients.length; i += BATCH_SIZE) {
    const batch = validRecipients.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(u => sendSingleEmail(transporter, u.email, subject, html, requestData.requestId))
    );
    results.push(...batchResults);
  }

  const sent = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const errors = results.filter(r => !r.success).map(r => `${r.to}: ${r.error}`);

  console.log(`[EmailService] ✅ Bulk email complete: ${sent} sent, ${failed} failed (${Date.now() - t0}ms)`);
  if (errors.length > 0) {
    console.log(`[EmailService] Failed emails:`, errors);
  }

  return { sent, failed, errors };
}

/**
 * Send admin alert email on new blood request creation.
 */
export async function sendAdminBloodRequestAlert(requestData) {
  const transporter = await getTransporter();
  const adminEmail = process.env.EMAIL_USER || 'ubms.support@gmail.com';
  const subject = `🚨 New Blood Request Created: ${requestData.bloodGroup} at ${requestData.location}`;
  const html = adminBloodRequestAlertTemplate(requestData);
  return sendSingleEmail(transporter, adminEmail, subject, html, requestData.requestId);
}

/**
 * Send donation accepted email to the blood requester.
 */
export async function sendDonationAcceptedEmail(requesterEmail, data) {
  const transporter = await getTransporter();
  const subject = `✅ ${data.donorName} Accepted Your Blood Request — UBMS`;
  const html = donationAcceptedTemplate(data);
  return sendSingleEmail(transporter, requesterEmail, subject, html, data.requestId);
}

/**
 * Send admin notification email about a donation response.
 */
export async function sendAdminDonationEmail(data) {
  const transporter = await getTransporter();
  const adminEmail = process.env.EMAIL_USER || 'ubms.support@gmail.com';
  const subject = `🔔 Donation ${data.response}: ${data.donorName} for Request #${data.requestId} — UBMS`;
  const html = adminDonationAlertTemplate(data);
  return sendSingleEmail(transporter, adminEmail, subject, html, data.requestId);
}

/**
 * Send direct blood request email to receiver.
 */
export async function sendDirectRequestEmail(receiverEmail, data) {
  const transporter = await getTransporter();
  const subject = `🩸 Blood Request from UBMS User`;
  const html = directRequestTemplate(data);
  return sendSingleEmail(transporter, receiverEmail, subject, html, data.requestId);
}

/**
 * Send direct request accepted email to requester.
 */
export async function sendDirectRequestAcceptedEmail(requesterEmail, data) {
  const transporter = await getTransporter();
  const subject = `✅ ${data.donorName} Accepted Your Direct Blood Request — UBMS`;
  const html = directRequestAcceptedTemplate(data);
  return sendSingleEmail(transporter, requesterEmail, subject, html, data.requestId);
}

/**
 * Send admin alert email on blood request completion.
 * Targets ONLY the admin at ubms.support@gmail.com
 */
export async function sendAdminBloodRequestCompletedAlert(requestData) {
  const transporter = await getTransporter();
  const adminEmail = 'ubms.support@gmail.com';
  const subject = 'Blood Request Completed - UBMS';
  const html = bloodRequestCompletedTemplate(requestData);
  return sendSingleEmail(transporter, adminEmail, subject, html, requestData.requestId);
}
