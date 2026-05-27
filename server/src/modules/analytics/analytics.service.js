const Order = require('../../models/Order')
const Product = require('../../models/Product')

// ──────────────────────────────────────────────
// FARMER ANALYTICS
// Uses MongoDB aggregation pipelines for all calculations
// ──────────────────────────────────────────────
const getFarmerAnalytics = async (farmerId) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Run all 5 queries at the same time for speed
    const [
        revenueByDay,
        topProducts,
        ordersByStatus,
        monthlySummary,
        totalProducts
    ] = await Promise.all([

        // Revenue per day for last 7 days
        Order.aggregate([
            {
                $match: {
                    farmer: farmerId,
                    status: 'DELIVERED',
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    revenue: { $sum: '$totalAmount' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]),

        // Top 5 best-selling products by revenue
        Order.aggregate([
            {
                $match: {
                    farmer: farmerId,
                    status: 'DELIVERED'
                }
            },
            {
                $group: {
                    _id: '$product',
                    totalRevenue: { $sum: '$totalAmount' },
                    totalOrders: { $sum: 1 },
                    totalQuantity: { $sum: '$quantity' }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $project: {
                    productName: '$product.name',
                    productImage: { $arrayElemAt: ['$product.images', 0] },
                    totalRevenue: 1,
                    totalOrders: 1,
                    totalQuantity: 1
                }
            }
        ]),

        // Count orders by status
        Order.aggregate([
            { $match: { farmer: farmerId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]),

        // This month's summary
        Order.aggregate([
            {
                $match: {
                    farmer: farmerId,
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'DELIVERED'] }, '$totalAmount', 0]
                        }
                    },
                    totalOrders: { $sum: 1 },
                    pendingOrders: {
                        $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] }
                    }
                }
            }
        ]),

        // Total active product listings
        Product.countDocuments({ farmer: farmerId, isAvailable: true })
    ])

    // Format the response cleanly for the frontend
    return {
        revenueByDay,
        topProducts,
        ordersByStatus,
        summary: monthlySummary[0] || {
            totalRevenue: 0,
            totalOrders: 0,
            pendingOrders: 0
        },
        totalProducts
    }
}

module.exports = { getFarmerAnalytics }