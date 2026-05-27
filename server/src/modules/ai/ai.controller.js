const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse = require('../../utils/ApiResponse')
const { getPriceAdvice } = require('./ai.service')

// POST /api/ai/price-advisor
// FARMER only — sends product info, gets AI price suggestion
const priceAdvisor = asyncHandler(async (req, res) => {
    const advice = await getPriceAdvice(req.body)
    res.json(new ApiResponse(200, advice, 'Price advice generated successfully'))
})

module.exports = { priceAdvisor }
