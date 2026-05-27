const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse = require('../../utils/ApiResponse')
const { getFarmerAnalytics } = require('./analytics.service')

const farmerAnalytics = asyncHandler(async (req, res) => {
    const data = await getFarmerAnalytics(req.user._id)
    res.json(new ApiResponse(200, data, 'Analytics fetched successfully'))
})

module.exports = { farmerAnalytics }