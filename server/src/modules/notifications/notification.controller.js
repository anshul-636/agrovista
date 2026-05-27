const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse = require('../../utils/ApiResponse')
const ApiError = require('../../utils/ApiError')
const { getNotifications, markOneRead, markAllRead } = require('./notification.service')

const getAll = asyncHandler(async (req, res) => {
    const data = await getNotifications(req.user._id)
    res.json(new ApiResponse(200, data, 'Notifications fetched'))
})

const readAll = asyncHandler(async (req, res) => {
    const result = await markAllRead(req.user._id)
    res.json(new ApiResponse(200, result, 'All notifications marked as read'))
})

const readOne = asyncHandler(async (req, res) => {
    const notif = await markOneRead(req.params.id, req.user._id)
    res.json(new ApiResponse(200, notif, 'Notification marked as read'))
})

module.exports = { getAll, readOne, readAll }
