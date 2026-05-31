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

    if (!host || !user || !pass) {
        return null
    }

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

    const info = await mailer.sendMail({
        from,
        to,
        subject,
        text,
        html: html || text
    })

    return { messageId: info.messageId, accepted: info.accepted }
}

module.exports = { sendEmail }
