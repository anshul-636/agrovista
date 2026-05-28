const express = require('express')
const { verifyToken } = require('../../middleware/auth')
const { getAll, readOne, readAll } = require('./notification.controller')

const router = express.Router()

router.use(verifyToken)

router.get('/', getAll)

// CRITICAL: /read-all MUST come before /:id/read
// Express would treat "read-all" as an :id param otherwise
router.patch('/read-all', readAll)
router.patch('/:id/read', readOne)

module.exports = router
