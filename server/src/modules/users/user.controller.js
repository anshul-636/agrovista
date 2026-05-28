const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse = require('../../utils/ApiResponse')
const ApiError = require('../../utils/ApiError')
const User = require('../../models/User')
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

const updateRole = asyncHandler(async (req, res) => {
    const { role } = req.body
    
    if (!role || !['FARMER', 'BUYER'].includes(role)) {
        throw new ApiError(400, 'Role must be FARMER or BUYER')
    }
    
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { role },
        { new: true }
    ).select('-passwordHash -__v')
    
    if (!user) {
        throw new ApiError(404, 'User not found')
    }
    
    res.json(new ApiResponse(200, user, 'Role updated successfully'))
})

module.exports = { getProfile, getUserReviews, updateRole }
