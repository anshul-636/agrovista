const express = require('express')
const {
    getProfile,
    getUserReviews,
    getStats,
    updateProfile,
    updateRole,
    submitVerificationRequest,
    uploadVerificationDocs,
    emailVerificationAction,
    emailVerificationReject,
    listPendingVerifications,
    processVerification,
    deleteAccount
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
router.delete('/me', verifyToken, deleteAccount)

// Farmer submits verification request (URL-based, kept for backwards compat)
// POST /api/users/me/verification-request  { docUrls: [...] }
router.post('/me/verification-request', verifyToken, submitVerificationRequest)

// Farmer uploads verification docs directly (multipart/form-data, up to 5 files)
// POST /api/users/me/verification-upload
router.post('/me/verification-upload', verifyToken, upload.array('docs', 5), uploadVerificationDocs)

// ── Admin ─────────────────────────────────────────────────────────────────────
// Public one-click link from email (token-signed, no session needed)
// GET  /api/users/admin/email-verify?token=xxx  → approve immediately OR show reject form
router.get('/admin/email-verify', emailVerificationAction)
// POST /api/users/admin/email-verify  → submit reject form with reason
router.post('/admin/email-verify', emailVerificationReject)

router.get('/admin/verifications', verifyToken, listPendingVerifications)
router.post('/admin/verifications/:farmerId', verifyToken, processVerification)

module.exports = router