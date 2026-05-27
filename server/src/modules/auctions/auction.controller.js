const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse = require('../../utils/ApiResponse')
const ApiError = require('../../utils/ApiError')
const {
    createAuction,
    getAllAuctions,
    getAuctionById,
    placeBid,
    getFarmerAuctions
} = require('./auction.service')

// POST /api/auctions — FARMER creates auction
const create = asyncHandler(async (req, res) => {
    // req.file is a single file (not array) — auction has one image
    const auction = await createAuction(req.user._id, req.body, req.file)
    res.status(201).json(new ApiResponse(201, auction, 'Auction created successfully'))
})

// GET /api/auctions — public, all auctions
const getAll = asyncHandler(async (req, res) => {
    const auctions = await getAllAuctions(req.query)
    res.json(new ApiResponse(200, auctions, 'Auctions fetched successfully'))
})

// GET /api/auctions/farmer/mine — FARMER's own auctions
const getMine = asyncHandler(async (req, res) => {
    const auctions = await getFarmerAuctions(req.user._id)
    res.json(new ApiResponse(200, auctions, 'Your auctions fetched successfully'))
})

// GET /api/auctions/:id — single auction with bid history
const getOne = asyncHandler(async (req, res) => {
    const auction = await getAuctionById(req.params.id)
    res.json(new ApiResponse(200, auction, 'Auction fetched successfully'))
})

// POST /api/auctions/:id/bid — BUYER places a bid
const bid = asyncHandler(async (req, res) => {
    const { amount } = req.body

    if (!amount) throw new ApiError(400, 'Bid amount is required')
    if (parseFloat(amount) <= 0) throw new ApiError(400, 'Bid amount must be positive')

    const result = await placeBid(req.params.id, req.user._id, amount)
    res.status(201).json(new ApiResponse(201, result, 'Bid placed successfully'))
})

module.exports = { create, getAll, getMine, getOne, bid }