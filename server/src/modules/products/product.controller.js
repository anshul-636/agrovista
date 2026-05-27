const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse = require('../../utils/ApiResponse')
const ApiError = require('../../utils/ApiError')
const {
    createProduct,
    getAllProducts,
    getProductById,
    getFarmerProducts,
    updateProduct,
    deleteProduct,
    getPriceHistory
} = require('./product.service')

const ALLOWED_CATEGORIES = ['VEGETABLES', 'FRUITS', 'GRAINS', 'DAIRY', 'HERBS', 'OTHER']

// POST /api/products
const create = asyncHandler(async (req, res) => {
    const { name, description, category, price, unit, quantity } = req.body

    if (!name || !description || !category || !price || !unit || !quantity) {
        throw new ApiError(400, 'Required: name, description, category, price, unit, quantity')
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
        throw new ApiError(400, 'Category must be one of: ' + ALLOWED_CATEGORIES.join(', '))
    }

    if (parseFloat(price) <= 0) throw new ApiError(400, 'Price must be greater than 0')
    if (parseInt(quantity) < 0) throw new ApiError(400, 'Quantity cannot be negative')

    const product = await createProduct(req.user._id, req.body, req.files)

    res.status(201).json(new ApiResponse(201, product, 'Product created successfully'))
})

// GET /api/products
const getAll = asyncHandler(async (req, res) => {
    const result = await getAllProducts(req.query)
    res.json(new ApiResponse(200, result, 'Products fetched successfully'))
})

// GET /api/products/farmer/mine
// IMPORTANT: This must be defined BEFORE /:id in routes
const getMine = asyncHandler(async (req, res) => {
    const products = await getFarmerProducts(req.user._id)
    res.json(new ApiResponse(200, products, 'Your products fetched successfully'))
})

// GET /api/products/:id
const getOne = asyncHandler(async (req, res) => {
    const product = await getProductById(req.params.id)
    res.json(new ApiResponse(200, product, 'Product fetched successfully'))
})

// GET /api/products/:id/price-history
const getPriceHistoryHandler = asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 30
    const history = await getPriceHistory(req.params.id, days)
    res.json(new ApiResponse(200, history, 'Price history fetched'))
})

// PUT /api/products/:id
const update = asyncHandler(async (req, res) => {
    const product = await updateProduct(
        req.params.id,
        req.user._id,
        req.user.name,    // pass farmer name for notification
        req.body,
        req.files
    )
    res.json(new ApiResponse(200, product, 'Product updated successfully'))
})

// DELETE /api/products/:id
const remove = asyncHandler(async (req, res) => {
    const result = await deleteProduct(req.params.id, req.user._id)
    res.json(new ApiResponse(200, result, result.message))
})

module.exports = { create, getAll, getMine, getOne, update, remove, getPriceHistoryHandler }