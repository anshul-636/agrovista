require('dotenv').config()   // Load .env FIRST — before any other require

const app = require('./src/app')
const connectDB = require('./src/config/db')

const PORT = process.env.PORT || 5000

// Connect to MongoDB first, then start the server
// We don't want the server accepting requests before DB is ready
const startServer = async () => {
    await connectDB()

    app.listen(PORT, () => {
        console.log('')
        console.log('  ✅  AgroVista server is running')
        console.log('  🌐  http://localhost:' + PORT)
        console.log('  💚  Health check: http://localhost:' + PORT + '/health')
        console.log('')
    })
}

startServer()