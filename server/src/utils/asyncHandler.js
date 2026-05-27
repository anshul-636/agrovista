// Wraps async route handlers so you never need try/catch in controllers.
// Any error thrown inside an async controller gets passed to Express
// error handler automatically via next(error).

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = asyncHandler