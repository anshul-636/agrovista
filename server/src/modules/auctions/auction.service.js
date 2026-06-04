const Auction = require('../../models/Auction')
const Bid = require('../../models/Bid')
const ApiError = require('../../utils/ApiError')
const { uploadToCloudinary } = require('../../config/cloudinary')

// ──────────────────────────────────────────────
// CREATE AUCTION (FARMER)
// ──────────────────────────────────────────────
const createAuction = async (farmerId, data, file) => {

    const { productName, description, category, quantity, unit, startingPrice, startTime, endTime,
            reservePrice, buyNowPrice, minBidIncrement } = data

    if (!productName || !description || !category || !quantity || !unit || !startingPrice || !startTime || !endTime) {
        throw new ApiError(400, 'All fields are required')
    }

    const start = new Date(startTime)
    const end = new Date(endTime)

    // Validate dates — new Date('bad string') gives Invalid Date
    if (isNaN(start.getTime())) {
        throw new ApiError(400, 'startTime is not a valid date. Use ISO format e.g. 2025-06-01T10:00:00')
    }
    if (isNaN(end.getTime())) {
        throw new ApiError(400, 'endTime is not a valid date. Use ISO format e.g. 2025-06-01T12:00:00')
    }
    if (end <= start) {
        throw new ApiError(400, 'End time must be after start time')
    }
    if (start < new Date()) {
        throw new ApiError(400, 'Start time must be in the future')
    }

    const parsedStarting  = parseFloat(startingPrice)
    const parsedReserve   = reservePrice  ? parseFloat(reservePrice)   : null
    const parsedBuyNow    = buyNowPrice   ? parseFloat(buyNowPrice)     : null
    const parsedIncrement = minBidIncrement ? parseInt(minBidIncrement) : 1

    // Sanity-check optional pricing fields
    if (parsedReserve !== null && parsedReserve < parsedStarting) {
        throw new ApiError(400, 'Reserve price cannot be lower than starting price')
    }
    if (parsedBuyNow !== null && parsedBuyNow <= parsedStarting) {
        throw new ApiError(400, 'Buy-Now price must be higher than starting price')
    }
    if (parsedReserve !== null && parsedBuyNow !== null && parsedBuyNow <= parsedReserve) {
        throw new ApiError(400, 'Buy-Now price must be higher than reserve price')
    }
    if (parsedIncrement < 1) {
        throw new ApiError(400, 'Minimum bid increment must be at least ₹1')
    }

    // Upload image to Cloudinary using the buffer (memoryStorage)
    let imageUrl = "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&q=80" // Premium crop layout fallback
    if (file) {
        const uploadResult = await uploadToCloudinary(file.buffer, 'agrovista/auctions')
        imageUrl = uploadResult.secure_url
    }

    const auction = await Auction.create({
        farmer: farmerId,
        productName,
        description,
        category,
        quantity: parseInt(quantity),
        unit,
        image: imageUrl,
        startingPrice: parsedStarting,
        reservePrice: parsedReserve,
        buyNowPrice: parsedBuyNow,
        minBidIncrement: parsedIncrement,
        reserveMet: false,
        startTime: start,
        endTime: end,
        status: 'UPCOMING'
    })

    await auction.populate('farmer', 'name avatar location verificationStatus')

    return auction
}

// ──────────────────────────────────────────────
// DELETE AUCTION (FARMER)
// ──────────────────────────────────────────────
const deleteAuction = async (auctionId, farmerId) => {
    const auction = await Auction.findById(auctionId)

    if (!auction) throw new ApiError(404, 'Auction not found')

    if (auction.farmer.toString() !== farmerId.toString()) {
        throw new ApiError(403, 'You can only delete your own auction')
    }

    await Bid.deleteMany({ auction: auctionId })
    await Auction.findByIdAndDelete(auctionId)

    try {
        const { getIO } = require('../../config/socket')
        getIO().to('auction:' + auctionId.toString()).emit('auction:deleted', {
            auctionId: auctionId.toString()
        })
    } catch (err) {
        console.error('Socket auction delete emit failed:', err.message)
    }

    return { deleted: true, auctionId: auctionId.toString() }
}

// ──────────────────────────────────────────────
// GET ALL AUCTIONS
// ──────────────────────────────────────────────
const getAllAuctions = async (query) => {
    const { status } = query

    const filter = {}
    if (status) filter.status = status

    const auctions = await Auction.find(filter)
        .populate('farmer', 'name avatar location verificationStatus')
        .populate('winner', 'name avatar')
        .sort({ endTime: 1 })   // soonest ending first

    return auctions
}

