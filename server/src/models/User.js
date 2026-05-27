const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true
        },
        passwordHash: {
            type: String,
            required: true,
            select: false   // NEVER returned in queries by default — must be explicitly selected
        },
        role: {
            type: String,
            enum: ['FARMER', 'BUYER'],
            default: 'BUYER'
        },
        phone: String,
        location: String,
        avatar: String,
        bio: String
    },
    {
        timestamps: true   // Adds createdAt and updatedAt automatically
    }
)

// Index on email for fast lookups during login
//userSchema.index({ email: 1 })

// Instance method: compare password during login
// Usage: const isValid = await user.comparePassword(plainPassword)
userSchema.methods.comparePassword = async function (plainPassword) {
    return bcrypt.compare(plainPassword, this.passwordHash)
}

// When converting to JSON (sending in API response),
// remove passwordHash and __v automatically
userSchema.methods.toJSON = function () {
    const obj = this.toObject()
    delete obj.passwordHash
    delete obj.__v
    return obj
}

const User = mongoose.model('User', userSchema)
module.exports = User