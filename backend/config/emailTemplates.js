/**
 * ── UBMS Professional Email Templates ──────────────────
 * Red + White emergency theme, mobile responsive,
 * includes Donate Now buttons and UBMS branding.
 */

const UBMS_URL = 'https://ubms-blood.vercel.app'; // Update with your deployed URL
const SUPPORT_EMAIL = 'ubms.support@gmail.com';

/**
 * Blood Request Alert Email — sent to ALL registered users
 */
export function bloodRequestAlertTemplate({
  requesterName,
  bloodGroup,
  unitsRequired,
  location,
  contactNumber,
  urgency,
  notes,
  requestTime,
  requestId,
}) {
  const urgencyColors = {
    Normal: { bg: '#fff3cd', text: '#856404', label: '🟡 Normal' },
    Urgent: { bg: '#ffe0b2', text: '#e65100', label: '🟠 Urgent' },
    Critical: { bg: '#ffcdd2', text: '#b71c1c', label: '🔴 Critical' },
  };
  const urg = urgencyColors[urgency] || urgencyColors.Normal;
  const formattedTime = new Date(requestTime).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UBMS Emergency Blood Request</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f7;">
    <tr>
      <td align="center" style="padding:30px 10px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#d32f2f 0%,#b71c1c 100%);padding:32px 40px;text-align:center;">
              <div style="font-size:42px;margin-bottom:8px;">🩸</div>
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;letter-spacing:0.5px;">
                UBMS Emergency Blood Request
              </h1>
              <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">
                University Blood Management System
              </p>
            </td>
          </tr>

          <!-- Urgency Banner -->
          <tr>
            <td style="padding:0 40px;">
              <div style="background:${urg.bg};color:${urg.text};padding:12px 20px;border-radius:10px;text-align:center;font-weight:700;font-size:15px;margin-top:24px;border:1px solid ${urg.text}22;">
                ${urg.label} — Immediate Attention Required
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 40px 16px;">
              <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 20px;">
                Dear UBMS Member,<br><br>
                <strong>${requesterName}</strong> has submitted an <strong style="color:#d32f2f;">${urgency.toLowerCase()}</strong> blood request. Your help can save a life.
              </p>
            </td>
          </tr>

          <!-- Details Card -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafafa;border-radius:12px;border:1px solid #eee;">
                <tr>
                  <td style="padding:24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:8px 0;color:#666;font-size:13px;width:140px;">👤 Requester</td>
                        <td style="padding:8px 0;color:#222;font-size:15px;font-weight:600;">${requesterName}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#666;font-size:13px;border-top:1px solid #eee;">🩸 Blood Group</td>
                        <td style="padding:8px 0;border-top:1px solid #eee;">
                          <span style="background:#d32f2f;color:#fff;padding:4px 14px;border-radius:20px;font-weight:800;font-size:15px;">${bloodGroup}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#666;font-size:13px;border-top:1px solid #eee;">💉 Units Required</td>
                        <td style="padding:8px 0;color:#222;font-size:15px;font-weight:600;border-top:1px solid #eee;">${unitsRequired} Unit(s)</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#666;font-size:13px;border-top:1px solid #eee;">📍 Location</td>
                        <td style="padding:8px 0;color:#222;font-size:15px;font-weight:600;border-top:1px solid #eee;">${location}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#666;font-size:13px;border-top:1px solid #eee;">📞 Contact</td>
                        <td style="padding:8px 0;color:#222;font-size:15px;font-weight:600;border-top:1px solid #eee;">${contactNumber || 'Not provided'}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#666;font-size:13px;border-top:1px solid #eee;">⚡ Urgency</td>
                        <td style="padding:8px 0;border-top:1px solid #eee;">
                          <span style="background:${urg.bg};color:${urg.text};padding:3px 12px;border-radius:15px;font-size:13px;font-weight:700;">${urgency}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#666;font-size:13px;border-top:1px solid #eee;">🕐 Requested At</td>
                        <td style="padding:8px 0;color:#222;font-size:14px;border-top:1px solid #eee;">${formattedTime}</td>
                      </tr>
                      ${notes ? `
                      <tr>
                        <td style="padding:8px 0;color:#666;font-size:13px;border-top:1px solid #eee;">📝 Notes</td>
                        <td style="padding:8px 0;color:#555;font-size:14px;border-top:1px solid #eee;font-style:italic;">${notes}</td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <a href="${UBMS_URL}/request-blood" 
                 style="display:inline-block;background:linear-gradient(135deg,#d32f2f,#b71c1c);color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:50px;font-size:17px;font-weight:800;letter-spacing:0.5px;box-shadow:0 4px 16px rgba(211,47,47,0.3);">
                🩸 Donate Now
              </a>
              <p style="color:#999;font-size:12px;margin:12px 0 0;">Click to view this request on the UBMS platform</p>
            </td>
          </tr>

          <!-- Quote -->
          <tr>
            <td style="padding:0 40px 24px;text-align:center;">
              <div style="background:linear-gradient(135deg,#fff5f5,#ffe8e8);padding:20px;border-radius:12px;border-left:4px solid #d32f2f;">
                <p style="color:#c62828;font-size:15px;font-weight:600;margin:0;font-style:italic;">
                  "Your single donation can save multiple lives."
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;padding:24px 40px;border-top:1px solid #eee;text-align:center;">
              <p style="color:#999;font-size:12px;margin:0 0 8px;">
                University Blood Management System (UBMS) • ${new Date().getFullYear()}
              </p>
              <p style="color:#bbb;font-size:11px;margin:0 0 8px;">
                📧 Support: ${SUPPORT_EMAIL}
              </p>
              <p style="color:#ccc;font-size:11px;margin:0;">
                This is an automated notification. Please do not reply directly.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}


/**
 * Donation Accepted Email — sent to the REQUESTER when a donor accepts
 */
export function donationAcceptedTemplate({
  requesterName,
  donorName,
  bloodGroup,
  location,
  donorPhone,
  donorGender,
  donorId,
  requestId,
}) {
  const profileLink = `${UBMS_URL}/profile/${donorId}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f7;">
    <tr>
      <td align="center" style="padding:30px 10px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#2e7d32,#1b5e20);padding:28px 40px;text-align:center;">
              <div style="font-size:38px;margin-bottom:6px;">✅</div>
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">Donation Accepted!</h1>
              <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">UBMS Blood Request Update</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="color:#333;font-size:16px;line-height:1.6;">
                Dear <strong>${requesterName}</strong>,<br><br>
                Great news! <strong style="color:#2e7d32;">${donorName}</strong> has accepted your blood donation request for <strong style="color:#d32f2f;">${bloodGroup}</strong> at <strong>${location}</strong>.
              </p>
              
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f5;border-radius:10px;margin:16px 0;">
                <tr><td style="padding:16px;">
                  <h3 style="margin:0 0 12px 0;color:#333;font-size:16px;">Donor Details</h3>
                  <p style="margin:4px 0;color:#555;font-size:14px;">👤 Name: <strong>${donorName}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">🩸 Blood Group: <strong style="color:#d32f2f;">${bloodGroup}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">📞 Contact Number: <strong>${donorPhone || 'Not provided'}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">📍 Location: <strong>${location}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">⚧ Gender: <strong>${donorGender || 'Not specified'}</strong></p>
                </td></tr>
              </table>

              <div style="background:#e8f5e9;padding:20px;border-radius:12px;margin:20px 0;text-align:center;border:1px solid #c8e6c9;">
                <p style="color:#2e7d32;font-size:15px;font-weight:600;margin:0;">
                  🎉 A donor is on the way! Please stay connected.
                </p>
              </div>
              <div style="text-align:center;margin:24px 0;">
                <a href="${profileLink}" style="display:inline-block;background:linear-gradient(135deg,#2e7d32,#1b5e20);color:#fff;text-decoration:none;padding:14px 40px;border-radius:50px;font-size:15px;font-weight:700;">
                  View Donor Profile
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
              <p style="color:#999;font-size:12px;margin:0;">UBMS • ${new Date().getFullYear()} • ${SUPPORT_EMAIL}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}


/**
 * Admin Alert Email — sent to admin on donation acceptance
 */
export function adminDonationAlertTemplate({
  donorName,
  requesterName,
  bloodGroup,
  location,
  requestId,
  response,
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f7;">
    <tr>
      <td align="center" style="padding:30px 10px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1565c0,#0d47a1);padding:28px 40px;text-align:center;">
              <div style="font-size:38px;margin-bottom:6px;">🔔</div>
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">Admin Notification</h1>
              <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Donation Response Alert</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="color:#333;font-size:16px;line-height:1.6;">
                <strong>${donorName}</strong> has <strong style="color:${response === 'Accepted' ? '#2e7d32' : '#d32f2f'};">${response.toLowerCase()}</strong> the blood donation request.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f5;border-radius:10px;margin:16px 0;">
                <tr><td style="padding:16px;">
                  <p style="margin:4px 0;color:#555;font-size:14px;">📋 Request #${requestId}</p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">👤 Requester: <strong>${requesterName}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">🩸 Blood Group: <strong style="color:#d32f2f;">${bloodGroup}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">📍 Location: <strong>${location}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">🤝 Donor: <strong>${donorName}</strong></p>
                </td></tr>
              </table>
              <div style="text-align:center;margin-top:20px;">
                <a href="${UBMS_URL}/manage-requests" style="display:inline-block;background:linear-gradient(135deg,#1565c0,#0d47a1);color:#fff;text-decoration:none;padding:12px 36px;border-radius:50px;font-size:14px;font-weight:700;">
                  View in Admin Panel
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
              <p style="color:#999;font-size:12px;margin:0;">UBMS Admin • ${new Date().getFullYear()}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Admin Alert Email — sent to admin on new blood request creation
 */
export function adminBloodRequestAlertTemplate({
  requesterName,
  bloodGroup,
  unitsRequired,
  location,
  contactNumber,
  requestTime,
  requestId,
}) {
  const formattedTime = new Date(requestTime).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f7;">
    <tr>
      <td align="center" style="padding:30px 10px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#424242,#212121);padding:28px 40px;text-align:center;">
              <div style="font-size:38px;margin-bottom:6px;">🚨</div>
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">New Blood Request Created</h1>
              <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">UBMS Monitoring System</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="color:#333;font-size:16px;line-height:1.6;margin-top:0;">
                A new emergency blood request has been created in UBMS.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f5;border-radius:10px;margin:16px 0;">
                <tr><td style="padding:16px;">
                  <p style="margin:4px 0;color:#555;font-size:14px;">📋 Request ID: <strong>#${requestId}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">👤 Requester: <strong>${requesterName}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">🩸 Blood Group: <strong style="color:#d32f2f;">${bloodGroup}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">💉 Units Required: <strong>${unitsRequired}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">📍 Location: <strong>${location}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">📞 Contact: <strong>${contactNumber || 'Not provided'}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">🕐 Created Time: <strong>${formattedTime}</strong></p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
              <p style="color:#999;font-size:12px;margin:0;">UBMS Monitoring System • ${new Date().getFullYear()}</p>
            </td>
          </tr>
        </table>
  </table>
</body>
</html>`;
}

/**
 * Direct Blood Request Email Template
 */
export function directRequestTemplate({
  requesterName,
  bloodGroup,
  unitsRequired,
  hospital,
  location,
  contactNumber,
  message,
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f7;">
    <tr>
      <td align="center" style="padding:30px 10px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#d32f2f 0%,#b71c1c 100%);padding:28px 40px;text-align:center;">
              <div style="font-size:38px;margin-bottom:6px;">🩸</div>
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">Direct Blood Request</h1>
              <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">UBMS Personal Request</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="color:#333;font-size:16px;line-height:1.6;margin-top:0;">
                Hello, you have received a personal blood donation request from a user on the University Blood Management System.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f5;border-radius:10px;margin:16px 0;">
                <tr><td style="padding:16px;">
                  <p style="margin:4px 0;color:#555;font-size:14px;">👤 Requester: <strong>${requesterName}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">🩸 Blood Group: <strong style="color:#d32f2f;">${bloodGroup}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">💉 Units: <strong>${unitsRequired}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">📍 Location: <strong>${location}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">📞 Contact: <strong>${contactNumber}</strong></p>
                  ${message ? `<p style="margin:4px 0;color:#555;font-size:14px;">📝 Note: <em>"${message}"</em></p>` : ''}
                </td></tr>
              </table>
              <div style="text-align:center;margin-top:20px;">
                <a href="https://ubms-blood.vercel.app/tracking" style="display:inline-block;background:linear-gradient(135deg,#d32f2f,#b71c1c);color:#fff;text-decoration:none;padding:12px 36px;border-radius:50px;font-size:14px;font-weight:700;">
                  View Request
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
              <p style="color:#999;font-size:12px;margin:0;">UBMS • ${new Date().getFullYear()}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Direct Request Accepted Template
 */
export function directRequestAcceptedTemplate({
  requesterName,
  donorName,
  donorEmail,
  donorPhone,
  bloodGroup,
  location,
  donorGender,
  donorId,
}) {
  const profileLink = `https://ubms-blood.vercel.app/profile/${donorId}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f7;">
    <tr>
      <td align="center" style="padding:30px 10px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#2e7d32,#1b5e20);padding:28px 40px;text-align:center;">
              <div style="font-size:38px;margin-bottom:6px;">✅</div>
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">Direct Request Accepted!</h1>
              <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">UBMS Personal Request Update</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="color:#333;font-size:16px;line-height:1.6;">
                Dear <strong>${requesterName}</strong>,<br><br>
                Great news! <strong>${donorName}</strong> has accepted your direct blood request for <strong>${bloodGroup}</strong>.
              </p>
              
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f5;border-radius:10px;margin:16px 0;">
                <tr><td style="padding:16px;">
                  <h3 style="margin:0 0 12px 0;color:#333;font-size:16px;">Donor Details</h3>
                  <p style="margin:4px 0;color:#555;font-size:14px;">👤 Name: <strong>${donorName}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">📧 Email: <strong>${donorEmail}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">📞 Phone: <strong>${donorPhone || 'Not provided'}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">🩸 Blood Group: <strong style="color:#d32f2f;">${bloodGroup}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">📍 Location: <strong>${location}</strong></p>
                  <p style="margin:4px 0;color:#555;font-size:14px;">⚧ Gender: <strong>${donorGender || 'Not specified'}</strong></p>
                </td></tr>
              </table>

              <div style="text-align:center;margin:24px 0;">
                <a href="${profileLink}" style="display:inline-block;background:linear-gradient(135deg,#2e7d32,#1b5e20);color:#fff;text-decoration:none;padding:14px 40px;border-radius:50px;font-size:15px;font-weight:700;">
                  View Donor Profile
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
              <p style="color:#999;font-size:12px;margin:0;">UBMS • ${new Date().getFullYear()}</p>
            </td>
          </tr>
        </table>
  </table>
</body>
</html>`;
}

/**
 * Admin Alert Email — sent to admin when a blood request is completed
 */
export function bloodRequestCompletedTemplate({
  requesterName,
  bloodGroup,
  location,
  donorName,
  completionTime,
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f7;">
    <tr>
      <td align="center" style="padding:30px 10px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#2e7d32,#1b5e20);padding:28px 40px;text-align:center;">
              <div style="font-size:38px;margin-bottom:6px;">🎉</div>
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">Blood Request Completed</h1>
              <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">UBMS Admin Notification</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="color:#333;font-size:16px;line-height:1.6;margin-top:0;">
                Hello Admin,<br><br>
                A blood donation request has been marked as <strong>Completed</strong>.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f5;border-radius:10px;margin:16px 0;">
                <tr><td style="padding:16px;">
                  <p style="margin:6px 0;color:#555;font-size:14px;">👤 Requester Name: <strong>${requesterName}</strong></p>
                  <p style="margin:6px 0;color:#555;font-size:14px;">🩸 Blood Group: <strong style="color:#d32f2f;">${bloodGroup}</strong></p>
                  <p style="margin:6px 0;color:#555;font-size:14px;">📍 Location: <strong>${location}</strong></p>
                  <p style="margin:6px 0;color:#555;font-size:14px;">🤝 Accepted Donor Name: <strong>${donorName || 'None'}</strong></p>
                  <p style="margin:6px 0;color:#555;font-size:14px;">🕐 Completion Time: <strong>${completionTime}</strong></p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
              <p style="color:#999;font-size:12px;margin:0;">UBMS Monitoring System • ${new Date().getFullYear()}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}