// ──────────────────────────────────────────────
// GET SINGLE AUCTION WITH BID HISTORY
// ──────────────────────────────────────────────
const getAuctionById = async (auctionId) => {
    const auction = await Auction.findById(auctionId)
        .populate('farmer', 'name avatar location verificationStatus')
        .populate('winner', 'name avatar')

    if (!auction) throw new ApiError(404, 'Auction not found')

    // Get last 20 bids, most recent first
    const bids = await Bid.find({ auction: auctionId })
        .populate('bidder', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(20)

    // Explicitly map bids to plain objects with bidderName at top level
    // so the frontend can reliably read it without traversing nested objects
    const plainBids = bids.map(b => {
        const plain = b.toJSON ? b.toJSON() : { ...b }
        return {
            ...plain,
            bidderName: plain.bidder?.name || plain.bidderName || 'Unknown',
            bidderAvatar: plain.bidder?.avatar || plain.bidderAvatar || null,
            // always expose createdAt as timestamp for frontend
            timestamp: plain.createdAt || plain.timestamp || new Date().toISOString(),
        }
    })

    return { ...auction.toJSON(), bids: plainBids }
}

// ──────────────────────────────────────────────
// PLACE BID (BUYER)
// ──────────────────────────────────────────────
const placeBid = async (auctionId, bidderId, amount) => {
    // We refetch the auction every time to get the current state
    const auction = await Auction.findById(auctionId)

    if (!auction) throw new ApiError(404, 'Auction not found')

    // Validation checks
    if (auction.status !== 'LIVE') {
        throw new ApiError(400, 'This auction is not live')
    }

    if (new Date() > auction.endTime) {
        throw new ApiError(400, 'This auction has already ended')
    }

    // Farmer cannot bid on their own auction
    if (auction.farmer.toString() === bidderId.toString()) {
        throw new ApiError(400, 'You cannot bid on your own auction')
    }

    const bidAmount = parseFloat(amount)

    // Check user's purse limit
    const bidder = await require('../../models/User').findById(bidderId)
    if (!bidder || bidAmount > (bidder.walletBalance || 0)) {
        throw new ApiError(400, `Purse Limit Exceeded! Your maximum available purse is ₹${(bidder.walletBalance || 0).toLocaleString()}`)
    }

    const increment = auction.minBidIncrement || 1

    // Bid must exceed current bid by at least minBidIncrement
    const minimumBid = auction.currentBid
        ? parseFloat(auction.currentBid) + increment
        : parseFloat(auction.startingPrice)

    if (bidAmount < minimumBid) {
        throw new ApiError(
            400,
            `Bid must be at least ₹${minimumBid}` +
            (auction.currentBid
                ? ` (current bid + ₹${increment} min increment)`
                : ' (starting price)')
        )
    }

    // ── Buy-Now: instant win if bidAmount >= buyNowPrice ───────────────────
    const isBuyNow = auction.buyNowPrice !== null &&
                     auction.buyNowPrice !== undefined &&
                     bidAmount >= auction.buyNowPrice

    // Save the bid
    const bid = await Bid.create({
        auction: auctionId,
        bidder: bidderId,
        amount: bidAmount
    })

    // Check whether the reserve price is now met
    const reserveMet = auction.reservePrice
        ? bidAmount >= auction.reservePrice
        : true   // no reserve = always met

    // Update auction state
    const auctionUpdate = {
        currentBid: bidAmount,
        reserveMet
    }

    if (isBuyNow) {
        // Instantly close the auction — buyer wins
        auctionUpdate.status  = 'ENDED'
        auctionUpdate.winner  = bidderId
        auctionUpdate.buyNowPrice = null   // consume so it can't fire again
    }

    await Auction.findByIdAndUpdate(auctionId, auctionUpdate)

    await bid.populate('bidder', 'name avatar')

    // Broadcast to all users watching this auction
    try {
        const { getIO } = require('../../config/socket')
        const io = getIO()

        io.to('auction:' + auctionId).emit('bid:new', {
            auctionId,
            bidId: bid._id,
            bidder: bid.bidder,
            amount: bidAmount,
            reserveMet,
            timestamp: bid.createdAt
        })

        if (isBuyNow) {
            io.to('auction:' + auctionId).emit('auction:ended', {
                auctionId,
                winner: bid.bidder,
                finalBid: bidAmount,
                reason: 'BUY_NOW'
            })
        }
    } catch (err) {
        console.error('Socket bid emit failed:', err.message)
    }

    return { bid, isBuyNow, reserveMet }
}

// ──────────────────────────────────────────────
// GET FARMER'S AUCTIONS
// ──────────────────────────────────────────────
const getFarmerAuctions = async (farmerId) => {
    const auctions = await Auction.find({ farmer: farmerId })
        .sort({ createdAt: -1 })

    return auctions
}

module.exports = {
    createAuction,
    deleteAuction,
    getAllAuctions,
    getAuctionById,
    placeBid,
    getFarmerAuctions
}
