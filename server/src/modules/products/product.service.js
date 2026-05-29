const Product = require('../../models/Product')
const PriceHistory = require('../../models/PriceHistory')
const { cloudinary, uploadFiles } = require('../../config/cloudinary')
const ApiError = require('../../utils/ApiError')
const { getTrustScore } = require('../users/user.service')

const createProduct = async (farmerId, data, files) => {
    let images = files && files.length > 0 ? await uploadFiles(files) : []

    // Fallback: accept image URLs from request body when no files are uploaded
    if (images.length === 0 && data.images) {
        const bodyImages = Array.isArray(data.images) ? data.images : [data.images]
        images = bodyImages.filter(url => typeof url === 'string' && url.startsWith('http'))
    }

    if (images.length === 0) {
        // Fallback default image to prevent 400 error if user doesn't provide an image URL.
        images = ["https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=600"]
    }

    const product = await Product.create({
        farmer: farmerId,
        name: data.name,
        description: data.description,
        category: data.category,
        price: parseFloat(data.price),
        unit: data.unit,
        quantity: parseInt(data.quantity),
        images,
        isOrganic: data.isOrganic === 'true' || data.isOrganic === true,
        location: data.location || null,
        harvestDate: data.harvestDate ? new Date(data.harvestDate) : null
    })

    // Populate farmer info before returning
    await product.populate('farmer', 'name avatar location')

    return product
}

// ──────────────────────────────────────────────
// GET ALL PRODUCTS (with search + filters)
// ──────────────────────────────────────────────
const getAllProducts = async (query) => {
    const {
        search = '',
        category,
        minPrice,
        maxPrice,
        fresh,
        isOrganic, // Added isOrganic
        page = 1,
        limit = 12
    } = query

    // Build filter object dynamically
    const filter = { isAvailable: true }

    // Text search on name and description
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ]
    }

    // Category filter (convert to uppercase to match DB)
    if (category && category !== 'All') {
        filter.category = category.toUpperCase()
    }
    
    // Organic filter
    if (isOrganic === 'true' || isOrganic === true) {
        filter.isOrganic = true
    }

    // Price range filter
    if (minPrice || maxPrice) {
        filter.price = {}
        if (minPrice) filter.price.$gte = parseFloat(minPrice)
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice)
    }

    // Freshness filter
    if (fresh) {
        const days = fresh === '1d' ? 1 : fresh === '3d' ? 3 : 7
        filter.createdAt = {
            $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
    }

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    // Run count and data fetch at the same time
    const [total, products] = await Promise.all([
        Product.countDocuments(filter),
        Product.find(filter)
            .populate('farmer', 'name avatar location')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
    ])

    return {
        products,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
    }
}

// ──────────────────────────────────────────────
// GET SINGLE PRODUCT BY ID
// ──────────────────────────────────────────────
const getProductById = async (productId) => {
    const product = await Product.findById(productId)
        .populate('farmer', 'name avatar location bio')

    if (!product) throw new ApiError(404, 'Product not found')

    // Add trust score to the farmer data
    const trustData = await getTrustScore(product.farmer._id)

    // Convert to plain object so we can add trust data
    const productObj = product.toJSON()
    productObj.farmer = { ...productObj.farmer, ...trustData }

    return productObj
}

// ──────────────────────────────────────────────
// GET FARMER'S OWN PRODUCTS
// ──────────────────────────────────────────────
const getFarmerProducts = async (farmerId) => {
    const products = await Product.find({ farmer: farmerId })
        .sort({ createdAt: -1 })

    // Add order count to each product
    const Order = require('../../models/Order')
    const productsWithCounts = await Promise.all(
        products.map(async (product) => {
            const orderCount = await Order.countDocuments({ product: product._id })
            return { ...product.toJSON(), orderCount }
        })
    )

    return productsWithCounts
}

// ──────────────────────────────────────────────
// UPDATE PRODUCT
// ──────────────────────────────────────────────
const updateProduct = async (productId, farmerId, farmerName, data, files) => {
    const existing = await Product.findById(productId)

    if (!existing) throw new ApiError(404, 'Product not found')

    if (existing.farmer.toString() !== farmerId.toString()) {
        throw new ApiError(403, 'You can only edit your own products')
    }

    // Handle price changes
    if (data.price && parseFloat(data.price) !== existing.price) {
        const newPrice = parseFloat(data.price)

        if (newPrice < existing.price) {
            // Price drop: notify all wishlisters via Socket.IO fan-out
            const { notifyPriceDrop } = require('../wishlist/wishlist.service')
            await notifyPriceDrop(productId, existing.price, newPrice, existing.name, farmerName)
        } else {
            // Price increase: just log it silently
            await PriceHistory.create({ product: productId, price: existing.price })
        }
    }


    // Use new images if uploaded, otherwise keep existing
    const images = files && files.length > 0
        ? await uploadFiles(files)
        : existing.images

    const updateData = {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.category && { category: data.category }),
        ...(data.price && { price: parseFloat(data.price) }),
        ...(data.unit && { unit: data.unit }),
        ...(data.quantity !== undefined && { quantity: parseInt(data.quantity) }),
        ...(data.isOrganic !== undefined && {
            isOrganic: data.isOrganic === 'true' || data.isOrganic === true
        }),
        ...(data.location && { location: data.location }),
        ...(data.isAvailable !== undefined && {
            isAvailable: data.isAvailable === 'true' || data.isAvailable === true
        }),
        images
    }

    const updated = await Product.findByIdAndUpdate(
        productId,
        updateData,
        { new: true }   // return the updated document, not the old one
    ).populate('farmer', 'name avatar')

    return updated
}

// ──────────────────────────────────────────────
// DELETE PRODUCT
// ──────────────────────────────────────────────
const deleteProduct = async (productId, farmerId) => {
    const existing = await Product.findById(productId)

    if (!existing) throw new ApiError(404, 'Product not found')

    if (existing.farmer.toString() !== farmerId.toString()) {
        throw new ApiError(403, 'You can only delete your own products')
    }

    // Delete images from Cloudinary
    for (const imageUrl of existing.images) {
        try {
            // Extract public_id from URL
            // URL format: https://res.cloudinary.com/cloudname/image/upload/v123/agrovista/products/filename.jpg
            const parts = imageUrl.split('/')
            const filename = parts[parts.length - 1].split('.')[0]
            const folder = parts[parts.length - 2]
            const publicId = folder + '/' + filename
            await cloudinary.uploader.destroy('agrovista/products/' + filename)
        } catch (err) {
            console.error('Cloudinary delete failed:', err.message)
        }
    }

    await Product.findByIdAndDelete(productId)

    return { message: 'Product deleted successfully' }
}

// ──────────────────────────────────────────────
// GET PRICE HISTORY
// ──────────────────────────────────────────────
const getPriceHistory = async (productId, days = 30) => {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const history = await PriceHistory.find({
        product: productId,
        recordedAt: { $gte: since }
    }).sort({ recordedAt: 1 })

    return history
}

module.exports = {
    createProduct,
    getAllProducts,
    getProductById,
    getFarmerProducts,
    updateProduct,
    deleteProduct,
    getPriceHistory
}