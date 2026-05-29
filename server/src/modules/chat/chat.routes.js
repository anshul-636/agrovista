const express = require('express')
const { verifyToken } = require('../../middleware/auth')
const { upload } = require('../../config/cloudinary')
const { getHistory, send } = require('./chat.controller')

const router = express.Router()

router.get('/:orderId', verifyToken, getHistory)
router.post('/:orderId', verifyToken, upload.single('image'), send)

module.exports = router