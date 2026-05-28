// The global error handler reads .statusCode and sends the right status.

class ApiError extends Error {
    constructor(statusCode, message) {
        super(message)
        this.statusCode = statusCode
        this.success = false
    }
}

module.exports = ApiError