const express = require('express')
const { verifyToken } = require('../../middleware/auth')
const { getHistory } = require('./chat.controller')

const router = express.Router()

router.get('/:orderId', verifyToken, getHistory)

module.exports = router