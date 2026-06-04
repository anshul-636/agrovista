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

// Index for fast lookups (non-unique — multiple reviews per buyer-farmer pair are allowed)
reviewSchema.index({ giver: 1, receiver: 1 })

const Review = mongoose.model('Review', reviewSchema)
module.exports = Review