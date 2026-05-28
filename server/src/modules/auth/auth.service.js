const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../../models/User')
const ApiError = require('../../utils/ApiError')

const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    )

    const refreshToken = jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    )

    return { accessToken, refreshToken }
}


const registerUser = async ({ name, email, password, role }) => {
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
        throw new ApiError(409, 'An account with this email already exists')
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await User.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role
    })

    return user
}

const loginUser = async ({ email, password }) => {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash')

    if (!user) {
        throw new ApiError(401, 'Invalid email or password')
    }

    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid email or password')
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString())

    return {
        user: user.toJSON(),
        accessToken,
        refreshToken
    }
}

const refreshAccessToken = async (refreshToken) => {
    let decoded
    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    } catch (err) {
        throw new ApiError(401, 'Refresh token expired - please log in again')
    }

    const user = await User.findById(decoded.userId)
    if (!user) {
        throw new ApiError(401, 'User no longer exists')
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId)

    return { accessToken, newRefreshToken }
}

module.exports = { registerUser, loginUser, refreshAccessToken }