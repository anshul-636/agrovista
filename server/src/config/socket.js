const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const Message = require('../models/Message')
const Order = require('../models/Order')

let io

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            credentials: true
        }
    })

    // ──────────────────────────────────────────────
    // AUTH MIDDLEWARE
    // Runs before every connection is established.
    // Verifies the JWT token sent in socket.handshake.auth.token
    // If token is invalid, connection is rejected.
    // ──────────────────────────────────────────────
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token

            if (!token) {
                return next(new Error('Authentication error - no token'))
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            socket.userId = decoded.userId
            next()
        } catch (err) {
            next(new Error('Authentication error - invalid token'))
        }
    })

    // ──────────────────────────────────────────────
    // CONNECTION HANDLER
    // Runs when a client successfully connects
    // ──────────────────────────────────────────────
    io.on('connection', (socket) => {
        console.log('Socket connected: user', socket.userId)

        // Every user automatically joins their personal private room
        // This room is used for order updates and price drop alerts
        socket.join('user:' + socket.userId)

        // ── AUCTION ROOM ─────────────────────────────
        // Client emits this when they open an auction page
        socket.on('join:auction', ({ auctionId }) => {
            socket.join('auction:' + auctionId)
            console.log('User', socket.userId, 'joined auction:', auctionId)
        })

        socket.on('leave:auction', ({ auctionId }) => {
            socket.leave('auction:' + auctionId)
        })

        // ── CHAT ROOM ────────────────────────────────
        // Client emits this when they open the chat panel for an order
        socket.on('join:chat', async ({ orderId }) => {
            try {
                // Verify this user is actually the buyer or farmer of this order
                const order = await Order.findById(orderId)

                if (!order) return

                const isBuyer = order.buyer.toString() === socket.userId
                const isFarmer = order.farmer.toString() === socket.userId

                if (!isBuyer && !isFarmer) {
                    socket.emit('error', { message: 'Not authorized for this chat' })
                    return
                }

                socket.join('chat:' + orderId)
                console.log('User', socket.userId, 'joined chat for order:', orderId)
            } catch (err) {
                console.error('join:chat error:', err.message)
            }
        })

        // ── SEND MESSAGE ─────────────────────────────
        // Client emits this when they send a chat message
        socket.on('send:message', async ({ orderId, content }) => {
            try {
                if (!content || !content.trim()) return

                // Verify user is part of this order
                const order = await Order.findById(orderId)
                if (!order) return

                const isBuyer = order.buyer.toString() === socket.userId
                const isFarmer = order.farmer.toString() === socket.userId

                if (!isBuyer && !isFarmer) return

                // Save message to MongoDB
                const message = await Message.create({
                    order: orderId,
                    sender: socket.userId,
                    content: content.trim()
                })

                // Populate sender info for the response
                await message.populate('sender', 'name avatar')

                // Broadcast to BOTH users in the chat room
                io.to('chat:' + orderId).emit('chat:message', {
                    _id: message._id,
                    content: message.content,
                    sender: message.sender,
                    createdAt: message.createdAt
                })
            } catch (err) {
                console.error('send:message error:', err.message)
            }
        })

        // ── DISCONNECT ───────────────────────────────
        socket.on('disconnect', () => {
            console.log('Socket disconnected: user', socket.userId)
        })
    })

    return io
}

// getIO is called from anywhere in the app to emit events
// Example: getIO().to('user:abc').emit('order:updated', data)
const getIO = () => {
    if (!io) throw new Error('Socket.IO not initialized. Call initSocket first.')
    return io
}

module.exports = { initSocket, getIO }