const express = require('express')
const { verifyToken } = require('../../middleware/auth')
const { authorize } = require('../../middleware/authorize')
const { upload } = require('../../config/cloudinary')
const { create, getAll, getMine, getOne, bid, remove } = require('./auction.controller')
const { checkout, initiatePayment, verifyPayment } = require('./auctionCheckout.controller')

const router = express.Router()

router.get('/', getAll)

// IMPORTANT: specific routes before /:id
router.get('/farmer/mine', verifyToken, authorize('FARMER'), getMine)

// ── Auction order routes (post-auction winner flow) ──────────────────
// Create an order from a won auction (winner only)
router.post('/orders/:orderId/payment', verifyToken, authorize('BUYER'), initiatePayment)
router.post('/orders/:orderId/verify-payment', verifyToken, authorize('BUYER'), verifyPayment)

router.get('/:id', getOne)

router.post('/', verifyToken, authorize('FARMER'), upload.single('image'), create)
router.post('/:id/bid', verifyToken, authorize('BUYER'), bid)
router.post('/:id/checkout', verifyToken, authorize('BUYER'), checkout)
router.delete('/:id', verifyToken, authorize('FARMER'), remove)

module.exports = router