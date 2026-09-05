/**
 * UBMS Email Test Script
 * Run this to verify your Gmail SMTP credentials work.
 *
 * Usage:
 *   node testEmail.js
 *
 * What it checks:
 *   1. EMAIL_USER and EMAIL_PASS are loaded from .env
 *   2. SMTP connection to Gmail is valid
 *   3. A real test email is delivered to YOUR inbox
 */

import nodemailer from 'nodemailer';
import 'dotenv/config';

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

console.log('');
console.log('==============================================');
console.log('  UBMS Email SMTP Tester');
console.log('==============================================');
console.log(`  EMAIL_USER loaded: ${EMAIL_USER}`);
console.log(`  EMAIL_PASS loaded: ${EMAIL_PASS ? '****(hidden)' : 'NOT SET ❌'}`);
console.log('==============================================');
console.log('');

const isConfigured =
  EMAIL_USER &&
  EMAIL_PASS &&
  EMAIL_USER !== 'your-email@gmail.com' &&
  EMAIL_PASS !== 'your-app-password';

if (!isConfigured) {
  console.error('❌ ERROR: Real Gmail credentials are NOT set in .env');
  console.error('');
  console.error('   Fix: Open .env and set:');
  console.error('   EMAIL_USER=yourgmail@gmail.com');
  console.error('   EMAIL_PASS=your16characterapppassword');
  console.error('');
  console.error('   How to get App Password:');
  console.error('   1. Go to: https://myaccount.google.com/security');
  console.error('   2. Enable 2-Step Verification');
  console.error('   3. Search "App Passwords"');
  console.error('   4. Create new → Mail → Other → Generate');
  console.error('   5. Copy the 16-character password (no spaces)');
  process.exit(1);
}

console.log('🔌 Connecting to Gmail SMTP...');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Step 1: Verify SMTP connection
transporter.verify(async (error, success) => {
  if (error) {
    console.error('');
    console.error('❌ SMTP VERIFICATION FAILED:', error.message);
    console.error('');

    if (error.message.includes('Invalid login') || error.message.includes('Username and Password')) {
      console.error('REASON: Wrong email or password.');
      console.error('FIX: Make sure you are using a Gmail APP PASSWORD, not your regular password.');
      console.error('     App Passwords: https://myaccount.google.com/apppasswords');
    } else if (error.message.includes('Less secure')) {
      console.error('REASON: Less secure app access is blocked.');
      console.error('FIX: Use Gmail App Password instead of regular password.');
    } else if (error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) {
      console.error('REASON: Network or firewall is blocking SMTP port 587.');
      console.error('FIX: Check your internet connection. Try on a different network.');
    }

    console.error('');
    process.exit(1);
  }

  console.log('✅ SMTP SERVER READY — Gmail connection verified!');
  console.log('');
  console.log('📤 Sending test email to:', EMAIL_USER);

  // Step 2: Send a real test email
  try {
    const info = await transporter.sendMail({
      from: `"UBMS Support" <${EMAIL_USER}>`,
      to: EMAIL_USER,   // Sends to yourself as a test
      subject: '✅ UBMS Email Test — It Works!',
      text: `Hello,\n\nThis is a test email from your University Blood Management System.\n\nIf you received this, your Gmail SMTP is working correctly.\n\nUBMS Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #d32f2f;">✅ UBMS Email Test Successful!</h2>
          <p>Hello,</p>
          <p>This is a test email from your <strong>University Blood Management System</strong>.</p>
          <p>If you received this, your Gmail SMTP is configured correctly and OTP emails will now be delivered.</p>
          <br/>
          <p>— UBMS Team</p>
        </div>
      `,
    });

    console.log('');
    console.log('🎉 SUCCESS! Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log('');
    console.log('📬 Check your inbox at:', EMAIL_USER);
    console.log('   (Also check Spam / Promotions folder if not in inbox)');
    console.log('');
    console.log('Your OTP email system is ready to use!');
  } catch (sendError) {
    console.error('');
    console.error('❌ FAILED to send test email:', sendError.message);
    console.error('');
    process.exit(1);
  }
});
