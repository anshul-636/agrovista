const ApiError = require('../utils/ApiError')

const authorize = (...roles) => (req, res, next) => {
    if (!req.user) {
        throw new ApiError(401, 'Unauthorized - please log in first')
    }

    if (!roles.includes(req.user.role)) {
        throw new ApiError(
            403,
            'Forbidden - this action requires role: ' + roles.join(' or ')
        )
    }

    next()
}

module.exports = { authorize }