const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse = require('../../utils/ApiResponse')
const ApiError = require('../../utils/ApiError')
const { registerUser, loginUser, refreshAccessToken } = require('./auth.service')

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days in ms
}

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body

    if (!name || !email || !password || !role) {
        throw new ApiError(400, 'All fields are required: name, email, password, role')
    }

    if (!['FARMER', 'BUYER'].includes(role)) {
        throw new ApiError(400, 'Role must be FARMER or BUYER')
    }

    if (password.length < 6) {
        throw new ApiError(400, 'Password must be at least 6 characters')
    }

    const user = await registerUser({ name, email, password, role })

    res.status(201).json(
        new ApiResponse(201, user, 'Account created successfully')
    )
})

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required')
    }

    const { user, accessToken, refreshToken } = await loginUser({ email, password })

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)

    res.json(
        new ApiResponse(200, { user, accessToken }, 'Login successful')
    )
})

// POST /api/auth/refresh
const refresh = asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies

    const { accessToken, newRefreshToken } = await refreshAccessToken(refreshToken)

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS)

    res.json(
        new ApiResponse(200, { accessToken }, 'Token refreshed successfully')
    )
})

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
    res.clearCookie('refreshToken', COOKIE_OPTIONS)

    res.json(
        new ApiResponse(200, null, 'Logged out successfully')
    )
})

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
    res.json(
        new ApiResponse(200, req.user, 'User fetched successfully')
    )
})

module.exports = { register, login, refresh, logout, getMe }