const Order = require('../../models/Order')
const ApiError = require('../../utils/ApiError')
const ApiResponse = require('../../utils/ApiResponse')
const asyncHandler = require('../../utils/asyncHandler')
const Razorpay = require('razorpay')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { finalizeAndNotify } = require('../checkout/checkout.controller')

// Helper for transaction logging
const logTransaction = (details) => {
    try {
        const logDir = path.join(__dirname, '../../../logs')
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true })
        }
        const logFile = path.join(logDir, 'transactions.log')
        const logEntry = `[${new Date().toISOString()}] ${JSON.stringify(details)}\n`
        fs.appendFileSync(logFile, logEntry)
        console.log('💳 [Transaction Logged]:', details)
    } catch (err) {
        console.error('Failed to write transaction log:', err.message)
    }
}

// 1. Create/regenerate Razorpay payment intent for a pending order
const createPayment = asyncHandler(async (req, res) => {
    const { orderId } = req.body

    if (!orderId) {
        throw new ApiError(400, 'Order ID is required')
    }

    const order = await Order.findById(orderId)
    if (!order) {
        throw new ApiError(404, 'Order not found')
    }

    // Security: Only the buyer of this order can pay for it
    if (order.buyer.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to pay for this order')
    }

    if (order.paymentStatus === 'Paid') {
        throw new ApiError(400, 'This order is already paid')
    }

    if (order.paymentMethod !== 'ONLINE') {
        throw new ApiError(400, 'Order is not configured for online payment')
    }

    try {
        const razorpay = new Razorpay({
            key_id: process.env.PAYMENT_PUBLIC_KEY,
            key_secret: process.env.PAYMENT_SECRET_KEY,
        })

        const options = {
            amount: Math.round(order.total * 100), // paise
            currency: 'INR',
            receipt: order._id.toString()
        }

        const rzpOrder = await razorpay.orders.create(options)

        order.transactionId = rzpOrder.id
        await order.save()

        logTransaction({
            action: 'payment_intent_created',
            orderId: order._id,
            buyerId: req.user._id,
            amount: order.total,
            rzpOrderId: rzpOrder.id
        })

        res.json(new ApiResponse(200, {
            order,
            rzpOrder,
            keyId: process.env.PAYMENT_PUBLIC_KEY
        }, 'Payment intent created successfully'))
    } catch (error) {
        throw new ApiError(500, `Payment intent generation failed: ${error.message}`)
    }
})

// 2. Cryptographically verify signature from client-side Razorpay callback
const verifyPayment = asyncHandler(async (req, res) => {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new ApiError(400, 'Required: orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature')
    }

    // Verify signature
    const hmac = crypto.createHmac('sha256', process.env.PAYMENT_SECRET_KEY)
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id)
    const generatedSignature = hmac.digest('hex')

    if (generatedSignature !== razorpay_signature) {
        logTransaction({
            action: 'verification_failed',
            orderId,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            error: 'Signature mismatch'
        })
        throw new ApiError(400, 'Invalid payment signature. Transaction verification failed.')
    }

    const order = await Order.findById(orderId).populate('items.product')
    if (!order) {
        throw new ApiError(404, 'Order not found for verification')
    }

    if (order.paymentStatus === 'Paid') {
        return res.json(new ApiResponse(200, { order }, 'Order already verified as paid'))
    }

    // Update order status to paid
    order.paymentStatus = 'Paid'
    order.orderStatus = 'Placed'
    order.transactionId = razorpay_payment_id
    await order.save()

    // Load full details for notifications
    const populatedOrder = await Order.findById(order._id)
        .populate([
            { path: 'buyer', select: 'name email' },
            { path: 'items.product', select: 'name images price farmer' }
        ])

    // Populate itemDetails helper format for notifications
    const itemDetails = populatedOrder.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        farmer: item.farmer,
        productName: item.product.name
    }))

    // Notify farmers and send sockets
    await finalizeAndNotify(populatedOrder, itemDetails)

    logTransaction({
        action: 'verification_success',
        orderId: order._id,
        buyerId: order.buyer,
        amount: order.total,
        razorpayPaymentId: razorpay_payment_id
    })

    res.json(new ApiResponse(200, { order: populatedOrder }, 'Payment verified successfully'))
})

// 3. Razorpay Webhook listener (async capture)
const handleWebhook = asyncHandler(async (req, res) => {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET
    const signature = req.headers['x-razorpay-signature']

    if (!signature) {
        return res.status(400).json({ status: 'ignored', message: 'No signature header' })
    }

    // Verify webhook signature
    const hmac = crypto.createHmac('sha256', secret || '')
    hmac.update(JSON.stringify(req.body))
    const generatedSignature = hmac.digest('hex')

    // Only fail if secret is configured (optional for dev convenience)
    if (secret && generatedSignature !== signature) {
        logTransaction({
            action: 'webhook_verification_failed',
            signature,
            generatedSignature,
            error: 'Webhook signature mismatch'
        })
        return res.status(400).json({ status: 'error', message: 'Signature verification failed' })
    }

    const event = req.body.event
    logTransaction({
        action: 'webhook_received',
        event,
        payload: req.body
    })

    if (event === 'payment.captured' || event === 'order.paid') {
        const paymentEntity = req.body.payload.payment.entity
        const rzpOrderId = paymentEntity.order_id
        const paymentId = paymentEntity.id

        // Find the pending order associated with this Razorpay order ID
        const order = await Order.findOne({
            $or: [
                { transactionId: rzpOrderId },
                { transactionId: paymentId }
            ]
        })

        if (order && order.paymentStatus !== 'Paid') {
            order.paymentStatus = 'Paid'
            order.orderStatus = 'Placed'
            order.transactionId = paymentId
            await order.save()

            // Notify
            const populatedOrder = await Order.findById(order._id)
                .populate([
                    { path: 'buyer', select: 'name email' },
                    { path: 'items.product', select: 'name images price farmer' }
                ])

            const itemDetails = populatedOrder.items.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
                farmer: item.farmer,
                productName: item.product.name
            }))

            await finalizeAndNotify(populatedOrder, itemDetails)

            logTransaction({
                action: 'webhook_order_paid_success',
                orderId: order._id,
                amount: order.total,
                razorpayPaymentId: paymentId
            })
        }
    }

    res.json({ status: 'ok' })
})

module.exports = {
    createPayment,
    verifyPayment,
    handleWebhook
}
