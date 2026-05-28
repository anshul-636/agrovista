require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const cloudinary = require('cloudinary').v2

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const User = require('./src/models/User')
const Product = require('./src/models/Product')
const Order = require('./src/models/Order')
const Review = require('./src/models/Review')
const Auction = require('./src/models/Auction')


const hash = (p) => bcrypt.hash(p, 10)
const log = (msg) => console.log('  →', msg)

const uploadImage = async (url, folder = 'agrovista/products') => {
    try {
        const result = await cloudinary.uploader.upload(url, { folder })
        return result.secure_url
    } catch {
        return 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'
    }
}


const FARMERS = [
    { name: 'Ramesh Kumar',  email: 'ramesh@farm.com',  phone: '9876543210', location: 'Pune, Maharashtra',    bio: 'Organic farmer for 15 years, specializing in vegetables.' },
    { name: 'Anita Patel',   email: 'anita@farm.com',   phone: '9876543211', location: 'Nashik, Maharashtra',  bio: 'Fruit and grape specialist from Nashik wine region.' },
    { name: 'Suresh Yadav',  email: 'suresh@farm.com',  phone: '9876543212', location: 'Lucknow, UP',          bio: 'Grain and wheat farmer supplying local mills.' },
    { name: 'Kavitha Nair',  email: 'kavitha@farm.com', phone: '9876543213', location: 'Thrissur, Kerala',     bio: 'Dairy and herb farmer, certified organic.' },
    { name: 'Mohan Singh',   email: 'mohan@farm.com',   phone: '9876543214', location: 'Amritsar, Punjab',     bio: 'Third-generation mustard and wheat farmer.' },
]

const BUYERS = [
    { name: 'Priya Sharma', email: 'priya@buyer.com', phone: '9123456780', location: 'Mumbai, Maharashtra' },
    { name: 'Arjun Mehta',  email: 'arjun@buyer.com', phone: '9123456781', location: 'Delhi' },
    { name: 'Sneha Gupta',  email: 'sneha@buyer.com', phone: '9123456782', location: 'Bangalore, Karnataka' },
]

const PRODUCT_IMAGES = {
    VEGETABLES: [
        'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800',
        'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800',
        'https://images.unsplash.com/photo-1587411768638-ec71f8e33b06?w=800',
        'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=800',
    ],
    FRUITS: [
        'https://images.unsplash.com/photo-1519996529931-28324d5a630e?w=800',
        'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=800',
        'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800',
    ],
    GRAINS: [
        'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800',
        'https://images.unsplash.com/photo-1537254944880-92af7c9c5e88?w=800',
    ],
    DAIRY: [
        'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800',
        'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800',
    ],
    HERBS: [
        'https://images.unsplash.com/photo-1508302603-ee0d8dc6cbb2?w=800',
        'https://images.unsplash.com/photo-1620733723572-11c53f73a416?w=800',
    ],
}


