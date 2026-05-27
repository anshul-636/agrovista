const express = require('express')
const { register, login, refresh, logout, getMe } = require('./auth.controller')
const { verifyToken } = require('../../middleware/auth')

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.post('/refresh', refresh)
router.post('/logout', logout)
router.get('/me', verifyToken, getMe)

module.exports = router