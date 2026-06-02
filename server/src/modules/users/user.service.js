const User = require('../../models/User')
const Review = require('../../models/Review')
const Order = require('../../models/Order')
const Product = require('../../models/Product')
const Auction = require('../../models/Auction')
const ApiError = require('../../utils/ApiError')
const { normalizeLocation } = require('../auth/auth.service')

// ──────────────────────────────────────────────
// TRUST SCORE CALCULATION
// Formula:
//   40 points → average star rating (out of 5)
//   40 points → order completion rate
//   20 points → base score (everyone starts with 20)
//
// Example: 4.5 rating + 80% completion = 36 + 32 + 20 = 88/100
// ──────────────────────────────────────────────
const getTrustScore = async (farmerId) => {
    // Run both aggregations at the same time
    const [reviewStats, orderStats] = await Promise.all([
        // Average rating for this farmer
        Review.aggregate([
            { $match: { receiver: farmerId } },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 }
                }
            }
        ]),

        // Order counts grouped by status
        Order.aggregate([
            { $match: { farmer: farmerId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ])
    ])

    // Calculate rating score (0 to 40)
    const avgRating = reviewStats[0]?.avgRating || 0
    const totalReviews = reviewStats[0]?.totalReviews || 0
    const ratingScore = (avgRating / 5) * 40

    // Calculate completion rate score (0 to 40)
    const totalOrders = orderStats.reduce((sum, s) => sum + s.count, 0)
    const deliveredCount = orderStats.find(s => s._id === 'DELIVERED')?.count || 0
    const completionRate = totalOrders > 0 ? deliveredCount / totalOrders : 0
    const completionScore = completionRate * 40

    // Base score = 20
    const trustScore = Math.round(ratingScore + completionScore + 20)

    return {
        trustScore,
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews,
        completionRate: Math.round(completionRate * 100)
    }
}

// ──────────────────────────────────────────────
// GET PUBLIC PROFILE
// ──────────────────────────────────────────────
const getPublicProfile = async (userId) => {
    const user = await User.findById(userId).select('-passwordHash')

    if (!user) throw new ApiError(404, 'User not found')

    const trustData = await getTrustScore(user._id)
    const productCount = await Product.countDocuments({
        farmer: userId,
        isAvailable: true
    })

    return { ...user.toJSON(), ...trustData, productCount }
}

// ──────────────────────────────────────────────
// PUBLIC STATS
// ✅ FIX: Use $toLower in the aggregation so that any old un-normalized
// location strings (e.g. "Kanpur" saved before the auth fix) are still
// deduplicated correctly when counting distinct cities.
// ──────────────────────────────────────────────
const getPublicStats = async () => {
    const [farmers, buyers, products, auctions, cityAgg] = await Promise.all([
        User.countDocuments({ role: 'FARMER' }),
        User.countDocuments({ role: 'BUYER' }),
        Product.countDocuments({ isAvailable: true }),
        Auction.countDocuments({}),

        // ✅ FIX: Aggregate with $toLower so "Kanpur" and "kanpur" are the
        // same city, regardless of how old records were stored.
        User.aggregate([
            { $match: { location: { $exists: true, $ne: '' } } },
            {
                $group: {
                    _id: { $toLower: { $trim: { input: '$location' } } }
                }
            },
            { $count: 'total' }
        ])
    ])

    return {
        farmers,
        buyers,
        products,
        auctions,
        cities: cityAgg[0]?.total || 0
    }
}

// ──────────────────────────────────────────────
// REQUEST VERIFICATION (FARMER)
// Farmer submits document URLs and moves status to PENDING.
// On repeated submission (e.g. after rejection) it resets to PENDING.
// ──────────────────────────────────────────────
const requestVerification = async (farmerId, docUrls) => {
    const farmer = await User.findById(farmerId)
    if (!farmer) throw new ApiError(404, 'User not found')
    if (farmer.role !== 'FARMER') throw new ApiError(403, 'Only farmers can request verification')
    if (farmer.verificationStatus === 'VERIFIED') {
        throw new ApiError(400, 'Your account is already verified')
    }
    if (!Array.isArray(docUrls) || docUrls.length === 0) {
        throw new ApiError(400, 'Please provide at least one document URL')
    }

    farmer.verificationStatus = 'PENDING'
    farmer.verificationDocs   = docUrls
    farmer.verificationNote   = ''
    await farmer.save()

    return { verificationStatus: farmer.verificationStatus }
}

// ──────────────────────────────────────────────
// ADMIN: REVIEW VERIFICATION REQUEST
// action = 'APPROVE' | 'REJECT'
// note   = optional admin message
// ──────────────────────────────────────────────
const reviewVerification = async (adminUserId, farmerId, action, note) => {
    const admin = await User.findById(adminUserId)
    if (!admin) throw new ApiError(404, 'Admin user not found')

    // Admin check: ADMIN_EMAILS env var (comma-separated) or future ADMIN role
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
    const isAdmin = admin.role === 'ADMIN' || adminEmails.includes(admin.email.toLowerCase())
    if (!isAdmin) throw new ApiError(403, 'Admin access required')

    const farmer = await User.findById(farmerId)
    if (!farmer) throw new ApiError(404, 'Farmer not found')
    if (farmer.verificationStatus !== 'PENDING') {
        throw new ApiError(400, 'No pending verification request for this farmer')
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
        throw new ApiError(400, 'action must be APPROVE or REJECT')
    }

    farmer.verificationStatus = action === 'APPROVE' ? 'VERIFIED' : 'REJECTED'
    farmer.verificationNote   = note || ''
    if (action === 'APPROVE') farmer.verifiedAt = new Date()

    await farmer.save()

    // Notify the farmer in-app
    try {
        const { createNotification } = require('../notifications/notification.service')
        await createNotification({
            userId: farmerId,
            type: 'VERIFICATION_UPDATE',
            title: action === 'APPROVE' ? '✅ Verification Approved!' : '❌ Verification Rejected',
            body: action === 'APPROVE'
                ? 'Congratulations! Your farmer profile is now officially verified. A badge will appear on all your listings.'
                : `Your verification request was not approved. Reason: ${note || 'Please re-submit with correct documents.'}`
        })
    } catch (err) {
        console.error('Verification notification failed:', err.message)
    }

    return {
        farmerId,
        verificationStatus: farmer.verificationStatus,
        verifiedAt: farmer.verifiedAt,
        note: farmer.verificationNote
    }
}

// ──────────────────────────────────────────────
// ADMIN: LIST ALL PENDING VERIFICATIONS
// ──────────────────────────────────────────────
const getPendingVerifications = async (adminUserId) => {
    const admin = await User.findById(adminUserId)
    if (!admin) throw new ApiError(404, 'Admin user not found')

    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
    const isAdmin = admin.role === 'ADMIN' || adminEmails.includes(admin.email.toLowerCase())
    if (!isAdmin) throw new ApiError(403, 'Admin access required')

    const pending = await User.find({ verificationStatus: 'PENDING', role: 'FARMER' })
        .select('name email location verificationDocs verificationStatus createdAt')
        .sort({ updatedAt: 1 })  // oldest first (FIFO queue)

    return pending
}

module.exports = { getTrustScore, getPublicProfile, getPublicStats, requestVerification, reviewVerification, getPendingVerifications }