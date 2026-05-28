const asyncHandler = require('../../utils/asyncHandler')
const ApiResponse = require('../../utils/ApiResponse')
const {
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    checkWishlist
} = require('./wishlist.service')

const add = asyncHandler(async (req, res) => {
    const result = await addToWishlist(req.user._id, req.params.productId)
    res.status(201).json(new ApiResponse(201, result, result.message))
})

const remove = asyncHandler(async (req, res) => {
    const result = await removeFromWishlist(req.user._id, req.params.productId)
    res.json(new ApiResponse(200, result, result.message))
})

const getAll = asyncHandler(async (req, res) => {
    const wishlist = await getWishlist(req.user._id)
    res.json(new ApiResponse(200, wishlist, 'Wishlist fetched successfully'))
})

const check = asyncHandler(async (req, res) => {
    const result = await checkWishlist(req.user._id, req.params.productId)
    res.json(new ApiResponse(200, result, 'Wishlist status checked'))
})

module.exports = { add, remove, getAll, check }