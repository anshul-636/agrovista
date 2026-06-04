const Review = require('../../models/Review')
const Order = require('../../models/Order')
const ApiError = require('../../utils/ApiError')


const submitReview = async (buyerId, farmerId, { rating, comment, orderId }) => {
    if (!rating) throw new ApiError(400, 'Rating is required')
    if (rating < 1 || rating > 5) throw new ApiError(400, 'Rating must be between 1 and 5')
    if (!orderId) throw new ApiError(400, 'Order ID is required')

    // Verify this specific order belongs to the buyer, is from this farmer, and is DELIVERED
    const deliveredOrder = await Order.findOne({
        _id: orderId,
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

    // Check if a review for THIS specific order already exists
    const existing = await Review.findOne({ giver: buyerId, order: orderId })
    if (existing) {
        throw new ApiError(409, 'You have already reviewed this order')
    }

    const review = await Review.create({
        giver: buyerId,
        receiver: farmerId,
        order: orderId,
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
