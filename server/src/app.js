const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const passport = require('./config/passport')
const { apiLimiter } = require('./middleware/rateLimiter')

const authRoutes = require('./modules/auth/auth.routes')
const oauthRoutes = require('./modules/auth/oauth.routes')
const productRoutes = require('./modules/products/product.routes')
const orderRoutes = require('./modules/orders/order.routes')
const analyticsRoutes = require('./modules/analytics/analytics.routes')
const auctionRoutes = require('./modules/auctions/auction.routes')
const chatRoutes = require('./modules/chat/chat.routes')
const wishlistRoutes = require('./modules/wishlist/wishlist.routes')
const aiRoutes = require('./modules/ai/ai.routes')
const reviewRoutes = require('./modules/reviews/review.routes')
const notificationRoutes = require('./modules/notifications/notification.routes')
const userRoutes = require('./modules/users/user.routes')

const app = express()

app.set('trust proxy', 1)

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(session({
    secret: process.env.SESSION_SECRET || 'agrovista-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}))
app.use(passport.initialize())
app.use(passport.session())



app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'AgroVista API is running',
        timestamp: new Date().toISOString()
    })
})

app.get("/", (req, res) => {
    res.send("Agrovista backend running");
});

// Global rate limiter — applied to every /api/* route before any handler runs
app.use('/api', apiLimiter)

app.use('/api/auth', authRoutes)
app.use('/api/auth', oauthRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/auctions', auctionRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/users', userRoutes)


app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    })
})

app.use((err, req, res, next) => {
    // Must have exactly 4 params for Express to recognize it as error handler
    console.error('[Error]', err.statusCode || 500, err.message)

    // Mongoose validation (e.g. required field missing)
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message)
        return res.status(400).json({ success: false, message: messages.join(', ') })
    }

    // MongoDB duplicate key (e.g. duplicate email)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0]
        return res.status(409).json({ success: false, message: `${field} already exists` })
    }

    // Mongoose invalid ObjectId
    if (err.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid ID format' })
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid token' })
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired, please log in again' })
    }

    // Multer file too large
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large. Maximum size is 5MB' })
    }

    // Multer unexpected field
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ success: false, message: `Unexpected file field: ${err.field}` })
    }

    const statusCode = err.statusCode || 500
    const message = err.message || 'Internal server error'

    // In dev, include stack trace for debugging
    const response = { success: false, message }
    if (process.env.NODE_ENV === 'development' && statusCode === 500) {
        response.stack = err.stack
    }

    res.status(statusCode).json(response)
})

module.exports = app