const Order = require('../../models/Order')
const Product = require('../../models/Product')
const ApiError = require('../../utils/ApiError')
const ApiResponse = require('../../utils/ApiResponse')
const asyncHandler = require('../../utils/asyncHandler')
const { getIO } = require('../../config/socket')
const { createNotification } = require('../notifications/notification.service')
const Razorpay = require('razorpay')

const createCheckoutOrder = asyncHandler(async (req, res) => {
    const { items, paymentMethod, shippingAddress, deliveryNotes } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, 'Required: items array is empty or missing')
    }
    if (!paymentMethod || !['ONLINE', 'COD'].includes(paymentMethod)) {
        throw new ApiError(400, 'Required: paymentMethod must be ONLINE or COD')
    }
    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode || !shippingAddress.phone) {
        throw new ApiError(400, 'Required: complete shippingAddress (street, city, state, pincode, phone)')
    }

    // 1. Validate all products and calculate prices
    const itemDetails = []
    let subtotal = 0

    for (const item of items) {
        const { productId, quantity } = item
        if (!productId || !quantity || quantity <= 0) {
            throw new ApiError(400, 'Invalid product or quantity in items')
        }

        const product = await Product.findById(productId).populate('farmer', 'name email')
        if (!product) {
            throw new ApiError(404, `Product not found: ${productId}`)
        }
        if (!product.isAvailable) {
            throw new ApiError(400, `Product is not available: ${product.name}`)
        }
        if (product.quantity < parseInt(quantity)) {
            throw new ApiError(400, `Insufficient stock for ${product.name}. Available: ${product.quantity}`)
        }
        if (product.farmer._id.toString() === req.user._id.toString()) {
            throw new ApiError(400, `You cannot purchase your own product: ${product.name}`)
        }

        const unitPrice = product.price
        const total = unitPrice * parseInt(quantity)
        subtotal += total

        itemDetails.push({
            product: product._id,
            quantity: parseInt(quantity),
            unitPrice,
            total,
            farmer: product.farmer._id,
            productName: product.name,
            farmerName: product.farmer.name,
            productObj: product
        })
    }

    const shippingFee = 0 // Free shipping
    const tax = Math.round(subtotal * 0.05) // 5% GST/tax
    const totalAmount = subtotal + shippingFee + tax

    // 2. Deduct product inventory stock
    for (const item of itemDetails) {
        await Product.findByIdAndUpdate(item.product, {
            $inc: { quantity: -item.quantity }
        })
    }

    // 3. Create the order
    const addressStr = `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}`
    
    const orderData = {
        userId: req.user._id,
        buyer: req.user._id, // Legacy field
        items: itemDetails.map(detail => ({
            product: detail.product,
            quantity: detail.quantity,
            unitPrice: detail.unitPrice,
            total: detail.total,
            farmer: detail.farmer
        })),
        subtotal,
        shippingFee,
        tax,
        total: totalAmount,
        paymentMethod,
        paymentStatus: 'Pending',
        orderStatus: 'Placed',
        shippingAddress,
        deliveryNotes: deliveryNotes || null,

        // Legacy Fields (using the first item details for backward compatibility)
        farmer: itemDetails[0].farmer,
        product: itemDetails[0].product,
        quantity: itemDetails[0].quantity,
        unitPrice: itemDetails[0].unitPrice,
        totalAmount: totalAmount,
        status: 'PENDING',
        deliveryAddress: addressStr
    }

    let order = await Order.create(orderData)

    // 4. Handle based on payment method
    if (paymentMethod === 'COD') {
        order.paymentStatus = 'Pending'
        order.orderStatus = 'Placed'
        await order.save()

        // Notify farmers & trigger sockets for COD
        await finalizeAndNotify(order, itemDetails)

        res.status(201).json(new ApiResponse(210, { order }, 'COD Order placed successfully'))
    } else {
        // ONLINE (Razorpay) Flow
        try {
            const razorpay = new Razorpay({
                key_id: process.env.PAYMENT_PUBLIC_KEY,
                key_secret: process.env.PAYMENT_SECRET_KEY,
            })

            const options = {
                amount: Math.round(totalAmount * 100), // in paise
                currency: 'INR',
                receipt: order._id.toString()
            }

            const rzpOrder = await razorpay.orders.create(options)
            
            // Save Razorpay order ID to transactionId
            order.transactionId = rzpOrder.id
            await order.save()

            res.status(201).json(new ApiResponse(201, {
                order,
                rzpOrder,
                keyId: process.env.PAYMENT_PUBLIC_KEY
            }, 'Razorpay payment intent created'))
        } catch (error) {
            // If payment creation fails, rollback stock deduction
            for (const item of itemDetails) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { quantity: item.quantity }
                })
            }
            // Delete order
            await Order.findByIdAndDelete(order._id)
            throw new ApiError(500, `Payment gateway integration error: ${error.message}`)
        }
    }
})

// Helper to notify farmers and send Socket events
const finalizeAndNotify = async (order, itemDetails) => {
    // Unique farmers in this order
    const farmerIds = [...new Set(itemDetails.map(item => item.farmer.toString()))]

    for (const farmerId of farmerIds) {
        try {
            await createNotification({
                userId: farmerId,
                type: 'ORDER_UPDATE',
                title: 'New Order Placed',
                body: `A new order has been placed containing your products.`
            })
        } catch (err) {
            console.error('Notification creation failed for farmer:', farmerId, err.message)
        }

        // Socket notify
        try {
            const io = getIO()
            io.to('user:' + farmerId).emit('order:new', {
                _id: order._id,
                id: order._id,
                status: order.status,
                totalAmount: order.totalAmount,
                createdAt: order.createdAt
            })
        } catch (err) {
            console.error('Socket emit failed for farmer:', farmerId, err.message)
        }
    }
}

module.exports = {
    createCheckoutOrder,
    finalizeAndNotify
}
