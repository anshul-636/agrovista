const rateLimit = require('express-rate-limit')

// ── Login limiter ──────────────────────────────────────────────────────────────
// Tightest limit: brute-forcing passwords is the highest-risk auth attack.
// 8 attempts per 15 minutes per IP. After that, 15-min cooldown.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    standardHeaders: true,  // Return RateLimit-* headers (RFC 6585)
    legacyHeaders: false,   // Disable X-RateLimit-* headers
    message: {
        success: false,
        message: 'Too many login attempts from this IP. Please try again in 15 minutes.'
    }
})

// ── Registration limiter ───────────────────────────────────────────────────────
// Looser than login — a real user might fail a few times, but bulk account
// creation (spam/abuse) still gets blocked.
// 5 registrations per hour per IP.
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many accounts created from this IP. Please try again in 1 hour.'
    }
})

// ── Token refresh limiter ──────────────────────────────────────────────────────
// Prevents token-fishing loops. Legitimate clients refresh at most every
// 15 minutes (access token TTL), so 20 per 15 min is very generous.
const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many token refresh requests. Please try again shortly.'
    }
})

// ── Global API limiter ─────────────────────────────────────────────────────────
// Applied to all /api/* routes as a blanket DDoS buffer.
// 120 requests per minute per IP is generous for normal usage.
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests from this IP. Please slow down.'
    }
})

module.exports = { loginLimiter, registerLimiter, refreshLimiter, apiLimiter }