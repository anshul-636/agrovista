const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        type: {
            type: String,
            required: true   // 'ORDER_UPDATE', 'PRICE_DROP', 'RESTOCK', 'BID_WON'
        },
        title: {
            type: String,
            required: true
        },
        body: {
            type: String,
            required: true
        },
        link: String,
        isRead: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
)

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 })

const Notification = mongoose.model('Notification', notificationSchema)
module.exports = Notification