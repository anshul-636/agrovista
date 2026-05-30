const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse = require('../../utils/ApiResponse')
const { getChatHistory, sendMessage } = require('./chat.service')

const getHistory = asyncHandler(async (req, res) => {
    const messages = await getChatHistory(req.params.orderId, req.user._id)
    res.json(new ApiResponse(200, messages, 'Chat history fetched'))
})

const send = asyncHandler(async (req, res) => {
    const { content } = req.body
    const file = req.file || null
    const message = await sendMessage(req.params.orderId, req.user._id, content, file)
    
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

module.exports = { getHistory, send }