const express = require('express')
const { verifyToken } = require('../../middleware/auth')
const { createPayment, verifyPayment, handleWebhook } = require('./payment.controller')

const router = express.Router()

// Authenticated routes
router.post('/create', verifyToken, createPayment)
router.post('/verify', verifyToken, verifyPayment)

// Public Webhook (Razorpay will call this without token)
router.post('/webhook', handleWebhook)

module.exports = router
