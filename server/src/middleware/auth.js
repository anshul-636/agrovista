const jwt = require('jsonwebtoken')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const User = require('../models/User')

const verifyToken = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new ApiError(401, 'Unauthorized - no token provided')
    }

    const token = authHeader.split(' ')[1]

    let decoded
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
        throw new ApiError(401, 'Unauthorized - invalid or expired token')
    }

    // Fetch user from MongoDB
    // .select('+passwordHash') would include it — without +, it stays excluded
    const user = await User.findById(decoded.userId).select('-passwordHash -__v')

    if (!user) {
        throw new ApiError(401, 'Unauthorized - user no longer exists')
    }

    req.user = user
    next()
})

module.exports = { verifyToken }