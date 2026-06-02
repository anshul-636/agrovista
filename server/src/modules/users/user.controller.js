const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse = require('../../utils/ApiResponse')
const ApiError = require('../../utils/ApiError')
const User = require('../../models/User')
const { getPublicProfile, getPublicStats, requestVerification, reviewVerification, getPendingVerifications } = require('./user.service')
const { getFarmerReviews } = require('../reviews/review.service')
const { uploadFiles } = require('../../config/cloudinary')

const getProfile = asyncHandler(async (req, res) => {
    const profile = await getPublicProfile(req.params.id)
    res.json(new ApiResponse(200, profile, 'Profile fetched successfully'))
})

const getUserReviews = asyncHandler(async (req, res) => {
    const data = await getFarmerReviews(req.params.id)
    res.json(new ApiResponse(200, data, 'Reviews fetched successfully'))
})

const getStats = asyncHandler(async (req, res) => {
    const stats = await getPublicStats()
    res.json(new ApiResponse(200, stats, 'Public stats fetched successfully'))
})

const updateProfile = asyncHandler(async (req, res) => {
    const { name, phone, location, bio, avatar, latitude, longitude } = req.body

    const updates = {}

    if (typeof name === 'string') updates.name = name.trim()
    if (typeof phone === 'string') updates.phone = phone.trim()
    if (typeof location === 'string') updates.location = location.trim()
    if (typeof bio === 'string') updates.bio = bio.trim()
    if (typeof avatar === 'string') updates.avatar = avatar.trim()

    // If client provided explicit coordinates, store them (ensure numbers)
    if (latitude !== undefined && latitude !== null && latitude !== "") {
        const latNum = Number(latitude)
        if (!Number.isNaN(latNum)) updates.latitude = latNum
    }
    if (longitude !== undefined && longitude !== null && longitude !== "") {
        const lonNum = Number(longitude)
        if (!Number.isNaN(lonNum)) updates.longitude = lonNum
    }

    // If we have a textual location but no coords, attempt server-side geocoding
    if (updates.location && (updates.latitude === undefined || updates.longitude === undefined)) {
        try {
            const geocodeUrl = new URL('https://geocoding-api.open-meteo.com/v1/search')
            geocodeUrl.searchParams.set('name', updates.location)
            geocodeUrl.searchParams.set('count', '1')
            geocodeUrl.searchParams.set('language', 'en')
            geocodeUrl.searchParams.set('format', 'json')
            geocodeUrl.searchParams.set('country', 'IN')

            const geoRes = await fetch(geocodeUrl)
            if (geoRes.ok) {
                const geoData = await geoRes.json()
                const result = geoData?.results?.[0]
                if (result) {
                    updates.latitude = Number(result.latitude)
                    updates.longitude = Number(result.longitude)
                }
            }
        } catch (err) {
            // Non-fatal: leave coords unset if geocoding fails
        }
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true, runValidators: true }
    ).select('-passwordHash -__v')

    if (!user) {
        throw new ApiError(404, 'User not found')
    }

    res.json(new ApiResponse(200, user, 'Profile updated successfully'))
})

const updateRole = asyncHandler(async (req, res) => {
    const { role } = req.body
    
    if (!role || !['FARMER', 'BUYER'].includes(role)) {
        throw new ApiError(400, 'Role must be FARMER or BUYER')
    }
    
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { role },
        { new: true }
    ).select('-passwordHash -__v')
    
    if (!user) {
        throw new ApiError(404, 'User not found')
    }
    
    res.json(new ApiResponse(200, user, 'Role updated successfully'))
})

// ── Farmer Verification ──────────────────────────────────────────────────────

// POST /api/users/me/verification-request
// Body: { docUrls: ['https://...', 'https://...'] }
const submitVerificationRequest = asyncHandler(async (req, res) => {
    const { docUrls } = req.body
    const result = await requestVerification(req.user._id, docUrls)
    res.json(new ApiResponse(200, result, 'Verification request submitted successfully'))
})

// GET /api/users/admin/verifications  (admin only)
const listPendingVerifications = asyncHandler(async (req, res) => {
    const pending = await getPendingVerifications(req.user._id)
    res.json(new ApiResponse(200, pending, 'Pending verifications fetched'))
})

// POST /api/users/admin/verifications/:farmerId
// Body: { action: 'APPROVE' | 'REJECT', note: '...' }
const processVerification = asyncHandler(async (req, res) => {
    const { action, note } = req.body
    const result = await reviewVerification(req.user._id, req.params.farmerId, action, note)
    res.json(new ApiResponse(200, result, `Verification ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`))
})

// POST /api/users/me/verification-upload  (multipart/form-data, field: "docs")
// Uploads files to Cloudinary and immediately submits a verification request.
const uploadVerificationDocs = asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        throw new ApiError(400, 'Please upload at least one document file')
    }
    if (req.user.role !== 'FARMER') {
        throw new ApiError(403, 'Only farmers can request verification')
    }
    if (req.user.verificationStatus === 'VERIFIED') {
        throw new ApiError(400, 'Your account is already verified')
    }

    // Upload all files to Cloudinary under the verificationDocs folder
    const docUrls = await uploadFiles(req.files, 'agrovista/verification-docs')

    // Reuse the existing service to set status → PENDING and store the URLs
    const result = await requestVerification(req.user._id, docUrls)
    res.json(new ApiResponse(200, result, 'Verification documents uploaded and request submitted'))
})

