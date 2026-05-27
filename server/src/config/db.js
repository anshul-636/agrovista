const mongoose = require('mongoose')

// connectDB is called once when the server starts
// Mongoose automatically manages the connection pool
// You never need to call connect() again after this

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI)

        console.log('  🍃  MongoDB connected: ' + conn.connection.host)
    } catch (error) {
        console.error('  ❌  MongoDB connection failed:', error.message)
        // Exit the process if DB connection fails
        // No point running the server without a database
        process.exit(1)
    }
}

module.exports = connectDB