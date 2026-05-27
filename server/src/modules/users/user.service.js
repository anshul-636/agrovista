const User = require('../../models/User')
const Review = require('../../models/Review')
const Order = require('../../models/Order')
const ApiError = require('../../utils/ApiError')

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
    const productCount = await require('../../models/Product').countDocuments({
        farmer: userId,
        isAvailable: true
    })

    return { ...user.toJSON(), ...trustData, productCount }
}

module.exports = { getTrustScore, getPublicProfile }