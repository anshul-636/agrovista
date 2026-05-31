const express = require('express')
const { verifyToken } = require('../../middleware/auth')
const { upload }      = require('../../config/cloudinary')
const { getHistory, send, clearHistory } = require('./chat.controller')

const router = express.Router()

router.get   ('/:orderId',        verifyToken, getHistory)
router.post  ('/:orderId',        verifyToken, upload.single('image'), send)
router.delete('/:orderId/clear',  verifyToken, clearHistory)   // ← NEW

module.exports = router