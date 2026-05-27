const express = require('express')
const { verifyToken } = require('../../middleware/auth')
const { authorize } = require('../../middleware/authorize')
const { submit, getForFarmer } = require('./review.controller')

const router = express.Router()

// GET /api/reviews/:farmerId — public, anyone can see reviews
router.get('/:farmerId', getForFarmer)

// POST /api/reviews/:farmerId — BUYER only, must have DELIVERED order
router.post('/:farmerId', verifyToken, authorize('BUYER'), submit)

module.exports = router
