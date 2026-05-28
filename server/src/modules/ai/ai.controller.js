const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse = require('../../utils/ApiResponse')
const { getPriceAdvice } = require('./ai.service')

const priceAdvisor = asyncHandler(async (req, res) => {
    const advice = await getPriceAdvice(req.body)
    res.json(new ApiResponse(200, advice, 'Price advice generated successfully'))
})

module.exports = { priceAdvisor }
