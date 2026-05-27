const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../../models/User')
const ApiError = require('../../utils/ApiError')

// Helper: generates access token + refresh token pair
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

// ──────────────────────────────────────────────
// REGISTER
// ──────────────────────────────────────────────
const registerUser = async ({ name, email, password, role }) => {
    // Check if email already registered
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
        throw new ApiError(409, 'An account with this email already exists')
    }

    // Hash password — 12 salt rounds is secure and reasonably fast
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user in MongoDB
    const user = await User.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role
    })

    // Return user without passwordHash (toJSON method strips it)
    return user
}

// ──────────────────────────────────────────────
// LOGIN
// ──────────────────────────────────────────────
const loginUser = async ({ email, password }) => {
    // We need passwordHash here to compare — use .select('+passwordHash')
    // because the schema has select: false on passwordHash
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash')

    // Same error for "user not found" and "wrong password"
    // This prevents user enumeration attacks
    if (!user) {
        throw new ApiError(401, 'Invalid email or password')
    }

    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid email or password')
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString())

    // user.toJSON() automatically strips passwordHash
    return {
        user: user.toJSON(),
        accessToken,
        refreshToken
    }
}

// ──────────────────────────────────────────────
// REFRESH TOKEN
// ──────────────────────────────────────────────
const refreshAccessToken = async (refreshToken) => {
    if (!refreshToken) {
        throw new ApiError(401, 'No refresh token provided')
    }

    let decoded
    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    } catch (err) {
        throw new ApiError(401, 'Refresh token expired - please log in again')
    }

    // Verify user still exists in DB
    const user = await User.findById(decoded.userId)
    if (!user) {
        throw new ApiError(401, 'User no longer exists')
    }

    // Rotate tokens — issue a completely new pair
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId)

    return { accessToken, newRefreshToken }
}

module.exports = { registerUser, loginUser, refreshAccessToken }