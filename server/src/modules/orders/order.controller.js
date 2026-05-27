const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse = require('../../utils/ApiResponse')
const {
    placeOrder,
    getBuyerOrders,
    getFarmerOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder
} = require('./order.service')

// POST /api/orders — BUYER places an order
const place = asyncHandler(async (req, res) => {
    const order = await placeOrder(req.user._id, req.body)
    res.status(201).json(new ApiResponse(201, order, 'Order placed successfully'))
})

// GET /api/orders/buyer — BUYER sees their orders
const getBuyer = asyncHandler(async (req, res) => {
    const orders = await getBuyerOrders(req.user._id)
    res.json(new ApiResponse(200, orders, 'Orders fetched successfully'))
})

// GET /api/orders/farmer — FARMER sees incoming orders
const getFarmer = asyncHandler(async (req, res) => {
    const orders = await getFarmerOrders(req.user._id, req.query.status)
    res.json(new ApiResponse(200, orders, 'Orders fetched successfully'))
})

// GET /api/orders/:id — Both can view their own order
const getOne = asyncHandler(async (req, res) => {
    const order = await getOrderById(req.params.id, req.user._id)
    res.json(new ApiResponse(200, order, 'Order fetched successfully'))
})

// PATCH /api/orders/:id/status — FARMER updates status
const updateStatus = asyncHandler(async (req, res) => {
    const { status } = req.body
    if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required' })
    }
    const order = await updateOrderStatus(req.params.id, req.user._id, status)
    res.json(new ApiResponse(200, order, 'Order status updated to ' + status))
})

// POST /api/orders/:id/cancel — BUYER cancels
const cancel = asyncHandler(async (req, res) => {
    const order = await cancelOrder(req.params.id, req.user._id)
    res.json(new ApiResponse(200, order, 'Order cancelled successfully'))
})

module.exports = { place, getBuyer, getFarmer, getOne, updateStatus, cancel }