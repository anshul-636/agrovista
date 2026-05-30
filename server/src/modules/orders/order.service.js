const Order = require('../../models/Order')
const Product = require('../../models/Product')
const ApiError = require('../../utils/ApiError')
const { getIO } = require('../../config/socket')

const emitOrderUpdate = async (order, extra = {}) => {
    try {
        const io = getIO()
        const payload = {
            orderId: order._id.toString(),
            status: order.status,
            buyerId: order.buyer.toString(),
            farmerId: order.farmer.toString(),
            productId: order.product.toString(),
            ...extra
        }

        io.to('user:' + order.buyer.toString()).emit('order:updated', payload)
        io.to('user:' + order.farmer.toString()).emit('order:updated', payload)
    } catch (err) {
        console.error('Order update socket emit failed:', err.message)
    }
}

// ──────────────────────────────────────────────
// STATE MACHINE
// Defines which status transitions are allowed.
// An order can only move FORWARD, never backward.
// ──────────────────────────────────────────────
const VALID_TRANSITIONS = {
    PENDING: ['ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['PACKED', 'CANCELLED'],
    PACKED: ['DISPATCHED'],
    DISPATCHED: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: []
}

const validateTransition = (current, next) => {
    if (!VALID_TRANSITIONS[current].includes(next)) {
        throw new ApiError(
            400,
            'Cannot move order from ' + current + ' to ' + next +
            '. Allowed: ' + (VALID_TRANSITIONS[current].join(', ') || 'none')
        )
    }
}

// ──────────────────────────────────────────────
// PLACE ORDER (BUYER)
// ──────────────────────────────────────────────
const placeOrder = async (buyerId, data) => {
    const { productId, quantity, deliveryAddress, deliveryNotes } = data

    if (!productId || !quantity || !deliveryAddress) {
        throw new ApiError(400, 'Required: productId, quantity, deliveryAddress')
    }

    // Fetch the product to verify it exists and has enough stock
    const product = await Product.findById(productId).populate('farmer', 'name')

    if (!product) throw new ApiError(404, 'Product not found')
    if (!product.isAvailable) throw new ApiError(400, 'Product is not available')
    if (product.quantity < parseInt(quantity)) {
        throw new ApiError(400, 'Not enough stock. Available: ' + product.quantity + ' ' + product.unit)
    }

    // Buyer cannot order their own product
    if (product.farmer._id.toString() === buyerId.toString()) {
        throw new ApiError(400, 'You cannot order your own product')
    }

    // Price snapshotting: save the price AT THE TIME of order
    // Even if farmer changes price later, this order keeps the original price
    const unitPrice = product.price
    const totalAmount = unitPrice * parseInt(quantity)

    const order = await Order.create({
        buyer: buyerId,
        farmer: product.farmer._id,
        product: productId,
        quantity: parseInt(quantity),
        unitPrice,
        totalAmount,
        deliveryAddress,
        deliveryNotes: deliveryNotes || null
    })

    // Reduce product stock
    await Product.findByIdAndUpdate(productId, {
        $inc: { quantity: -parseInt(quantity) }
    })

    // Populate and return full order details
    await order.populate([
        { path: 'buyer', select: 'name email' },
        { path: 'farmer', select: 'name email' },
        { path: 'product', select: 'name images unit price' }
    ])

    try {
        const io = getIO()
        io.to('user:' + product.farmer._id.toString()).emit('order:new', {
            _id: order._id,
            id: order._id,
            status: order.status,
            quantity: order.quantity,
            totalAmount: order.totalAmount,
            unitPrice: order.unitPrice,
            createdAt: order.createdAt,
            productId: product._id,
            productName: product.name,
            product: {
                _id: product._id,
                name: product.name,
                unit: product.unit,
                images: product.images
            },
            buyerId: order.buyer._id,
            buyerName: order.buyer.name,
            buyer: {
                _id: order.buyer._id,
                name: order.buyer.name,
                email: order.buyer.email
            },
            farmerId: product.farmer._id,
            farmerName: product.farmer.name
        })
    } catch (err) {
        console.error('Order notification socket emit failed:', err.message)
    }

    return order
}

// ──────────────────────────────────────────────
// GET BUYER'S ORDERS
// ──────────────────────────────────────────────
const getBuyerOrders = async (buyerId) => {
    const orders = await Order.find({ buyer: buyerId })
        .populate('product', 'name images unit')
        .populate('farmer', 'name avatar')
        .sort({ createdAt: -1 })

    return orders
}

// ──────────────────────────────────────────────
// GET FARMER'S INCOMING ORDERS
// ──────────────────────────────────────────────
const getFarmerOrders = async (farmerId, statusFilter) => {
    const filter = { farmer: farmerId }
    if (statusFilter) filter.status = statusFilter

    const orders = await Order.find(filter)
        .populate('product', 'name images unit')
        .populate('buyer', 'name email avatar')
        .sort({ createdAt: -1 })

    return orders
}

// ──────────────────────────────────────────────
// GET SINGLE ORDER
// ──────────────────────────────────────────────
const getOrderById = async (orderId, userId) => {
    const order = await Order.findById(orderId)
        .populate('product', 'name images unit price')
        .populate('buyer', 'name email avatar')
        .populate('farmer', 'name email avatar')

    if (!order) throw new ApiError(404, 'Order not found')

    // Only buyer or farmer of this order can view it
    const isBuyer = order.buyer._id.toString() === userId.toString()
    const isFarmer = order.farmer._id.toString() === userId.toString()

    if (!isBuyer && !isFarmer) {
        throw new ApiError(403, 'You do not have access to this order')
    }

    return order
}

// ──────────────────────────────────────────────
// UPDATE ORDER STATUS (FARMER)
// ──────────────────────────────────────────────
const updateOrderStatus = async (orderId, farmerId, newStatus) => {
    const order = await Order.findById(orderId)

    if (!order) throw new ApiError(404, 'Order not found')

    if (order.farmer.toString() !== farmerId.toString()) {
        throw new ApiError(403, 'You can only update your own orders')
    }

    validateTransition(order.status, newStatus)

    // Block farmer from progressing to DELIVERED
    if (newStatus === 'DELIVERED') {
        throw new ApiError(403, 'Only the buyer can verify and confirm delivery')
    }

    order.status = newStatus
    await order.save()

    await order.populate([
        { path: 'buyer', select: 'name email' },
        { path: 'product', select: 'name images' }
    ])

    // Real-time push + MongoDB Notification
    try {
        const { createNotification } = require('../notifications/notification.service')
        
        await createNotification({
            userId: order.buyer._id,
            type: 'ORDER_UPDATE',
            title: `Order ${newStatus}`,
            body: `Your order for ${order.product.name} is now ${newStatus}.`
        })
    } catch (err) {
        console.error('Notification failed:', err.message)
    }

    await emitOrderUpdate(order, {
        productName: order.product.name,
        source: 'farmer-status'
    })

    return order
}

// ──────────────────────────────────────────────
// VERIFY DELIVERY (BUYER)
// ──────────────────────────────────────────────
const verifyOrderDelivery = async (orderId, buyerId) => {
    const order = await Order.findById(orderId)

    if (!order) throw new ApiError(404, 'Order not found')

    if (order.buyer.toString() !== buyerId.toString()) {
        throw new ApiError(403, 'You can only verify your own orders')
    }

    if (order.status !== 'DISPATCHED') {
        throw new ApiError(400, 'Order must be DISPATCHED before you can verify delivery')
    }

    validateTransition(order.status, 'DELIVERED')

    order.status = 'DELIVERED'
    await order.save()

    await order.populate([
        { path: 'buyer', select: 'name email' },
        { path: 'farmer', select: 'name email' },
        { path: 'product', select: 'name images' }
    ])

    // Real-time push + MongoDB Notification
    try {
        const { createNotification } = require('../notifications/notification.service')
        
        await createNotification({
            userId: order.farmer._id,
            type: 'ORDER_DELIVERED',
            title: 'Action Completed: Delivery Verified',
            body: `Buyer has verified delivery for ${order.product.name}. Funds released!`
        })
    } catch (err) {
        console.error('Notification failed:', err.message)
    }

    await emitOrderUpdate(order, {
        productName: order.product.name,
        source: 'buyer-verify'
    })

    return order
}

// ──────────────────────────────────────────────
// CANCEL ORDER (BUYER)
// ──────────────────────────────────────────────
const cancelOrder = async (orderId, buyerId) => {
    const order = await Order.findById(orderId)

    if (!order) throw new ApiError(404, 'Order not found')

    if (order.buyer.toString() !== buyerId.toString()) {
        throw new ApiError(403, 'You can only cancel your own orders')
    }

    // Buyer can cancel before the order is packed or shipped
    if (!['PENDING', 'ACCEPTED'].includes(order.status)) {
        throw new ApiError(400, 'You can only cancel orders before they are packed or shipped')
    }

    order.status = 'CANCELLED'
    await order.save()

    // Restore product stock when order is cancelled
    await Product.findByIdAndUpdate(order.product, {
        $inc: { quantity: order.quantity }
    })

    await emitOrderUpdate(order, {
        productName: order.product.toString(),
        source: 'buyer-cancel'
    })

    return order
}

module.exports = {
    placeOrder,
    getBuyerOrders,
    getFarmerOrders,
    getOrderById,
    updateOrderStatus,
    verifyOrderDelivery,
    cancelOrder
}