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


    io.on('connection', (socket) => {
        console.log('Socket connected: user', socket.userId)

        socket.join('user:' + socket.userId)


        socket.on('join:auction', ({ auctionId }) => {
            socket.join('auction:' + auctionId)
            console.log('User', socket.userId, 'joined auction:', auctionId)
            try {
                const room = io.sockets.adapter.rooms.get('auction:' + auctionId)
                const count = room ? room.size : 0
                io.to('auction:' + auctionId).emit('auction:participants', { auctionId, count })
            } catch (e) {}
        })

        socket.on('leave:auction', ({ auctionId }) => {
            socket.leave('auction:' + auctionId)
            try {
                const room = io.sockets.adapter.rooms.get('auction:' + auctionId)
                const count = room ? room.size : 0
                io.to('auction:' + auctionId).emit('auction:participants', { auctionId, count })
            } catch (e) {}
        })


        socket.on('join:chat', async ({ orderId }) => {
            try {
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


        socket.on('send:message', async ({ orderId, content }) => {
            try {
                if (!content || !content.trim()) return

                const order = await Order.findById(orderId)
                if (!order) return

                const isBuyer = order.buyer.toString() === socket.userId
                const isFarmer = order.farmer.toString() === socket.userId

                if (!isBuyer && !isFarmer) return

                const message = await Message.create({
                    order: orderId,
                    sender: socket.userId,
                    content: content.trim()
                })

                await message.populate('sender', 'name avatar role')

                io.to('chat:' + orderId).emit('chat:message', {
                    id: message._id,
                    orderId,
                    senderId: message.sender?._id || socket.userId,
                    senderName: message.sender?.name || 'Unknown',
                    senderRole: message.sender?.role || 'BUYER',
                    content: message.content,
                    imageUrl: message.imageUrl || null,
                    createdAt: message.createdAt,
                    status: 'sent'
                })
            } catch (err) {
                console.error('send:message error:', err.message)
            }
        })

        // ── DISCONNECT ───────────────────────────────
        socket.on('disconnect', () => {
            console.log('Socket disconnected: user', socket.userId)
            // Notify auction rooms this socket was in about updated participant counts
            try {
                for (const r of socket.rooms) {
                    if (typeof r === 'string' && r.startsWith('auction:')) {
                        const room = io.sockets.adapter.rooms.get(r)
                        const count = room ? room.size : 0
                        io.to(r).emit('auction:participants', { auctionId: r.replace('auction:', ''), count })
                    }
                }
            } catch (e) {}
        })
    })

    return io
}

const getIO = () => {
    if (!io) throw new Error('Socket.IO not initialized. Call initSocket first.')
    return io
}

module.exports = { initSocket, getIO }