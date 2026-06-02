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
            required: false,  // Not required at schema level
            select: false     // NEVER returned in queries by default — must be explicitly selected
        },
        role: {
            type: String,
            enum: ['FARMER', 'BUYER'],
            default: 'BUYER'
        },
        phone: String,
        location: String,
        latitude: Number,
        longitude: Number,
        avatar: String,
        bio: String,
        googleId: String,
        isOAuthUser: {
            type: Boolean,
            default: false
        },
        walletBalance: {
            type: Number,
            default: 1000000 // 10 Lakhs purse default
        },

        // ── Farmer Verification ──────────────────────────────────────────────
        // Farmers can request verification by submitting documents.
        // An admin (or automated flow) then approves/rejects the request.
        // Verified farmers show a badge on listings, auctions, and their profile.
        verificationStatus: {
            type: String,
            enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'],
            default: 'UNVERIFIED'
        },
        verificationDocs: {
            // URLs of uploaded documents (Aadhaar, land record, GST, etc.)
            type: [String],
            default: []
        },
        verificationNote: {
            // Admin note on rejection or approval
            type: String,
            default: ''
        },
        verifiedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
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