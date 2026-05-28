const mongoose = require('mongoose')

const productSchema = new mongoose.Schema(
    {
        farmer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        name: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true
        },
        description: {
            type: String,
            required: [true, 'Description is required']
        },
        category: {
            type: String,
            required: true,
            enum: ['VEGETABLES', 'FRUITS', 'GRAINS', 'DAIRY', 'HERBS', 'OTHER']
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price cannot be negative']
        },
        unit: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: [0, 'Quantity cannot be negative']
        },
        images: {
            type: [String],
            default: []
        },
        isOrganic: {
            type: Boolean,
            default: false
        },
        isAvailable: {
            type: Boolean,
            default: true
        },
        location: String,
        harvestDate: Date
    },
    {
        timestamps: true
    }
)

// Index for search and filtering
productSchema.index({ name: 'text', description: 'text' })
productSchema.index({ category: 1 })
productSchema.index({ price: 1 })
productSchema.index({ farmer: 1 })
productSchema.index({ isAvailable: 1, createdAt: -1 })

const Product = mongoose.model('Product', productSchema)
module.exports = Product