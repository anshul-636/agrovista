// Consistent response shape for every API response.
// Every success response: { success: true, data: {...}, message: "..." }

class ApiResponse {
    constructor(statusCode, data, message = 'Success') {
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400
    }
}

module.exports = ApiResponse