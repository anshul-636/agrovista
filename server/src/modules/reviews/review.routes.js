const express = require('express')
const { verifyToken } = require('../../middleware/auth')
const { authorize } = require('../../middleware/authorize')
const { submit, getForFarmer } = require('./review.controller')

const router = express.Router()

router.get('/:farmerId', getForFarmer)

router.post('/:farmerId', verifyToken, authorize('BUYER'), submit)

module.exports = router
