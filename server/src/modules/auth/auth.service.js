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

// ─── GEOCODE HELPER ───────────────────────────────────────────────────────────
// Turns a text location like "Nashik, Maharashtra" into { latitude, longitude }
// Uses the free Open-Meteo geocoding API — no key needed
const geocodeLocation = async (location) => {
    if (!location || typeof location !== 'string' || !location.trim()) return null
    try {
        const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
        url.searchParams.set('name', location.trim())
        url.searchParams.set('count', '1')
        url.searchParams.set('language', 'en')
        url.searchParams.set('format', 'json')
        url.searchParams.set('country', 'IN')

        const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
        if (!res.ok) return null
        const data = await res.json()
        const result = data?.results?.[0]
        if (!result) return null
        return {
            latitude: Number(result.latitude),
            longitude: Number(result.longitude)
        }
    } catch {
        // Non-fatal — if geocoding fails, user can still register
        return null
    }
}
// ─────────────────────────────────────────────────────────────────────────────

const registerUser = async ({ name, email, password, role, phone, location }) => {
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
        throw new ApiError(409, 'An account with this email already exists')
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // Geocode location at signup so coords are available immediately
    // (runs in parallel with hashing isn't needed since hash is synchronous at this point,
    //  but we await both here for clarity)
    const coords = location ? await geocodeLocation(location) : null

    const user = await User.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        phone,
        location,
        // If geocoding succeeded, save coords right away —
        // the user won't need to visit their profile to get map features working
        ...(coords && {
            latitude: coords.latitude,
            longitude: coords.longitude,
        })
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
    if (!refreshToken) {
        throw new ApiError(401, 'No refresh token provided — please log in again')
    }

    let decoded
    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    } catch {
        throw new ApiError(401, 'Refresh token expired — please log in again')
    }

    const user = await User.findById(decoded.userId)
    if (!user) {
        throw new ApiError(401, 'User no longer exists')
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId)

    return { accessToken, newRefreshToken }
}

module.exports = { registerUser, loginUser, refreshAccessToken, generateTokens }