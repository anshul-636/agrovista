const express = require('express')
const { register, login, refresh, logout, getMe } = require('./auth.controller')
const { verifyToken } = require('../../middleware/auth')
const { loginLimiter, registerLimiter, refreshLimiter } = require('../../middleware/rateLimiter')

const router = express.Router()

router.post('/register', registerLimiter, register)
router.post('/login', loginLimiter, login)
router.post('/refresh', refreshLimiter, refresh)
router.post('/logout', logout)
router.get('/me', verifyToken, getMe)

module.exports = router