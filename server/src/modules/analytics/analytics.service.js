const Order = require('../../models/Order')
const Product = require('../../models/Product')

// ──────────────────────────────────────────────
// FARMER ANALYTICS
// Uses MongoDB aggregation pipelines for all calculations
// ──────────────────────────────────────────────
const getFarmerAnalytics = async (farmerId) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

    // Run all 5 queries at the same time for speed
    const [
        revenueByDay,
        topProductsRaw,
        categoryBreakdown,
        ordersByStatus,
        monthlySummary,
        totalProducts,
        prevMonthlySummary
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

        // Revenue by crop category for the donut chart
        Order.aggregate([
            {
                $match: {
                    farmer: farmerId,
                    status: 'DELIVERED'
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $group: {
                    _id: '$product.category',
                    value: { $sum: '$totalAmount' }
                }
            },
            { $sort: { value: -1 } }
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
        Product.countDocuments({ farmer: farmerId, isAvailable: true }),

        // Previous 30-day window (days 31–60 ago) — used to compute growth %
        Order.aggregate([
            {
                $match: {
                    farmer: farmerId,
                    status: 'DELIVERED',
                    createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' }
                }
            }
        ])
    ])

    const summary = monthlySummary[0] || {
        totalRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0
    }

    const deliveredCount = ordersByStatus.find((status) => status._id === 'DELIVERED')?.count || 0
    const activeProducts = totalProducts
    const thisMonthRevenue = summary.totalRevenue || 0
    const completionRate = summary.totalOrders > 0
        ? Math.round((deliveredCount / summary.totalOrders) * 100)
        : 0
    const avgOrderValue = summary.totalOrders > 0
        ? Math.round(thisMonthRevenue / summary.totalOrders)
        : 0

    // Compute month-over-month revenue growth as a signed integer percentage.
    // prevMonthRevenue === 0 and thisMonth > 0  → treat as +100% (new revenue)
    // Both zero                                 → 0% (no data either month)
    const prevMonthRevenue = prevMonthlySummary[0]?.totalRevenue || 0
    const revenueGrowth = prevMonthRevenue === 0
        ? (thisMonthRevenue > 0 ? 100 : 0)
        : Math.round(((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)

    const revenueTrend = revenueByDay.map((entry) => ({
        date: entry._id,
        revenue: entry.revenue
    }))

    const topProducts = topProductsRaw.map((entry) => ({
        name: entry.productName,
        revenue: entry.totalRevenue,
        quantity: entry.totalQuantity,
        orders: entry.totalOrders,
        image: entry.productImage
    }))

    const palette = {
        VEGETABLES: '#2E7D32',
        FRUITS: '#F9A825',
        GRAINS: '#8D6E63',
        DAIRY: '#66BB6A',
        HERBS: '#43A047',
        OTHER: '#A1887F'
    }

    const categoryData = categoryBreakdown.map((entry) => ({
        name: entry._id || 'OTHER',
        value: entry.value,
        color: palette[entry._id] || palette.OTHER
    }))

    // Format the response cleanly for the frontend
    return {
        revenueByDay,
        revenueTrend,
        topProducts,
        categoryData,
        ordersByStatus,
        summary: {
            ...summary,
            thisMonthRevenue,
            prevMonthRevenue,
            revenueGrowth,
            completionRate,
            avgOrderValue,
            activeProducts,
            liveAuctions: 0
        },
        totalProducts
    }
}

module.exports = { getFarmerAnalytics }