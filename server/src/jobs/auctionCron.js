const cron = require('node-cron')
const Auction = require('../models/Auction')
const Bid = require('../models/Bid')

const startAuctionCron = () => {
    // Runs every minute: '* * * * *'
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date()

            // Start UPCOMING auctions that have reached their startTime
            const toStart = await Auction.find({
                status: 'UPCOMING',
                startTime: { $lte: now }
            })

            for (const auction of toStart) {
                await Auction.findByIdAndUpdate(auction._id, { status: 'LIVE' })
                console.log('Auction started:', auction.productName)

                // Notify everyone watching this auction
                try {
                    const { getIO } = require('../config/socket')
                    getIO().to('auction:' + auction._id.toString()).emit('auction:started', {
                        auctionId: auction._id
                    })
                } catch (e) { }
            }

            // Close LIVE auctions that have passed their endTime
            const toClose = await Auction.find({
                status: 'LIVE',
                endTime: { $lte: now }
            })

            for (const auction of toClose) {
                // Find the highest bid for this auction
                const highestBid = await Bid.findOne({ auction: auction._id })
                    .sort({ amount: -1 })
                    .populate('bidder', 'name')

                await Auction.findByIdAndUpdate(auction._id, {
                    status: 'ENDED',
                    winner: highestBid ? highestBid.bidder._id : null
                })

                console.log('Auction ended:', auction.productName,
                    highestBid ? 'Winner: ' + highestBid.bidder.name : 'No bids')

                // Notify the winner so they know to complete checkout
                if (highestBid) {
                    try {
                        const { createNotification } = require('../modules/notifications/notification.service')
                        await createNotification({
                            userId: highestBid.bidder._id,
                            type: 'ORDER_UPDATE',
                            title: '🏆 You Won the Auction!',
                            body: `Congratulations! You won "${auction.productName}" at ₹${highestBid.amount}/unit. Please complete your payment to confirm the order.`
                        })
                    } catch (e) {
                        console.error('Winner notification failed:', e.message)
                    }
                }

                try {
                    const { getIO } = require('../config/socket')
                    getIO().to('auction:' + auction._id.toString()).emit('auction:ended', {
                        auctionId: auction._id,
                        winner: highestBid ? highestBid.bidder : null,
                        finalPrice: highestBid ? highestBid.amount : null
                    })
                } catch (e) { }
            }
        } catch (err) {
            console.error('Auction cron error:', err.message)
        }
    })

    console.log('  ⏰  Auction cron job started (runs every minute)')
}

module.exports = { startAuctionCron }