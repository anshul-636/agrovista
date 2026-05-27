const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')

const authRoutes = require('./modules/auth/auth.routes')
const productRoutes = require('./modules/products/product.routes')

const app = express()

// ── Middlewares ──────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}))

// ── Health Check ─────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'AgroVista API is running',
        timestamp: new Date().toISOString()
    })
})

// ── Routes ───────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)

// ── 404 Handler ──────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found: ' + req.method + ' ' + req.originalUrl
    })
})

// ── Global Error Handler ──────────────────────
// Must have exactly 4 params for Express to recognize it as error handler
app.use((err, req, res, next) => {
    console.error('[Error]', err.message)

    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message)
        return res.status(400).json({ success: false, message: messages.join(', ') })
    }

    // Handle Mongoose duplicate key errors (e.g. duplicate email)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0]
        return res.status(409).json({
            success: false,
            message: field + ' already exists'
        })
    }

    // Handle Mongoose invalid ObjectId errors
    if (err.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid ID format' })
    }

    const statusCode = err.statusCode || 500
    const message = err.message || 'Internal server error'

    res.status(statusCode).json({ success: false, message })
})

module.exports = app