const express = require('express')
const { getProfile, getUserReviews, getStats, updateProfile, updateRole } = require('./user.controller')
const { verifyToken } = require('../../middleware/auth')

const router = express.Router()

router.get('/stats', getStats)
router.patch('/me', verifyToken, updateProfile)
router.put('/me/role', verifyToken, updateRole)
router.get('/:id', getProfile)
router.get('/:id/reviews', getUserReviews)

module.exports = router
