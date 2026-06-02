// email.service.js
// Uses Resend (HTTPS API) — works on Render free tier.
// SMTP (nodemailer) is blocked by Render on all outbound port 587/465/25.
//
// Setup:
//   1. npm install resend  (in the server folder)
//   2. Sign up free at https://resend.com → API Keys → Create
//   3. Add to Render env vars:
//        RESEND_API_KEY = re_xxxxxxxxxxxx
//        EMAIL_FROM     = AgroVista <onboarding@resend.dev>
//        ADMIN_EMAILS   = youremail@gmail.com,other@gmail.com
//        API_URL        = https://your-render-app.onrender.com

let ResendClient = null
try {
    ResendClient = require('resend').Resend
} catch {
    console.warn('⚠️  Email disabled: run "npm install resend" inside the server folder.')
}

let _client = null
const getClient = () => {
    if (_client) return _client
    if (!ResendClient) return null
    const key = process.env.RESEND_API_KEY
    if (!key) {
        console.warn('⚠️  Email disabled: RESEND_API_KEY env var is not set.')
        return null
    }
    _client = new ResendClient(key)
    return _client
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC SEND — same interface as before, drop-in replacement
// ─────────────────────────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, text, html }) => {
    const client = getClient()
    if (!client || !to) return { skipped: true }

    const from = process.env.EMAIL_FROM || 'AgroVista <onboarding@resend.dev>'

    try {
        const { data, error } = await client.emails.send({
            from,
            to: Array.isArray(to) ? to : [to],
            subject,
            text,
            html: html || text,
        })

        if (error) {
            console.error('❌ Resend error:', error)
            return { skipped: true, error }
        }

        console.log('📧 Email sent via Resend, id:', data.id)
        return { messageId: data.id, accepted: Array.isArray(to) ? to : [to] }
    } catch (err) {
        console.error('❌ Resend send failed:', err.message)
        return { skipped: true }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FARMER VERIFICATION REQUEST EMAIL
// Sent to ADMIN_EMAILS when a farmer submits documents for review.
// Contains one-click Approve / Reject buttons that hit your server directly.
// ─────────────────────────────────────────────────────────────────────────────
const sendVerificationRequestEmail = async ({ farmer, approveUrl, rejectUrl }) => {
    const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim())
        .filter(Boolean)

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
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              ${docLinks || '<tr><td style="color:#52796f;font-size:13px;">No documents attached.</td></tr>'}
            </table>

            <p style="margin:0 0 20px;color:#52796f;font-size:13px;line-height:1.6;">
              Review the documents above, then click one of the buttons below.<br>
              <strong>These links expire in 72 hours.</strong>
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
              AgroVista Admin · You are receiving this because your email is in ADMIN_EMAILS.<br>
              Do not forward — the approval links are single-use and expire in 72 hours.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`

    return sendEmail({
        to: adminEmails,
        subject: `[AgroVista] Verification Request — ${farmer.name} (${farmer.email})`,
        text: `New farmer verification request.\n\nFarmer: ${farmer.name}\nEmail: ${farmer.email}\nLocation: ${farmer.location || '—'}\n\nApprove: ${approveUrl}\nReject: ${rejectUrl}\n\nLinks expire in 72 hours.`,
        html
    })
}

module.exports = { sendEmail, sendVerificationRequestEmail }