// GET /api/users/admin/email-verify?token=xxx
// Public endpoint — called when admin clicks Approve/Reject in their email.
// The token is a signed JWT (72h expiry) containing { farmerId, action }.
// Returns a styled HTML page so the admin sees a result in their browser.
const emailVerificationAction = asyncHandler(async (req, res) => {
    const { token } = req.query
    if (!token) return res.status(400).send(htmlResult('error', 'Missing token.'))

    let payload
    try {
        payload = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'fallback_secret')
    } catch (err) {
        const msg = err.name === 'TokenExpiredError'
            ? 'This link has expired (links are valid for 72 hours).'
            : 'Invalid or tampered token.'
        return res.status(400).send(htmlResult('error', msg))
    }

    const { farmerId, action } = payload
    if (!farmerId || !['APPROVE', 'REJECT'].includes(action)) {
        return res.status(400).send(htmlResult('error', 'Malformed token payload.'))
    }

    const farmer = await require('../../models/User').findById(farmerId)
    if (!farmer) return res.status(404).send(htmlResult('error', 'Farmer not found.'))

    if (farmer.verificationStatus !== 'PENDING') {
        const alreadyMsg = farmer.verificationStatus === 'VERIFIED'
            ? `${farmer.name} is already verified.`
            : `This request was already processed (status: ${farmer.verificationStatus}).`
        return res.status(400).send(htmlResult('info', alreadyMsg))
    }

    farmer.verificationStatus = action === 'APPROVE' ? 'VERIFIED' : 'REJECTED'
    farmer.verificationNote   = action === 'APPROVE' ? 'Approved via admin email.' : 'Rejected via admin email.'
    if (action === 'APPROVE') farmer.verifiedAt = new Date()
    await farmer.save()

    // In-app notification to farmer
    try {
        const { createNotification } = require('../notifications/notification.service')
        await createNotification({
            userId: farmerId,
            type: 'VERIFICATION_UPDATE',
            title: action === 'APPROVE' ? '✅ Verification Approved!' : '❌ Verification Rejected',
            body: action === 'APPROVE'
                ? 'Congratulations! Your farmer profile is now officially verified. A badge will appear on all your listings.'
                : 'Your verification request was not approved. Please re-submit with correct documents.'
        })
    } catch (err) {
        console.error('Notification error after email verify:', err.message)
    }

    const successMsg = action === 'APPROVE'
        ? `✅ ${farmer.name} has been verified successfully! They will receive an in-app notification.`
        : `❌ ${farmer.name}'s verification request has been rejected. They will receive an in-app notification.`

    return res.send(htmlResult(action === 'APPROVE' ? 'approve' : 'reject', successMsg))
})


function htmlResult(type, message) {
    const colors = {
        approve: { bg: '#f0fdf4', border: '#86efac', icon: '✅', title: 'Verification Approved', text: '#166534' },
        reject:  { bg: '#fff1f2', border: '#fca5a5', icon: '❌', title: 'Request Rejected',      text: '#991b1b' },
        error:   { bg: '#fefce8', border: '#fde68a', icon: '⚠️', title: 'Action Failed',         text: '#92400e' },
        info:    { bg: '#f0f9ff', border: '#bae6fd', icon: 'ℹ️', title: 'Already Processed',    text: '#0c4a6e' },
    }
    const c = colors[type] || colors.info
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>AgroVista Admin</title></head>
<body style="margin:0;background:#f0f7f0;font-family:'Segoe UI',Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="background:${c.bg};border:2px solid ${c.border};border-radius:16px;padding:40px 48px;max-width:480px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.08);">
    <div style="font-size:48px;margin-bottom:12px;">${c.icon}</div>
    <h2 style="margin:0 0 12px;color:${c.text};font-size:22px;font-weight:800;">${c.title}</h2>
    <p style="margin:0 0 24px;color:${c.text};font-size:15px;line-height:1.6;opacity:0.85;">${message}</p>
    <p style="margin:0;color:#52796f;font-size:12px;">AgroVista Admin · You can close this tab.</p>
  </div>
</body>
</html>`
}
const deleteAccount = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndDelete(req.user._id)

    if (!user) {
        throw new ApiError(404, 'User not found')
    }

    const COOKIE_OPTIONS = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    }

    res.clearCookie('refreshToken', COOKIE_OPTIONS)
    res.clearCookie('accessToken', COOKIE_OPTIONS)

    res.json(new ApiResponse(200, null, 'Account deleted successfully'))
})

module.exports = {
    getProfile,
    getUserReviews,
    getStats,
    updateProfile,
    updateRole,
    submitVerificationRequest,
    uploadVerificationDocs,
    emailVerificationAction,
    listPendingVerifications,
    processVerification,
    deleteAccount
}
