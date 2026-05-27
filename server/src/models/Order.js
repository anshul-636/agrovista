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
            required: true
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        // Store price at the time of order — this is called price snapshotting.
        // If the farmer later changes the price, old orders still show correct price.
        unitPrice: {
            type: Number,
            required: true
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
            default: 'SIMULATED_PAID'
        },
        deliveryAddress: {
            type: String,
            required: true
        },
        deliveryNotes: String
    },
    {
        timestamps: true
    }
)

orderSchema.index({ buyer: 1, createdAt: -1 })
orderSchema.index({ farmer: 1, status: 1 })

const Order = mongoose.model('Order', orderSchema)
module.exports = Order