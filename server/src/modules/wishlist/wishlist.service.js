const Wishlist = require('../../models/Wishlist')
const Product = require('../../models/Product')
const PriceHistory = require('../../models/PriceHistory')
const ApiError = require('../../utils/ApiError')

// ──────────────────────────────────────────────
// ADD TO WISHLIST
// ──────────────────────────────────────────────
const addToWishlist = async (buyerId, productId) => {
    const product = await Product.findById(productId)
    if (!product) throw new ApiError(404, 'Product not found')

    // upsert: create if not exists, do nothing if already wishlisted
    // This makes the endpoint idempotent — no error if clicked twice
    await Wishlist.findOneAndUpdate(
        { buyer: buyerId, product: productId },
        { buyer: buyerId, product: productId },
        { upsert: true, new: true }
    )

    return { message: 'Added to wishlist' }
}

// ──────────────────────────────────────────────
// REMOVE FROM WISHLIST
// ──────────────────────────────────────────────
const removeFromWishlist = async (buyerId, productId) => {
    await Wishlist.findOneAndDelete({ buyer: buyerId, product: productId })
    return { message: 'Removed from wishlist' }
}

// ──────────────────────────────────────────────
// GET BUYER'S WISHLIST
// ──────────────────────────────────────────────
const getWishlist = async (buyerId) => {
    const wishlist = await Wishlist.find({ buyer: buyerId })
        .populate({
            path: 'product',
            populate: { path: 'farmer', select: 'name avatar' }
        })
        .sort({ createdAt: -1 })

    return wishlist
}

// ──────────────────────────────────────────────
// CHECK IF PRODUCT IS WISHLISTED
// ──────────────────────────────────────────────
const checkWishlist = async (buyerId, productId) => {
    const item = await Wishlist.findOne({ buyer: buyerId, product: productId })
    return { isWishlisted: !!item }
}

// ──────────────────────────────────────────────
// PRICE DROP FAN-OUT
// Called from product.service.js when a farmer lowers a price.
// Finds all buyers who wishlisted this product and notifies them.
// This is the pub/sub pattern.
// ──────────────────────────────────────────────
const notifyPriceDrop = async (productId, oldPrice, newPrice, productName, farmerName) => {
    // Find all buyers who wishlisted this product
    const wishlisters = await Wishlist.find({ product: productId }).select('buyer')

    if (wishlisters.length === 0) return

    // Save price history
    await PriceHistory.create({ product: productId, price: oldPrice })

    // Fan-out: emit to each wishlister's personal Socket.IO room
    try {
        const { getIO } = require('../../config/socket')
        const io = getIO()

        wishlisters.forEach(({ buyer }) => {
            io.to('user:' + buyer.toString()).emit('price:drop', {
                productId,
                productName,
                farmerName,
                oldPrice,
                newPrice,
                discount: Math.round(((oldPrice - newPrice) / oldPrice) * 100)
            })
        })

        console.log('Price drop notification sent to', wishlisters.length, 'buyers')
    } catch (err) {
        console.error('Price drop notification failed:', err.message)
    }
}

module.exports = {
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    checkWishlist,
    notifyPriceDrop
}