const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse = require('../../utils/ApiResponse')
const ApiError = require('../../utils/ApiError')
const User = require('../../models/User')
const { getPublicProfile, getPublicStats } = require('./user.service')
const { getFarmerReviews } = require('../reviews/review.service')

const getProfile = asyncHandler(async (req, res) => {
    const profile = await getPublicProfile(req.params.id)
    res.json(new ApiResponse(200, profile, 'Profile fetched successfully'))
})

const getUserReviews = asyncHandler(async (req, res) => {
    const data = await getFarmerReviews(req.params.id)
    res.json(new ApiResponse(200, data, 'Reviews fetched successfully'))
})

const getStats = asyncHandler(async (req, res) => {
    const stats = await getPublicStats()
    res.json(new ApiResponse(200, stats, 'Public stats fetched successfully'))
})

const updateProfile = asyncHandler(async (req, res) => {
    const { name, phone, location, bio, avatar, latitude, longitude } = req.body

    const updates = {}

    if (typeof name === 'string') updates.name = name.trim()
    if (typeof phone === 'string') updates.phone = phone.trim()
    if (typeof location === 'string') updates.location = location.trim()
    if (typeof bio === 'string') updates.bio = bio.trim()
    if (typeof avatar === 'string') updates.avatar = avatar.trim()

    // If client provided explicit coordinates, store them (ensure numbers)
    if (latitude !== undefined && latitude !== null && latitude !== "") {
        const latNum = Number(latitude)
        if (!Number.isNaN(latNum)) updates.latitude = latNum
    }
    if (longitude !== undefined && longitude !== null && longitude !== "") {
        const lonNum = Number(longitude)
        if (!Number.isNaN(lonNum)) updates.longitude = lonNum
    }

    // If we have a textual location but no coords, attempt server-side geocoding
    if (updates.location && (updates.latitude === undefined || updates.longitude === undefined)) {
        try {
            const geocodeUrl = new URL('https://geocoding-api.open-meteo.com/v1/search')
            geocodeUrl.searchParams.set('name', updates.location)
            geocodeUrl.searchParams.set('count', '1')
            geocodeUrl.searchParams.set('language', 'en')
            geocodeUrl.searchParams.set('format', 'json')
            geocodeUrl.searchParams.set('country', 'IN')

            const geoRes = await fetch(geocodeUrl)
            if (geoRes.ok) {
                const geoData = await geoRes.json()
                const result = geoData?.results?.[0]
                if (result) {
                    updates.latitude = Number(result.latitude)
                    updates.longitude = Number(result.longitude)
                }
            }
        } catch (err) {
            // Non-fatal: leave coords unset if geocoding fails
        }
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true, runValidators: true }
    ).select('-passwordHash -__v')

    if (!user) {
        throw new ApiError(404, 'User not found')
    }

    res.json(new ApiResponse(200, user, 'Profile updated successfully'))
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

module.exports = { getProfile, getUserReviews, getStats, updateProfile, updateRole }
