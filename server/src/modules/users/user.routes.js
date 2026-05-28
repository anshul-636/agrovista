const express = require('express')
const { getProfile, getUserReviews } = require('./user.controller')

const router = express.Router()

router.get('/:id', getProfile)

router.get('/:id/reviews', getUserReviews)

module.exports = router
