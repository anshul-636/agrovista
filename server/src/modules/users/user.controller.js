const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse = require('../../utils/ApiResponse')
const { getPublicProfile } = require('./user.service')
const { getFarmerReviews } = require('../reviews/review.service')

const getProfile = asyncHandler(async (req, res) => {
    const profile = await getPublicProfile(req.params.id)
    res.json(new ApiResponse(200, profile, 'Profile fetched successfully'))
})

const getUserReviews = asyncHandler(async (req, res) => {
    const data = await getFarmerReviews(req.params.id)
    res.json(new ApiResponse(200, data, 'Reviews fetched successfully'))
})

module.exports = { getProfile, getUserReviews }
