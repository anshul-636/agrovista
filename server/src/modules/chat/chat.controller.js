const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse = require('../../utils/ApiResponse')
const { getChatHistory } = require('./chat.service')

const getHistory = asyncHandler(async (req, res) => {
    const messages = await getChatHistory(req.params.orderId, req.user._id)
    res.json(new ApiResponse(200, messages, 'Chat history fetched'))
})

module.exports = { getHistory }