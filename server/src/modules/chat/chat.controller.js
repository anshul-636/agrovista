const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse  = require('../../utils/ApiResponse')
const { getChatHistory, sendMessage, clearChatHistory } = require('./chat.service')

const getHistory = asyncHandler(async (req, res) => {
    const messages = await getChatHistory(req.params.orderId, req.user._id)
    res.json(new ApiResponse(200, messages, 'Chat history fetched'))
})

const send = asyncHandler(async (req, res) => {
    const { content } = req.body
    const file        = req.file || null
    const message     = await sendMessage(req.params.orderId, req.user._id, content, file)

    // Broadcast to all users in the order room via socket
    const io = req.app.get('io')
    if (io) {
        io.to(`chat:${req.params.orderId}`).emit('chat:message', {
            ...message,
            orderId: req.params.orderId
        })
    }

    res.json(new ApiResponse(201, message, 'Message sent'))
})

// DELETE /api/chat/:orderId — clears all messages for this order
const clearHistory = asyncHandler(async (req, res) => {
    const result = await clearChatHistory(req.params.orderId, req.user._id)

    // Notify both parties in the room so their UI clears instantly
    const io = req.app.get('io')
    if (io) {
        io.to(`chat:${req.params.orderId}`).emit('chat:cleared', {
            orderId: req.params.orderId
        })
    }

    res.json(new ApiResponse(200, result, 'Chat cleared successfully'))
})

module.exports = { getHistory, send, clearHistory }