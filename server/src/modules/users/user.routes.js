const express = require('express')
const { getProfile, getUserReviews } = require('./user.controller')

const router = express.Router()

// Both routes are public — no auth required
// GET /api/users/:id — public profile with trust score
router.get('/:id', getProfile)

// GET /api/users/:id/reviews — all farmer reviews
router.get('/:id/reviews', getUserReviews)

module.exports = router
