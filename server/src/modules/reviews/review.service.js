const Review = require('../../models/Review')
const Order = require('../../models/Order')
const ApiError = require('../../utils/ApiError')


const submitReview = async (buyerId, farmerId, { rating, comment }) => {
    if (!rating) throw new ApiError(400, 'Rating is required')
    if (rating < 1 || rating > 5) throw new ApiError(400, 'Rating must be between 1 and 5')

    // Verify buyer has a completed order from this farmer
    const deliveredOrder = await Order.findOne({
        buyer: buyerId,
        farmer: farmerId,
        status: 'DELIVERED'
    })

    if (!deliveredOrder) {
        throw new ApiError(
            403,
            'You can only review a farmer after a DELIVERED order from them'
        )
    }

    // Always create a new review — each submission is a separate entry
    const review = await Review.create({
        giver: buyerId,
        receiver: farmerId,
        rating: parseInt(rating),
        comment: comment || ''
    })

    await review.populate('giver', 'name avatar')

    return review
}


const getFarmerReviews = async (farmerId) => {
    const reviews = await Review.find({ receiver: farmerId })
        .populate('giver', 'name avatar')
        .sort({ createdAt: -1 })

    // Calculate summary stats
    const total = reviews.length
    const avgRating = total > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / total) * 10) / 10
        : 0

    return { reviews, total, avgRating }
}

module.exports = { submitReview, getFarmerReviews }
