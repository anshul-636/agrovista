const express = require('express')
const { verifyToken } = require('../../middleware/auth')
const { authorize } = require('../../middleware/authorize')
const { upload } = require('../../config/cloudinary')
const {
    create,
    getAll,
    getMine,
    getOne,
    update,
    remove,
    getPriceHistoryHandler
} = require('./product.controller')

const router = express.Router()

router.get('/', getAll)

// CRITICAL: /farmer/mine MUST come before /:id
// If /:id is first, Express treats the word "farmer" as an ID
router.get('/farmer/mine', verifyToken, authorize('FARMER'), getMine)

router.get('/:id', getOne)
router.get('/:id/price-history', getPriceHistoryHandler)

router.post('/', verifyToken, authorize('FARMER'), upload.array('images', 5), create)
router.put('/:id', verifyToken, authorize('FARMER'), upload.array('images', 5), update)
router.delete('/:id', verifyToken, authorize('FARMER'), remove)

module.exports = router