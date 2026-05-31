const Message = require('../../models/Message')
const Order = require('../../models/Order')
const ApiError = require('../../utils/ApiError')
const { uploadToCloudinary } = require('../../config/cloudinary')

const getChatHistory = async (orderId, userId) => {
    const order = await Order.findById(orderId)
    if (!order) throw new ApiError(404, 'Order not found')

    const isBuyer  = order.buyer.toString()  === userId.toString()
    const isFarmer = order.farmer.toString() === userId.toString()
    if (!isBuyer && !isFarmer) throw new ApiError(403, 'You do not have access to this chat')

    const messages = await Message.find({ order: orderId })
        .populate('sender', 'name avatar role')
        .sort({ createdAt: 1 })

    return messages.map(m => ({
        id:         m._id,
        orderId:    m.order,
        senderId:   m.sender?._id  || m.sender,
        senderName: m.sender?.name || 'Unknown',
        senderRole: m.sender?.role || 'BUYER',
        content:    m.content,
        imageUrl:   m.imageUrl || null,
        createdAt:  m.createdAt,
        status:     'read'
    }))
}

const sendMessage = async (orderId, userId, content, file) => {
    const order = await Order.findById(orderId)
    if (!order) throw new ApiError(404, 'Order not found')

    const isBuyer  = order.buyer.toString()  === userId.toString()
    const isFarmer = order.farmer.toString() === userId.toString()
    if (!isBuyer && !isFarmer) throw new ApiError(403, 'You are not part of this order')

    if (!content?.trim() && !file) throw new ApiError(400, 'Message content or image is required')

    let imageUrl = null
    if (file) {
        const result = await uploadToCloudinary(file.buffer, 'agrovista/chat')
        imageUrl = result.secure_url
    }

    const message = await Message.create({
        order:   orderId,
        sender:  userId,
        content: content?.trim() || '',
        imageUrl
    })

    await message.populate('sender', 'name avatar role')

    return {
        id:         message._id,
        orderId:    message.order,
        senderId:   message.sender?._id  || message.sender,
        senderName: message.sender?.name || 'Unknown',
        senderRole: message.sender?.role || 'BUYER',
        content:    message.content,
        imageUrl:   message.imageUrl || null,
        createdAt:  message.createdAt,
        status:     'sent'
    }
}

// ── CLEAR CHAT ────────────────────────────────────────────────────────────────
// Deletes all messages for an order. Only the buyer or farmer of that order
// can trigger this — verified before deletion.
const clearChatHistory = async (orderId, userId) => {
    const order = await Order.findById(orderId)
    if (!order) throw new ApiError(404, 'Order not found')

    const isBuyer  = order.buyer.toString()  === userId.toString()
    const isFarmer = order.farmer.toString() === userId.toString()
    if (!isBuyer && !isFarmer) throw new ApiError(403, 'You cannot clear this chat')

    const result = await Message.deleteMany({ order: orderId })
    return { deleted: result.deletedCount }
}

module.exports = { getChatHistory, sendMessage, clearChatHistory }