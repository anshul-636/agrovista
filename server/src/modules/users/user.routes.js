const express = require('express')
const { getProfile, getUserReviews, updateRole } = require('./user.controller')
const { verifyToken } = require('../../middleware/auth')

const router = express.Router()

router.get('/:id', getProfile)
router.get('/:id/reviews', getUserReviews)

// Update user role (requires auth)
router.put('/me/role', verifyToken, updateRole)

module.exports = router
