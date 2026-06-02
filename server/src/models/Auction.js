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
        // ── Advanced pricing controls ────────────────────────────────────────
        // reservePrice: if the final bid is below this, the lot is NOT sold.
        //   Shown to buyers as "Reserve not met" until crossed.
        reservePrice: {
            type: Number,
            default: null   // null = no reserve (always sells to highest bidder)
        },
        // buyNowPrice: any buyer can instantly win at this price before auction ends.
        //   Cleared (set to null) once triggered so it can't be reused.
        buyNowPrice: {
            type: Number,
            default: null   // null = no buy-now option
        },
        // minBidIncrement: each new bid must exceed current bid by at least this amount.
        //   Defaults to 1 (same as before) for backward compat.
        minBidIncrement: {
            type: Number,
            default: 1,
            min: 1
        },
        // Whether the reserve price has been met (computed flag, updated on each bid)
        reserveMet: {
            type: Boolean,
            default: false
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