const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse = require('../../utils/ApiResponse')
const ApiError = require('../../utils/ApiError')
const { registerUser, loginUser, refreshAccessToken, generateTokens } = require('./auth.service')

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // 'strict' blocks cross-origin cookies — frontend and backend are on different
    // domains (Vercel vs Render), so the browser silently drops the cookie.
    // 'none' allows cross-origin but REQUIRES secure:true (HTTPS), which Render provides.
    // In local dev we use 'lax' since both run on localhost.
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000   // 7 days
}

const register = asyncHandler(async (req, res) => {
    const { name, email, password, role, phone, location } = req.body

    if (!name || !email || !password || !role) {
        throw new ApiError(400, 'All fields are required: name, email, password, role')
    }

    if (!['FARMER', 'BUYER'].includes(role)) {
        throw new ApiError(400, 'Role must be FARMER or BUYER')
    }

    if (password.length < 6) {
        throw new ApiError(400, 'Password must be at least 6 characters')
    }

    const user = await registerUser({ name, email, password, role, phone, location })

    const { accessToken, refreshToken } = generateTokens(user._id.toString())

    // ✅ FIX: Set refresh cookie on register, same as login
    // Without this, the 15-min access token expires and the user gets silently logged out
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)

    res.status(201).json(
        new ApiResponse(201, { user: user.toJSON(), accessToken, refreshToken }, 'Account created successfully')
    )
})

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required')
    }

    const { user, accessToken, refreshToken } = await loginUser({ email, password })

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)

    // Also return refreshToken in body — cookie alone fails on cross-origin deploys
    // (e.g. Vercel frontend + Render backend) due to SameSite restrictions.
    // Client stores it in localStorage as a reliable fallback.
    res.json(
        new ApiResponse(200, { user, accessToken, refreshToken }, 'Login successful')
    )
})

const refresh = asyncHandler(async (req, res) => {
    // Try cookie first (same-origin / local dev), then body (cross-origin fallback)
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken

    const { accessToken, newRefreshToken } = await refreshAccessToken(refreshToken)

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS)

    res.json(
        new ApiResponse(200, { accessToken }, 'Token refreshed successfully')
    )
})

const logout = asyncHandler(async (req, res) => {
    res.clearCookie('refreshToken', COOKIE_OPTIONS)
    res.json(
        new ApiResponse(200, null, 'Logged out successfully')
    )
})

const getMe = asyncHandler(async (req, res) => {
    res.json(
        new ApiResponse(200, req.user, 'User fetched successfully')
    )
})

module.exports = { register, login, refresh, logout, getMe }