const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema(
    {
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: true
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        content: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
)

messageSchema.index({ order: 1, createdAt: 1 })

const Message = mongoose.model('Message', messageSchema)
module.exports = Message