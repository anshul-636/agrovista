const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse = require('../../utils/ApiResponse')
const { submitReview, getFarmerReviews } = require('./review.service')

// POST /api/reviews/:farmerId
const submit = asyncHandler(async (req, res) => {
    const review = await submitReview(req.user._id, req.params.farmerId, req.body)
    res.status(201).json(new ApiResponse(201, review, 'Review submitted successfully'))
})

// GET /api/reviews/:farmerId
const getForFarmer = asyncHandler(async (req, res) => {
    const data = await getFarmerReviews(req.params.farmerId)
    res.json(new ApiResponse(200, data, 'Reviews fetched successfully'))
})

module.exports = { submit, getForFarmer }
