const express = require('express')
const { verifyToken } = require('../../middleware/auth')
const { authorize } = require('../../middleware/authorize')
const { farmerAnalytics } = require('./analytics.controller')

const router = express.Router()

router.get('/farmer', verifyToken, authorize('FARMER'), farmerAnalytics)

module.exports = router