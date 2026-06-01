const express = require('express')
const { verifyToken } = require('../../middleware/auth')
const { authorize } = require('../../middleware/authorize')
const {
    place,
    getBuyer,
    getFarmer,
    getOne,
    updateStatus,
    verifyDelivery,
    cancel,
    getMyOrders
} = require('./order.controller')

const router = express.Router()

router.use(verifyToken)

// IMPORTANT: specific routes before dynamic /:id routes
router.get('/buyer', authorize('BUYER'), getBuyer)
router.get('/farmer', authorize('FARMER'), getFarmer)
router.get('/my-orders', getMyOrders)

router.post('/', authorize('BUYER'), place)
router.get('/:id', getOne)
router.patch('/:id/status', authorize('FARMER'), updateStatus)
router.patch('/:id/verify', authorize('BUYER'), verifyDelivery)
router.post('/:id/cancel', authorize('BUYER'), cancel)

module.exports = router