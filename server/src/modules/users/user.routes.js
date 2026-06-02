const express = require('express')
const {
    getProfile,
    getUserReviews,
    getStats,
    updateProfile,
    updateRole,
    submitVerificationRequest,
    listPendingVerifications,
    processVerification
} = require('./user.controller')
const { verifyToken } = require('../../middleware/auth')

const router = express.Router()

// ── Public ───────────────────────────────────────────────────────────────────
router.get('/stats', getStats)
router.get('/:id', getProfile)
router.get('/:id/reviews', getUserReviews)

// ── Authenticated ────────────────────────────────────────────────────────────
router.patch('/me', verifyToken, updateProfile)
router.put('/me/role', verifyToken, updateRole)

// Farmer submits verification request
// POST /api/users/me/verification-request  { docUrls: [...] }
router.post('/me/verification-request', verifyToken, submitVerificationRequest)

// ── Admin ─────────────────────────────────────────────────────────────────────
// These routes are protected by the service layer (admin email check),
// not by a middleware role check, so any authenticated user gets a 403
// unless their email is in ADMIN_EMAILS env var.
router.get('/admin/verifications', verifyToken, listPendingVerifications)
router.post('/admin/verifications/:farmerId', verifyToken, processVerification)

module.exports = router