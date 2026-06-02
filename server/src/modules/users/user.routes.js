const express = require('express')
const {
    getProfile,
    getUserReviews,
    getStats,
    updateProfile,
    updateRole,
    submitVerificationRequest,
    uploadVerificationDocs,
    listPendingVerifications,
    processVerification
} = require('./user.controller')
const { verifyToken } = require('../../middleware/auth')
const { upload } = require('../../config/cloudinary')

const router = express.Router()

// ── Public ───────────────────────────────────────────────────────────────────
router.get('/stats', getStats)
router.get('/:id', getProfile)
router.get('/:id/reviews', getUserReviews)

// ── Authenticated ────────────────────────────────────────────────────────────
router.patch('/me', verifyToken, updateProfile)
router.put('/me/role', verifyToken, updateRole)

// Farmer submits verification request (URL-based, kept for backwards compat)
// POST /api/users/me/verification-request  { docUrls: [...] }
router.post('/me/verification-request', verifyToken, submitVerificationRequest)

// Farmer uploads verification docs directly (multipart/form-data, up to 5 files)
// POST /api/users/me/verification-upload
router.post('/me/verification-upload', verifyToken, upload.array('docs', 5), uploadVerificationDocs)

// ── Admin ─────────────────────────────────────────────────────────────────────
// These routes are protected by the service layer (admin email check),
// not by a middleware role check, so any authenticated user gets a 403
// unless their email is in ADMIN_EMAILS env var.
router.get('/admin/verifications', verifyToken, listPendingVerifications)
router.post('/admin/verifications/:farmerId', verifyToken, processVerification)

module.exports = router