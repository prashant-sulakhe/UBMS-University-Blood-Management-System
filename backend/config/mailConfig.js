import nodemailer from 'nodemailer';
import 'dotenv/config';

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const isConfigured =
  EMAIL_USER &&
  EMAIL_PASS &&
  EMAIL_USER !== 'your-email@gmail.com' &&
  EMAIL_PASS !== 'your-app-password';

let transporter;

if (isConfigured) {
  console.log(`[MailConfig] Using real Gmail: ${EMAIL_USER}`);
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  // Verify SMTP at startup
  transporter.verify((error, success) => {
    if (error) {
      console.error('[MailConfig] ❌ SMTP ERROR:', error.message);
      console.error('[MailConfig] Fix: Check EMAIL_USER and EMAIL_PASS in .env');
    } else {
      console.log('[MailConfig] ✅ SMTP SERVER READY — Gmail connected');
    }
  });
} else {
  console.warn('[MailConfig] ⚠️  No real email credentials found in .env');
  console.warn('[MailConfig] Falling back to Ethereal (fake emails — for dev only)');
  transporter = null; // Will be set lazily when needed
}

export { transporter, isConfigured, EMAIL_USER };
