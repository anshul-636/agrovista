const express = require('express')
const { verifyToken } = require('../../middleware/auth')
const { authorize } = require('../../middleware/authorize')
const {
    place,
    getBuyer,
    getFarmer,
    getOne,
    updateStatus,
    cancel
} = require('./order.controller')

const router = express.Router()

// All order routes require authentication
router.use(verifyToken)

// IMPORTANT: specific routes before dynamic /:id routes
router.get('/buyer', authorize('BUYER'), getBuyer)
router.get('/farmer', authorize('FARMER'), getFarmer)

router.post('/', authorize('BUYER'), place)
router.get('/:id', getOne)
router.patch('/:id/status', authorize('FARMER'), updateStatus)
router.post('/:id/cancel', authorize('BUYER'), cancel)

module.exports = router