const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        log('Connected to MongoDB')

        log('Clearing existing data...')
        await Promise.all([
            User.deleteMany({}),
            Product.deleteMany({}),
            Order.deleteMany({}),
            Review.deleteMany({}),
            Auction.deleteMany({}),
        ])
        log('Existing data cleared')

        log('Creating farmers...')
        const password = await hash('Test@1234')

        const farmers = await User.insertMany(
            FARMERS.map(f => ({ ...f, passwordHash: password, role: 'FARMER' }))
        )

        log('Creating buyers...')
        const buyers = await User.insertMany(
            BUYERS.map(b => ({ ...b, passwordHash: password, role: 'BUYER' }))
        )

        log(`Created ${farmers.length} farmers and ${buyers.length} buyers`)

        log('Uploading product images to Cloudinary (this may take 30-60 seconds)...')
            { name: 'Fresh Tomatoes',       category: 'VEGETABLES', price: 40,  unit: 'kg',     quantity: 500, isOrganic: true,  location: 'Pune',     farmerIdx: 0, imgCategory: 'VEGETABLES', imgIdx: 0 },
            { name: 'Green Spinach',         category: 'VEGETABLES', price: 25,  unit: 'bundle', quantity: 200, isOrganic: true,  location: 'Pune',     farmerIdx: 0, imgCategory: 'VEGETABLES', imgIdx: 1 },
            { name: 'Brinjal (Eggplant)',   category: 'VEGETABLES', price: 35,  unit: 'kg',     quantity: 150, isOrganic: false, location: 'Pune',     farmerIdx: 0, imgCategory: 'VEGETABLES', imgIdx: 2 },
            { name: 'Lady Finger (Okra)',   category: 'VEGETABLES', price: 50,  unit: 'kg',     quantity: 120, isOrganic: true,  location: 'Pune',     farmerIdx: 0, imgCategory: 'VEGETABLES', imgIdx: 3 },

            { name: 'Alphonso Mangoes',     category: 'FRUITS',     price: 300, unit: 'dozen',  quantity: 100, isOrganic: false, location: 'Nashik',   farmerIdx: 1, imgCategory: 'FRUITS',     imgIdx: 0 },
            { name: 'Thompson Grapes',      category: 'FRUITS',     price: 80,  unit: 'kg',     quantity: 300, isOrganic: false, location: 'Nashik',   farmerIdx: 1, imgCategory: 'FRUITS',     imgIdx: 1 },
            { name: 'Sweet Pomegranate',    category: 'FRUITS',     price: 120, unit: 'kg',     quantity: 200, isOrganic: true,  location: 'Nashik',   farmerIdx: 1, imgCategory: 'FRUITS',     imgIdx: 2 },
            { name: 'Fresh Strawberries',   category: 'FRUITS',     price: 150, unit: 'kg',     quantity: 80,  isOrganic: true,  location: 'Nashik',   farmerIdx: 1, imgCategory: 'FRUITS',     imgIdx: 0 },

            { name: 'Basmati Rice',         category: 'GRAINS',     price: 90,  unit: 'kg',     quantity: 1000, isOrganic: false, location: 'Lucknow', farmerIdx: 2, imgCategory: 'GRAINS',    imgIdx: 0 },
            { name: 'Whole Wheat Flour',    category: 'GRAINS',     price: 45,  unit: 'kg',     quantity: 800,  isOrganic: false, location: 'Lucknow', farmerIdx: 2, imgCategory: 'GRAINS',    imgIdx: 1 },
            { name: 'Yellow Moong Dal',     category: 'GRAINS',     price: 110, unit: 'kg',     quantity: 500,  isOrganic: true,  location: 'Lucknow', farmerIdx: 2, imgCategory: 'GRAINS',    imgIdx: 0 },
            { name: 'Masoor Dal (Red)',     category: 'GRAINS',     price: 95,  unit: 'kg',     quantity: 400,  isOrganic: false, location: 'Lucknow', farmerIdx: 2, imgCategory: 'GRAINS',    imgIdx: 1 },

            { name: 'Fresh Cow Milk',       category: 'DAIRY',      price: 55,  unit: 'litre',  quantity: 200, isOrganic: true,  location: 'Kerala',   farmerIdx: 3, imgCategory: 'DAIRY',     imgIdx: 0 },
            { name: 'Homemade Cow Ghee',    category: 'DAIRY',      price: 600, unit: 'kg',     quantity: 50,  isOrganic: true,  location: 'Kerala',   farmerIdx: 3, imgCategory: 'DAIRY',     imgIdx: 1 },
            { name: 'Tulsi (Holy Basil)',   category: 'HERBS',      price: 30,  unit: 'bundle', quantity: 150, isOrganic: true,  location: 'Kerala',  farmerIdx: 3,  imgCategory: 'HERBS',     imgIdx: 0 },
            { name: 'Fresh Curry Leaves',   category: 'HERBS',      price: 20,  unit: 'bundle', quantity: 200, isOrganic: true,  location: 'Kerala',  farmerIdx: 3,  imgCategory: 'HERBS',     imgIdx: 1 },

            { name: 'Mustard Seeds',        category: 'GRAINS',     price: 75,  unit: 'kg',     quantity: 600, isOrganic: false, location: 'Punjab',   farmerIdx: 4, imgCategory: 'GRAINS',    imgIdx: 0 },
            { name: 'Golden Turmeric',      category: 'HERBS',      price: 200, unit: 'kg',     quantity: 100, isOrganic: true,  location: 'Punjab',   farmerIdx: 4, imgCategory: 'HERBS',     imgIdx: 0 },
            { name: 'Red Onions',           category: 'VEGETABLES', price: 30,  unit: 'kg',     quantity: 700, isOrganic: false, location: 'Punjab',   farmerIdx: 4, imgCategory: 'VEGETABLES', imgIdx: 0 },
            { name: 'Fresh Garlic',         category: 'VEGETABLES', price: 180, unit: 'kg',     quantity: 200, isOrganic: false, location: 'Punjab',   farmerIdx: 4, imgCategory: 'VEGETABLES', imgIdx: 1 },
        ]

        // Upload images in batches of 4 to avoid hitting rate limits
        const products = []
        for (let i = 0; i < productData.length; i++) {
            const p = productData[i]
            const imgUrl = PRODUCT_IMAGES[p.imgCategory][p.imgIdx % PRODUCT_IMAGES[p.imgCategory].length]
            const uploadedUrl = await uploadImage(imgUrl, 'agrovista/products')

            const product = await Product.create({
                farmer: farmers[p.farmerIdx]._id,
                name: p.name,
                description: `Premium quality ${p.name.toLowerCase()} from ${p.location}. Freshly harvested and delivered directly from farm to your table.`,
                category: p.category,
                price: p.price,
                unit: p.unit,
                quantity: p.quantity,
                isOrganic: p.isOrganic,
                isAvailable: true,
                location: p.location,
                images: [uploadedUrl]
            })
            products.push(product)
            log(`Product ${i + 1}/20 created: ${p.name}`)
        }

        log('Creating auctions...')
        const now = new Date()

        const auctionImg1 = await uploadImage(PRODUCT_IMAGES.FRUITS[0], 'agrovista/auctions')
        const auctionImg2 = await uploadImage(PRODUCT_IMAGES.GRAINS[0], 'agrovista/auctions')
        const auctionImg3 = await uploadImage(PRODUCT_IMAGES.VEGETABLES[0], 'agrovista/auctions')

        await Auction.insertMany([
            {
                farmer: farmers[1]._id,
                productName: 'Premium Alphonso Mangoes',
                description: 'First harvest of the season! Alphonso mangoes from our Ratnagiri farm, known for their sweetness.',
                category: 'FRUITS',
                quantity: 50,
                unit: 'dozen',
                image: auctionImg1,
                startingPrice: 500,
                currentBid: 750,
                startTime: new Date(now.getTime() - 60 * 60 * 1000),       // started 1 hour ago
                endTime: new Date(now.getTime() + 60 * 60 * 1000),         // ends in 1 hour
                status: 'LIVE'
            },
            {
                farmer: farmers[2]._id,
                productName: 'Organic Basmati Rice — 100kg Bulk',
                description: 'Premium aged Basmati rice. Bulk auction for restaurants and wholesalers. Long grain, aromatic.',
                category: 'GRAINS',
                quantity: 100,
                unit: 'kg',
                image: auctionImg2,
                startingPrice: 8000,
                currentBid: 9200,
                startTime: new Date(now.getTime() - 30 * 60 * 1000),       // started 30 mins ago
                endTime: new Date(now.getTime() + 90 * 60 * 1000),         // ends in 90 mins
                status: 'LIVE'
            },
            {
                farmer: farmers[0]._id,
                productName: 'Fresh Tomatoes — Wholesale Lot',
                description: 'Upcoming auction for 200kg of premium vine-ripened tomatoes. Perfect for restaurants.',
                category: 'VEGETABLES',
                quantity: 200,
                unit: 'kg',
                image: auctionImg3,
                startingPrice: 5000,
                currentBid: null,
                startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // starts tomorrow
                endTime: new Date(now.getTime() + 48 * 60 * 60 * 1000),   // ends day after
                status: 'UPCOMING'
            }
        ])
        log('Created 2 LIVE auctions + 1 UPCOMING auction')

        log('Creating completed orders and reviews...')

        const orderPairs = [
            { buyerIdx: 0, productIdx: 0,  qty: 5,  address: 'Flat 12, Andheri West, Mumbai' },
            { buyerIdx: 0, productIdx: 4,  qty: 2,  address: 'Flat 12, Andheri West, Mumbai' },
            { buyerIdx: 1, productIdx: 8,  qty: 10, address: 'Sector 15, Dwarka, Delhi' },
            { buyerIdx: 1, productIdx: 12, qty: 3,  address: 'Sector 15, Dwarka, Delhi' },
            { buyerIdx: 2, productIdx: 14, qty: 2,  address: 'Koramangala, Bangalore' },
            { buyerIdx: 2, productIdx: 1,  qty: 8,  address: 'Koramangala, Bangalore' },
        ]

        const REVIEWS = [
            { rating: 5, comment: 'Absolutely fresh tomatoes! Delivered on time.' },
            { rating: 4, comment: 'Great Alphonso mangoes, very sweet. Will order again!' },
            { rating: 5, comment: 'Best Basmati rice I have ever had. Highly recommended.' },
            { rating: 4, comment: 'Good quality milk. Fresh and pure.' },
            { rating: 5, comment: 'Amazing Tulsi, smells wonderful. Very organic!' },
            { rating: 3, comment: 'Decent quality spinach. Average delivery time.' },
        ]

        for (let i = 0; i < orderPairs.length; i++) {
            const { buyerIdx, productIdx, qty, address } = orderPairs[i]
            const product = products[productIdx]

            const order = await Order.create({
                buyer: buyers[buyerIdx]._id,
                farmer: product.farmer,
                product: product._id,
                quantity: qty,
                unitPrice: product.price,
                totalAmount: product.price * qty,
                status: 'DELIVERED',
                paymentStatus: 'SIMULATED_PAID',
                deliveryAddress: address
            })

            const rev = REVIEWS[i]
            await Review.create({
                giver: buyers[buyerIdx]._id,
                receiver: product.farmer,
                rating: rev.rating,
                comment: rev.comment
            })

            log(`Order + Review ${i + 1}/6 created`)
        }

        console.log('\n  ✅  Seed complete!\n')
        console.log('  📊  Summary:')
        console.log(`     Farmers : ${farmers.length}`)
        console.log(`     Buyers  : ${buyers.length}`)
        console.log(`     Products: ${products.length}`)
        console.log('     Auctions: 3 (2 LIVE + 1 UPCOMING)')
        console.log('     Orders  : 6 (all DELIVERED)')
        console.log('     Reviews : 6')
        console.log('\n  🔑  All accounts use password: Test@1234')
        console.log('\n  👨‍🌾  Farmer emails:')
        FARMERS.forEach(f => console.log('     ' + f.email))
        console.log('\n  🛒  Buyer emails:')
        BUYERS.forEach(b => console.log('     ' + b.email))
        console.log('')

        await mongoose.disconnect()
        process.exit(0)
    } catch (err) {
        console.error('\n  ❌  Seed failed:', err.message)
        console.error(err)
        await mongoose.disconnect()
        process.exit(1)
    }
}

seed()
