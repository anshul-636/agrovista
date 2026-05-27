const mongoose = require('mongoose')

// Each document = one buyer wishlisting one product.
// The unique compound index prevents the same buyer
// from wishlisting the same product twice.

const wishlistSchema = new mongoose.Schema(
    {
        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        }
    },
    {
        timestamps: true
    }
)

// Prevents duplicate wishlisting at the database level
wishlistSchema.index({ buyer: 1, product: 1 }, { unique: true })

const Wishlist = mongoose.model('Wishlist', wishlistSchema)
module.exports = Wishlist