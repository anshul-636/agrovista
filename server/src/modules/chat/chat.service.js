const Message = require('../../models/Message')
const Order = require('../../models/Order')
const ApiError = require('../../utils/ApiError')

// ──────────────────────────────────────────────
// GET CHAT HISTORY FOR AN ORDER
// ──────────────────────────────────────────────
const getChatHistory = async (orderId, userId) => {
    // Verify user is part of this order
    const order = await Order.findById(orderId)

    if (!order) throw new ApiError(404, 'Order not found')

    const isBuyer = order.buyer.toString() === userId.toString()
    const isFarmer = order.farmer.toString() === userId.toString()

    if (!isBuyer && !isFarmer) {
        throw new ApiError(403, 'You do not have access to this chat')
    }

    const messages = await Message.find({ order: orderId })
        .populate('sender', 'name avatar role')
        .sort({ createdAt: 1 })   // oldest first for chat display

    return messages
}

module.exports = { getChatHistory }