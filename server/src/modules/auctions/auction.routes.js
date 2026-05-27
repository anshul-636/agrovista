const express = require('express')
const { verifyToken } = require('../../middleware/auth')
const { authorize } = require('../../middleware/authorize')
const { upload } = require('../../config/cloudinary')
const { create, getAll, getMine, getOne, bid } = require('./auction.controller')

const router = express.Router()

// ── Public Routes ─────────────────────────────
router.get('/', getAll)

// IMPORTANT: /farmer/mine before /:id
router.get('/farmer/mine', verifyToken, authorize('FARMER'), getMine)

router.get('/:id', getOne)

// ── Protected Routes ──────────────────────────
// upload.single('image') = one image, field name = 'image'
router.post('/', verifyToken, authorize('FARMER'), upload.single('image'), create)
router.post('/:id/bid', verifyToken, authorize('BUYER'), bid)

module.exports = router