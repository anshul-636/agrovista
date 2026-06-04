const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema(
    {
        giver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        // Each review is tied to the specific order it was written for.
        // This allows one review per order (not per farmer), so a buyer
        // who has multiple orders from the same farmer can leave a review
        // for each one independently.
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: String
    },
    {
        timestamps: true
    }
)

// One review per order — prevents duplicate submissions for the same order
// while allowing the same buyer to review the same farmer across different orders.
reviewSchema.index({ giver: 1, order: 1 }, { unique: true })

// Fast lookup of all reviews for a farmer
reviewSchema.index({ receiver: 1 })

const Review = mongoose.model('Review', reviewSchema)
module.exports = Review