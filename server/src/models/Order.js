const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema(
    {
        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        farmer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: false
        },
        quantity: {
            type: Number,
            required: false,
            min: 1
        },
        // Store price at the time of order — this is called price snapshotting.
        // If the farmer later changes the price, old orders still show correct price.
        unitPrice: {
            type: Number,
            required: false
        },
        totalAmount: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['PENDING', 'ACCEPTED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
            default: 'PENDING'
        },
        paymentStatus: {
            type: String,
            default: 'Pending'
        },
        deliveryAddress: {
            type: String,
            required: true
        },
        deliveryNotes: String,

        // New Detailed Schema Fields
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        items: [
            {
                product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
                quantity: { type: Number, required: true },
                unitPrice: { type: Number, required: true },
                total: { type: Number, required: true },
                farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
            }
        ],
        subtotal: { type: Number, required: true },
        shippingFee: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        total: { type: Number, required: true },
        paymentMethod: { type: String, enum: ['ONLINE', 'COD'], required: true },
        orderStatus: {
            type: String,
            enum: ['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
            default: 'Placed'
        },
        transactionId: { type: String, default: '' },
        shippingAddress: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true },
            phone: { type: String, required: true }
        },
        refundStatus: { type: String, enum: ['None', 'Pending', 'Refunded'], default: 'None' },
        refundTransactionId: { type: String, default: '' }
    },
    {
        timestamps: true
    }
)

orderSchema.index({ buyer: 1, createdAt: -1 })
orderSchema.index({ farmer: 1, status: 1 })

const Order = mongoose.model('Order', orderSchema)
module.exports = Order