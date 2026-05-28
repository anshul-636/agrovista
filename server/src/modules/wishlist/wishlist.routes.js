const express = require('express')
const { verifyToken } = require('../../middleware/auth')
const { authorize } = require('../../middleware/authorize')
const { add, remove, getAll, check } = require('./wishlist.controller')

const router = express.Router()

router.use(verifyToken, authorize('BUYER'))

router.get('/', getAll)
router.post('/:productId', add)
router.delete('/:productId', remove)
router.get('/:productId/check', check)

module.exports = router