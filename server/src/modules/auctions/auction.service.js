const Auction = require('../../models/Auction')
const Bid = require('../../models/Bid')
const ApiError = require('../../utils/ApiError')
const { uploadToCloudinary } = require('../../config/cloudinary')

// ──────────────────────────────────────────────
// CREATE AUCTION (FARMER)
// ──────────────────────────────────────────────
const createAuction = async (farmerId, data, file) => {
    if (!file) throw new ApiError(400, 'Auction image is required')

    const { productName, description, category, quantity, unit, startingPrice, startTime, endTime } = data

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

    // Upload image to Cloudinary using the buffer (memoryStorage)
    const uploadResult = await uploadToCloudinary(file.buffer, 'agrovista/auctions')
    const imageUrl = uploadResult.secure_url

    const auction = await Auction.create({
        farmer: farmerId,
        productName,
        description,
        category,
        quantity: parseInt(quantity),
        unit,
        image: imageUrl,
        startingPrice: parseFloat(startingPrice),
        startTime: start,
        endTime: end,
        status: 'UPCOMING'
    })

    await auction.populate('farmer', 'name avatar location')

    return auction
}

// ──────────────────────────────────────────────
// GET ALL AUCTIONS
// ──────────────────────────────────────────────
const getAllAuctions = async (query) => {
    const { status } = query

    const filter = {}
    if (status) filter.status = status

    const auctions = await Auction.find(filter)
        .populate('farmer', 'name avatar location')
        .populate('winner', 'name avatar')
        .sort({ endTime: 1 })   // soonest ending first

    return auctions
}

// ──────────────────────────────────────────────
// GET SINGLE AUCTION WITH BID HISTORY
// ──────────────────────────────────────────────
const getAuctionById = async (auctionId) => {
    const auction = await Auction.findById(auctionId)
        .populate('farmer', 'name avatar location')
        .populate('winner', 'name avatar')

    if (!auction) throw new ApiError(404, 'Auction not found')

    // Get last 20 bids, most recent first
    const bids = await Bid.find({ auction: auctionId })
        .populate('bidder', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(20)

    return { ...auction.toJSON(), bids }
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

    // Bid must be higher than current bid (or starting price if no bids yet)
    const minimumBid = auction.currentBid
        ? parseFloat(auction.currentBid) + 1
        : parseFloat(auction.startingPrice)

    if (bidAmount < minimumBid) {
        throw new ApiError(
            400,
            'Bid must be at least ₹' + minimumBid +
            (auction.currentBid ? ' (current bid + ₹1)' : ' (starting price)')
        )
    }

    // Save the bid
    const bid = await Bid.create({
        auction: auctionId,
        bidder: bidderId,
        amount: bidAmount
    })

    // Update auction's current bid
    await Auction.findByIdAndUpdate(auctionId, {
        currentBid: bidAmount
    })

    await bid.populate('bidder', 'name avatar')

    // Broadcast to all users watching this auction
    try {
        const { getIO } = require('../../config/socket')
        getIO().to('auction:' + auctionId).emit('bid:new', {
            auctionId,
            bidId: bid._id,
            bidder: bid.bidder,
            amount: bidAmount,
            timestamp: bid.createdAt
        })
    } catch (err) {
        console.error('Socket bid emit failed:', err.message)
    }

    return bid
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
    getAllAuctions,
    getAuctionById,
    placeBid,
    getFarmerAuctions
}