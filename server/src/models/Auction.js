const mongoose = require('mongoose')

const auctionSchema = new mongoose.Schema(
    {
        farmer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        productName: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        category: {
            type: String,
            enum: ['VEGETABLES', 'FRUITS', 'GRAINS', 'DAIRY', 'HERBS', 'OTHER'],
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        unit: {
            type: String,
            required: true
        },
        image: {
            type: String,
            required: true
        },
        startingPrice: {
            type: Number,
            required: true
        },
        currentBid: {
            type: Number,
            default: null
        },
        winner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        status: {
            type: String,
            enum: ['UPCOMING', 'LIVE', 'ENDED', 'CLOSED'],
            default: 'UPCOMING'
        },
        startTime: {
            type: Date,
            required: true
        },
        endTime: {
            type: Date,
            required: true
        }
    },
    {
        timestamps: true
    }
)

auctionSchema.index({ status: 1, endTime: 1 })

const Auction = mongoose.model('Auction', auctionSchema)
module.exports = Auction