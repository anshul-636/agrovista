let nodemailer = null

try {
    nodemailer = require('nodemailer')
} catch (err) {
    console.warn('Email delivery disabled: install nodemailer in the server package to enable SMTP.')
}

let transporter = null

const getTransporter = () => {
    if (transporter) return transporter
    if (!nodemailer) return null

    const host = process.env.SMTP_HOST
    const port = Number(process.env.SMTP_PORT || 587)
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    if (!host || !user || !pass) return null

    transporter = nodemailer.createTransport({
        host,
        port,
        secure: String(process.env.SMTP_SECURE || 'false') === 'true',
        auth: { user, pass }
    })

    return transporter
}

const sendEmail = async ({ to, subject, text, html }) => {
    const mailer = getTransporter()
    if (!mailer || !to) return { skipped: true }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER
    if (!from) return { skipped: true }

    const info = await mailer.sendMail({ from, to, subject, text, html: html || text })
    return { messageId: info.messageId, accepted: info.accepted }
}

// ─────────────────────────────────────────────────────────────────────────────
// FARMER VERIFICATION REQUEST EMAIL
// Sent to ADMIN_EMAILS when a farmer submits documents for review.
//  ─────────────────────────────────────────────────────────────────────────────
const sendVerificationRequestEmail = async ({ farmer, approveUrl, rejectUrl }) => {
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
    if (adminEmails.length === 0) {
        console.warn('⚠️  ADMIN_EMAILS not set — skipping verification email')
        return { skipped: true }
    }

    const docLinks = (farmer.verificationDocs || [])
        .map((url, i) => `
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #e5f0e5;">
                <a href="${url}" target="_blank"
                   style="color:#2d6a4f;font-size:13px;text-decoration:none;font-weight:600;">
                  📄 Document ${i + 1} — View / Download
                </a>
              </td>
            </tr>`)
        .join('')

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f7f0;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7f0;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,80,40,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1b4332,#2d6a4f);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">
              🌿 AgroVista
            </h1>
            <p style="margin:6px 0 0;color:#95d5b2;font-size:13px;">Farmer Verification Request</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">

            <h2 style="margin:0 0 6px;color:#1b4332;font-size:18px;font-weight:700;">
              New Verification Request
            </h2>
            <p style="margin:0 0 24px;color:#52796f;font-size:14px;">
              A farmer has submitted documents for official verification.
            </p>

            <!-- Farmer info -->
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f0f7f0;border-radius:12px;padding:16px;margin-bottom:24px;">
              <tr>
                <td style="padding:6px 0;border-bottom:1px solid #b7e4c7;">
                  <span style="color:#52796f;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Name</span><br>
                  <span style="color:#1b4332;font-size:15px;font-weight:700;">${farmer.name}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0;border-bottom:1px solid #b7e4c7;">
                  <span style="color:#52796f;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Email</span><br>
                  <span style="color:#1b4332;font-size:15px;font-weight:700;">${farmer.email}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0;">
                  <span style="color:#52796f;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Location</span><br>
                  <span style="color:#1b4332;font-size:15px;font-weight:700;">${farmer.location || '—'}</span>
                </td>
              </tr>
            </table>

            <!-- Documents -->
            <h3 style="margin:0 0 12px;color:#1b4332;font-size:15px;font-weight:700;">
              📂 Submitted Documents
            </h3>
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="margin-bottom:28px;">
              ${docLinks || '<tr><td style="color:#52796f;font-size:13px;">No documents found.</td></tr>'}
            </table>

            <p style="margin:0 0 20px;color:#52796f;font-size:13px;line-height:1.6;">
              Please review the documents above and take action below.
              These links expire in <strong>72 hours</strong>.
            </p>

            <!-- Action Buttons -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="48%" align="center" style="padding-right:8px;">
                  <a href="${approveUrl}"
                     style="display:block;background:#2d6a4f;color:#ffffff;text-decoration:none;
                            font-size:15px;font-weight:800;padding:14px 24px;border-radius:10px;
                            text-align:center;letter-spacing:.3px;">
                    ✅ Approve Farmer
                  </a>
                </td>
                <td width="48%" align="center" style="padding-left:8px;">
                  <a href="${rejectUrl}"
                     style="display:block;background:#ffffff;color:#c0392b;text-decoration:none;
                            font-size:15px;font-weight:800;padding:14px 24px;border-radius:10px;
                            text-align:center;border:2px solid #c0392b;letter-spacing:.3px;">
                    ❌ Reject Request
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f0f7f0;padding:18px 32px;text-align:center;">
            <p style="margin:0;color:#74c69d;font-size:11px;">
              AgroVista Admin · This email was sent because you are listed as an admin.<br>
              Do not forward this email — the approval links are single-use.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`

    return sendEmail({
        to: adminEmails.join(','),
        subject: `[AgroVista] Verification Request — ${farmer.name} (${farmer.email})`,
        text: `New farmer verification request from ${farmer.name} (${farmer.email}).\n\nApprove: ${approveUrl}\nReject: ${rejectUrl}`,
        html
    })
}

module.exports = { sendEmail, sendVerificationRequestEmail }
