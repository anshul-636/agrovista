require('dotenv').config()

const http = require('http')
const app = require('./src/app')
const connectDB = require('./src/config/db')
const { initSocket } = require('./src/config/socket')
const { startAuctionCron } = require('./src/jobs/auctionCron')

const PORT = process.env.PORT || 5000

const startServer = async () => {
    await connectDB()

    const httpServer = http.createServer(app)

    const io = initSocket(httpServer)
    app.set('io', io)

    startAuctionCron()

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