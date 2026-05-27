const mongoose = require('mongoose')

// Logs every price change as an immutable record.
// When a farmer changes a product price, the OLD price is saved here.
// This enables the 30-day price trend chart on the frontend.

const priceHistorySchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        recordedAt: {
            type: Date,
            default: Date.now
        }
    }
)

// Compound index for fast time-range queries per product
priceHistorySchema.index({ product: 1, recordedAt: -1 })

const PriceHistory = mongoose.model('PriceHistory', priceHistorySchema)
module.exports = PriceHistory