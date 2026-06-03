const Auction = require('../../models/Auction')
const Bid = require('../../models/Bid')
const Order = require('../../models/Order')
const Razorpay = require('razorpay')
const crypto = require('crypto')
const ApiError = require('../../utils/ApiError')

// ──────────────────────────────────────────────
// CREATE AUCTION ORDER  (called by winner)
// ──────────────────────────────────────────────
const createAuctionOrder = async (auctionId, buyerId, data) => {
    const { paymentMethod, deliveryAddress, deliveryNotes } = data

    if (!paymentMethod || !deliveryAddress) {
        throw new ApiError(400, 'paymentMethod and deliveryAddress are required')
    }
    if (!['ONLINE', 'COD'].includes(paymentMethod)) {
        throw new ApiError(400, 'paymentMethod must be ONLINE or COD')
    }

    const { street, city, state, pincode, phone } = deliveryAddress
    if (!street || !city || !state || !pincode || !phone) {
        throw new ApiError(400, 'deliveryAddress must include street, city, state, pincode and phone')
    }

    const auction = await Auction.findById(auctionId).populate('farmer', 'name email')
    if (!auction) throw new ApiError(404, 'Auction not found')

    if (auction.status !== 'ENDED') {
        throw new ApiError(400, 'Auction has not ended yet')
    }

    if (!auction.winner || auction.winner.toString() !== buyerId.toString()) {
        throw new ApiError(403, 'Only the auction winner can place this order')
    }

    // Prevent duplicate orders for the same auction
    const existing = await Order.findOne({ auctionId: auction._id, buyer: buyerId })
    if (existing) {
        // Return the existing order so the frontend can continue payment if needed
        await existing.populate([
            { path: 'buyer', select: 'name email' },
            { path: 'farmer', select: 'name email' }
        ])
        return { order: existing, alreadyExists: true }
    }

    // Get the winning bid amount
    const winningBid = await Bid.findOne({ auction: auctionId, bidder: buyerId })
        .sort({ amount: -1 })
    const winningAmount = winningBid ? winningBid.amount : auction.currentBid

    if (!winningAmount) throw new ApiError(500, 'Could not determine winning bid amount')

    const totalAmount = winningAmount * auction.quantity

    const order = await Order.create({
        buyer: buyerId,
        farmer: auction.farmer._id,
        // No product ref — this is an auction order
        quantity: auction.quantity,
        unitPrice: winningAmount,
        totalAmount,
        // Required by the newer Order schema
        userId: buyerId,
        items: [],           // auction orders don't use cart items
        subtotal: totalAmount,
        shippingFee: 0,
        tax: 0,
        total: totalAmount,
        paymentMethod,
        paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Pending',
        orderStatus: 'Placed',
        status: 'PENDING',
        deliveryAddress: `${street}, ${city}, ${state} - ${pincode}`,
        deliveryNotes: deliveryNotes || null,
        shippingAddress: { street, city, state, pincode, phone },
        // Custom field linking back to the auction
        auctionId: auction._id,
        auctionProductName: auction.productName,
        auctionImage: auction.image
    })

    await order.populate([
        { path: 'buyer', select: 'name email' },
        { path: 'farmer', select: 'name email' }
    ])

    // Notify farmer via socket
    try {
        const { getIO } = require('../../config/socket')
        getIO().to('user:' + auction.farmer._id.toString()).emit('order:new', {
            _id: order._id,
            id: order._id,
            status: order.status,
            quantity: order.quantity,
            totalAmount: order.totalAmount,
            unitPrice: order.unitPrice,
            createdAt: order.createdAt,
            auctionId: auction._id,
            productName: auction.productName,
            buyerId: buyerId,
            buyerName: order.buyer.name,
            isAuctionOrder: true
        })
    } catch (err) {
        console.error('Socket emit failed for auction order:', err.message)
    }

    // Create notification for farmer
    try {
        const { createNotification } = require('../notifications/notification.service')
        await createNotification({
            userId: auction.farmer._id,
            type: 'ORDER_UPDATE',
            title: 'Auction Winner Placed Order',
            body: `Winner has placed an order for "${auction.productName}" (${auction.quantity} ${auction.unit}) at ₹${winningAmount}/unit.`
        })
    } catch (err) {
        console.error('Notification failed:', err.message)
    }

    return { order, alreadyExists: false }
}

// ──────────────────────────────────────────────
// CREATE RAZORPAY PAYMENT INTENT for auction order
// ──────────────────────────────────────────────
const createAuctionPaymentIntent = async (orderId, buyerId) => {
    const order = await Order.findById(orderId)
    if (!order) throw new ApiError(404, 'Order not found')

    if (order.buyer.toString() !== buyerId.toString()) {
        throw new ApiError(403, 'You are not authorized to pay for this order')
    }
    if (order.paymentStatus === 'Paid') {
        throw new ApiError(400, 'This order is already paid')
    }
    if (order.paymentMethod !== 'ONLINE') {
        throw new ApiError(400, 'This order is not configured for online payment')
    }

    const razorpay = new Razorpay({
        key_id: process.env.PAYMENT_PUBLIC_KEY,
        key_secret: process.env.PAYMENT_SECRET_KEY
    })

    const rzpOrder = await razorpay.orders.create({
        amount: Math.round(order.total * 100), // paise
        currency: 'INR',
        receipt: order._id.toString()
    })

    order.transactionId = rzpOrder.id
    await order.save()

    return { order, rzpOrder, keyId: process.env.PAYMENT_PUBLIC_KEY }
}

// ──────────────────────────────────────────────
// VERIFY RAZORPAY PAYMENT for auction order
// ──────────────────────────────────────────────
const verifyAuctionPayment = async (orderId, buyerId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
    const order = await Order.findById(orderId)
    if (!order) throw new ApiError(404, 'Order not found')

    if (order.buyer.toString() !== buyerId.toString()) {
        throw new ApiError(403, 'Unauthorized')
    }
    if (order.paymentStatus === 'Paid') {
        return order
    }

    const hmac = crypto.createHmac('sha256', process.env.PAYMENT_SECRET_KEY)
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id)
    const generated = hmac.digest('hex')

    if (generated !== razorpay_signature) {
        throw new ApiError(400, 'Invalid payment signature. Transaction verification failed.')
    }

    order.paymentStatus = 'Paid'
    order.orderStatus = 'Placed'
    order.transactionId = razorpay_payment_id
    await order.save()

    // Notify farmer
    try {
        const { createNotification } = require('../notifications/notification.service')
        await createNotification({
            userId: order.farmer,
            type: 'ORDER_UPDATE',
            title: 'Auction Payment Received',
            body: `Payment confirmed for "${order.auctionProductName}". You can now prepare the shipment.`
        })
    } catch (err) {
        console.error('Notification failed:', err.message)
    }

    return order
}

module.exports = {
    createAuctionOrder,
    createAuctionPaymentIntent,
    verifyAuctionPayment
}
