require('dotenv').config()

const http = require('http')
const app = require('./src/app')
const connectDB = require('./src/config/db')
const { initSocket } = require('./src/config/socket')
const { startAuctionCron } = require('./src/jobs/auctionCron')

const PORT = process.env.PORT || 5000

const startServer = async () => {
    // Connect to MongoDB first
    await connectDB()

    // Create HTTP server from Express app
    // Socket.IO needs the raw http.Server, not Express directly
    const httpServer = http.createServer(app)

    // Initialize Socket.IO on the HTTP server
    initSocket(httpServer)

    // Start the cron job for auction expiry
    startAuctionCron()

    // Listen on the HTTP server (not app.listen)
    httpServer.listen(PORT, () => {
        console.log('')
        console.log('  ✅  AgroVista server is running')
        console.log('  🌐  http://localhost:' + PORT)
        console.log('  💚  Health check: http://localhost:' + PORT + '/health')
        console.log('  🔌  Socket.IO ready')
        console.log('')
    })
}

startServer()