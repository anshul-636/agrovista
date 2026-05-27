const express = require('express')
const { verifyToken } = require('../../middleware/auth')
const { authorize } = require('../../middleware/authorize')
const { priceAdvisor } = require('./ai.controller')

const router = express.Router()

// POST /api/ai/price-advisor — FARMER only
// Body: { productName, category, quantity, unit, location, description }
router.post('/price-advisor', verifyToken, authorize('FARMER'), priceAdvisor)

module.exports = router
