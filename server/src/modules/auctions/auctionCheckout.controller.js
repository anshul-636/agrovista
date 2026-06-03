const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse = require('../../utils/ApiResponse')
const ApiError = require('../../utils/ApiError')
const {
    createAuctionOrder,
    createAuctionPaymentIntent,
    verifyAuctionPayment
} = require('./auctionCheckout.service')

// POST /api/auctions/:id/checkout
// Winner calls this to create an order from their won auction
const checkout = asyncHandler(async (req, res) => {
    const { id: auctionId } = req.params
    const { paymentMethod, deliveryAddress, deliveryNotes } = req.body

    const { order, alreadyExists } = await createAuctionOrder(
        auctionId,
        req.user._id,
        { paymentMethod, deliveryAddress, deliveryNotes }
    )

    const message = alreadyExists
        ? 'Auction order already exists'
        : 'Auction order created successfully'

    res.status(alreadyExists ? 200 : 201).json(new ApiResponse(
        alreadyExists ? 200 : 201,
        { order },
        message
    ))
})

// POST /api/auctions/orders/:orderId/payment
// Create Razorpay payment intent for an auction order
const initiatePayment = asyncHandler(async (req, res) => {
    const { orderId } = req.params
    const { order, rzpOrder, keyId } = await createAuctionPaymentIntent(orderId, req.user._id)

    res.json(new ApiResponse(200, { order, rzpOrder, keyId }, 'Payment intent created'))
})

// POST /api/auctions/orders/:orderId/verify-payment
// Verify Razorpay signature and mark order as Paid
const verifyPayment = asyncHandler(async (req, res) => {
    const { orderId } = req.params
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new ApiError(400, 'razorpay_order_id, razorpay_payment_id and razorpay_signature are required')
    }

    const order = await verifyAuctionPayment(orderId, req.user._id, {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    })

    res.json(new ApiResponse(200, { order }, 'Payment verified successfully'))
})

module.exports = { checkout, initiatePayment, verifyPayment }
