const express = require('express')
const { verifyToken } = require('../../middleware/auth')
const { createCheckoutOrder } = require('./checkout.controller')

const router = express.Router()

router.use(verifyToken)

router.post('/create-order', createCheckoutOrder)

module.exports = router
