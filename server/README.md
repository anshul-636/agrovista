# 🌾 AgroVista Backend API

A comprehensive Node.js/Express backend server for the AgroVista agricultural marketplace platform. This API enables farmers and buyers to connect, trade products, participate in auctions, and communicate in real-time.

**Live API:** `https://agrovista-api.onrender.com`

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Installation & Setup](#installation--setup)
5. [Environment Variables](#environment-variables)
6. [Running the Server](#running-the-server)
7. [API Documentation](#api-documentation)
8. [Authentication](#authentication)
9. [WebSocket Events](#websocket-events)
10. [Database Schema](#database-schema)
11. [Error Handling](#error-handling)
12. [Response Format](#response-format)
13. [Deployment](#deployment)
14. [Testing](#testing)
15. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

**AgroVista** is a digital marketplace connecting Indian farmers directly with buyers. The platform offers:

- **Product Listings** - Farmers can sell vegetables, fruits, grains, dairy, and herbs
- **Live Auctions** - Time-limited bidding for bulk orders
- **Order Management** - Secure order placement and tracking
- **Real-time Chat** - Direct farmer-buyer communication via WebSocket
- **AI Price Advisory** - AI-powered price suggestions for farmers (powered by Groq)
- **Reviews & Ratings** - Trust scoring system for farmers
- **Analytics** - Farmer performance metrics and sales data
- **Wishlist** - Buyers can save favorite products
- **Notifications** - Real-time order and auction updates

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js v18+ |
| **Framework** | Express.js 4.21.0 |
| **Database** | MongoDB 8.8.0 (via Mongoose) |
| **Authentication** | JWT (jsonwebtoken 9.0.2) |
| **Real-time** | Socket.IO 4.8.3 |
| **File Storage** | Cloudinary v1.41.3 |
| **AI Integration** | Groq SDK 1.2.0 |
| **Password Hashing** | bcryptjs 2.4.3 |
| **Task Scheduling** | node-cron 4.2.1 |
| **CORS** | cors 2.8.5 |
| **Environment** | dotenv 16.4.5 |
| **Dev Tool** | Nodemon 3.1.7 |

---

## 📦 Prerequisites

Before you begin, ensure you have:

- **Node.js v18+** and **npm** or **yarn**
- **MongoDB Atlas** account (or local MongoDB)
- **Cloudinary** account for image uploads
- **Groq API Key** for AI features
- **Git** for version control

### Verify Installation

```bash
node --version    # Should be v18 or higher
npm --version     # Should be v9 or higher
```

---

## 💾 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/anshul-636/agrovista.git
cd agrovista/server
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required packages listed in `package.json`.

### 3. Create Environment File

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

**Note:** If `.env.example` doesn't exist, create a new `.env` file with the variables listed in the [Environment Variables](#environment-variables) section.

### 4. Verify Installation

```bash
npm run dev
```

You should see:
```
✅ AgroVista server is running
🌐 http://localhost:5000
💚 Health check: http://localhost:5000/health
🔌 Socket.IO ready
```

---

## 🔐 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/agrovista?retryWrites=true&w=majority

# JWT Tokens
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_recommended
JWT_REFRESH_SECRET=your_refresh_token_secret_min_32_chars_recommended

# Cloudinary Image Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Groq AI API
GROQ_API_KEY=your_groq_api_key

# Client URL for CORS
CLIENT_URL=http://localhost:3000
```

### Getting Required Credentials

**MongoDB Atlas:**
1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster and database user
3. Copy connection string from "Connect" button

**Cloudinary:**
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to Dashboard → Settings
3. Copy Cloud Name, API Key, and API Secret

**Groq API:**
1. Create account at [console.groq.com](https://console.groq.com)
2. Generate API key from API Keys section

---

## 🚀 Running the Server

### Development Mode (with auto-reload)

```bash
npm run dev
```

Uses Nodemon to restart server on file changes.

### Production Mode

```bash
npm start
```

### Seed Database (Optional)

To populate with sample data:

```bash
npm run seed
```

This creates:
- 5 farmer accounts
- 3 buyer accounts
- 20 sample products
- 3 auctions
- 6 completed orders with reviews

**Login credentials after seeding:**
- Password for all accounts: `Test@1234`
- Farmer emails: ramesh@farm.com, anita@farm.com, etc.
- Buyer emails: priya@buyer.com, arjun@buyer.com, etc.

---

## 📚 API Documentation

### Base URL

```
Production:  https://agrovista-api.onrender.com
Development: http://localhost:5000
```

### Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Request successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## 🔐 AUTH APIs

### 1. Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Farmer",
  "email": "john@farm.com",
  "password": "SecurePass123",
  "role": "FARMER"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "name": "John Farmer",
    "email": "john@farm.com",
    "role": "FARMER",
    "createdAt": "2026-05-28T10:00:00Z"
  },
  "message": "Account created successfully"
}
```

**Roles:** `FARMER` or `BUYER`

---

### 2. Login User

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@farm.com",
  "password": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "name": "John Farmer",
      "email": "john@farm.com",
      "role": "FARMER"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "Login successful"
}
```

**Cookie:** `refreshToken` (HttpOnly, 7-day expiry)

---

### 3. Refresh Access Token

```http
POST /api/auth/refresh
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_access_token"
  },
  "message": "Token refreshed successfully"
}
```

---

### 4. Get Current User

```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "name": "John Farmer",
    "email": "john@farm.com",
    "role": "FARMER"
  },
  "message": "User fetched successfully"
}
```

---

### 5. Logout

```http
POST /api/auth/logout
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully"
}
```

Clears `refreshToken` cookie.

---

## 🛒 PRODUCT APIs

### 1. Get All Products

```http
GET /api/products?category=VEGETABLES&search=tomato&sort=-price&page=1&limit=20
```

**Query Parameters:**
- `category` - Filter by product category (VEGETABLES, FRUITS, GRAINS, DAIRY, HERBS)
- `search` - Search product name or description
- `sort` - Sort field with +/- (e.g., `-price`, `+name`)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "product_id",
        "name": "Fresh Tomatoes",
        "category": "VEGETABLES",
        "price": 40,
        "unit": "kg",
        "quantity": 500,
        "isOrganic": true,
        "farmer": {
          "_id": "farmer_id",
          "name": "John Farmer",
          "avatar": "url",
          "trustScore": 4.8
        },
        "images": ["cloudinary_url"],
        "createdAt": "2026-05-28T10:00:00Z"
      }
    ],
    "total": 150,
    "page": 1,
    "totalPages": 8
  },
  "message": "Products fetched successfully"
}
```

---

### 2. Get Single Product

```http
GET /api/products/:id
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "product_id",
    "name": "Fresh Tomatoes",
    "description": "Organic tomatoes...",
    "category": "VEGETABLES",
    "price": 40,
    "unit": "kg",
    "quantity": 500,
    "isOrganic": true,
    "isAvailable": true,
    "location": "Pune",
    "farmer": {
      "_id": "farmer_id",
      "name": "John Farmer",
      "phone": "9876543210",
      "location": "Pune, Maharashtra",
      "bio": "Organic farmer...",
      "avatar": "url",
      "trustScore": 4.8,
      "reviewCount": 25
    },
    "images": ["url1", "url2"],
    "createdAt": "2026-05-28T10:00:00Z"
  },
  "message": "Product fetched successfully"
}
```

---

### 3. Create Product (Farmers Only)

```http
POST /api/products
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

{
  "name": "Fresh Tomatoes",
  "description": "Organic tomatoes from our farm",
  "category": "VEGETABLES",
  "price": "40",
  "unit": "kg",
  "quantity": "500",
  "isOrganic": "true",
  "location": "Pune",
  "images": [file1, file2, ...]  // Max 5 files, 5MB each
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "_id": "product_id",
    "name": "Fresh Tomatoes",
    "category": "VEGETABLES",
    "price": 40,
    "farmer": "farmer_id",
    "images": ["cloudinary_url"]
  },
  "message": "Product created successfully"
}
```

---

### 4. Get My Products (Farmers Only)

```http
GET /api/products/farmer/mine
Authorization: Bearer <access_token>
```

**Response (200 OK):**
Returns array of products created by the authenticated farmer.

---

### 5. Update Product (Farmers Only)

```http
PUT /api/products/:id
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

{
  "price": "45",
  "quantity": "400",
  "images": [file1]  // Optional
}
```

---

### 6. Delete Product (Farmers Only)

```http
DELETE /api/products/:id
Authorization: Bearer <access_token>
```

---

### 7. Get Product Price History

```http
GET /api/products/:id/price-history
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "price": 40,
      "timestamp": "2026-05-28T10:00:00Z"
    }
  ],
  "message": "Price history fetched successfully"
}
```

---

## 🏆 AUCTION APIs

### 1. Get All Auctions

```http
GET /api/auctions?status=LIVE&category=VEGETABLES&sort=-endTime
```

**Query Parameters:**
- `status` - Filter by status (UPCOMING, LIVE, ENDED)
- `category` - Product category
- `sort` - Sort field

---

### 2. Create Auction (Farmers Only)

```http
POST /api/auctions
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

{
  "productName": "Premium Tomatoes",
  "description": "Bulk order for restaurants",
  "category": "VEGETABLES",
  "quantity": "100",
  "unit": "kg",
  "startingPrice": "5000",
  "startTime": "2026-06-01T10:00:00Z",
  "endTime": "2026-06-01T14:00:00Z",
  "image": file
}
```

---

### 3. Get Auction Details

```http
GET /api/auctions/:id
```

**Response:** Auction object with all details and current bids.

---

### 4. Get My Auctions (Farmers Only)

```http
GET /api/auctions/farmer/mine
Authorization: Bearer <access_token>
```

---

### 5. Place Bid (Buyers Only)

```http
POST /api/auctions/:id/bid
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": "6500"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "auctionId": "auction_id",
    "currentBid": "6500",
    "highestBidder": "your_user_id"
  },
  "message": "Bid placed successfully"
}
```

---

## 📦 ORDER APIs

### 1. Place Order (Buyers Only)

```http
POST /api/orders
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "product": "product_id",
  "quantity": 5,
  "deliveryAddress": "123 Main St, Pune 411001"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "_id": "order_id",
    "product": "product_id",
    "buyer": "buyer_id",
    "farmer": "farmer_id",
    "quantity": 5,
    "totalAmount": 200,
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "deliveryAddress": "123 Main St, Pune 411001",
    "createdAt": "2026-05-28T10:00:00Z"
  },
  "message": "Order placed successfully"
}
```

---

### 2. Get Buyer's Orders (Buyers Only)

```http
GET /api/orders/buyer
Authorization: Bearer <access_token>
```

---

### 3. Get Farmer's Orders (Farmers Only)

```http
GET /api/orders/farmer?status=PENDING
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `status` - Filter by status (PENDING, CONFIRMED, SHIPPED, DELIVERED)

---

### 4. Get Order Details

```http
GET /api/orders/:id
Authorization: Bearer <access_token>
```

---

### 5. Update Order Status (Farmers Only)

```http
PATCH /api/orders/:id/status
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "SHIPPED"
}
```

**Allowed statuses:** PENDING → CONFIRMED → SHIPPED → DELIVERED

---

### 6. Cancel Order (Buyers Only)

```http
POST /api/orders/:id/cancel
Authorization: Bearer <access_token>
```

---

## 💬 CHAT APIs

### 1. Get Chat History

```http
GET /api/chat/:orderId
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "message_id",
      "sender": {
        "_id": "user_id",
        "name": "John",
        "avatar": "url"
      },
      "content": "When can you deliver?",
      "createdAt": "2026-05-28T10:00:00Z"
    }
  ],
  "message": "Chat history fetched successfully"
}
```

**Real-time messages sent via WebSocket (see WebSocket Events section).**

---

## ⭐ REVIEW APIs

### 1. Submit Review (Buyers Only)

```http
POST /api/reviews/:farmerId
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "rating": 5,
  "comment": "Excellent quality and fast delivery!"
}
```

**Rating:** 1-5 stars

---

### 2. Get Farmer Reviews

```http
GET /api/reviews/:farmerId
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "rating": 5,
        "comment": "Excellent!",
        "giver": {
          "name": "Priya",
          "avatar": "url"
        },
        "createdAt": "2026-05-28T10:00:00Z"
      }
    ],
    "averageRating": 4.8,
    "totalReviews": 25
  },
  "message": "Reviews fetched successfully"
}
```

---

## ❤️ WISHLIST APIs

### 1. Add to Wishlist (Buyers Only)

```http
POST /api/wishlist/:productId
Authorization: Bearer <access_token>
```

---

### 2. Remove from Wishlist (Buyers Only)

```http
DELETE /api/wishlist/:productId
Authorization: Bearer <access_token>
```

---

### 3. Get My Wishlist (Buyers Only)

```http
GET /api/wishlist
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "product_id",
      "name": "Fresh Tomatoes",
      "price": 40,
      "farmer": { /* farmer details */ }
    }
  ],
  "message": "Wishlist fetched successfully"
}
```

---

### 4. Check if Product in Wishlist (Buyers Only)

```http
GET /api/wishlist/:productId/check
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "isInWishlist": true
  },
  "message": "Wishlist status checked"
}
```

---

## 🤖 AI APIs

### Get AI Price Advice (Farmers Only)

```http
POST /api/ai/price-advisor
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "productName": "Alphonso Mangoes",
  "category": "FRUITS",
  "quantity": "100",
  "unit": "dozen",
  "location": "Nashik, Maharashtra",
  "description": "Premium quality, first harvest"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "suggestedPrice": 450,
    "priceRange": {
      "min": 400,
      "max": 500
    },
    "analysis": "Based on current market trends in Nashik..."
  },
  "message": "Price advice generated successfully"
}
```

---

## 📊 ANALYTICS APIs

### Get Farmer Analytics (Farmers Only)

```http
GET /api/analytics/farmer
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalProducts": 15,
    "totalOrders": 45,
    "totalRevenue": 125000,
    "averageRating": 4.8,
    "reviewCount": 25,
    "ordersThisMonth": 12,
    "revenueThisMonth": 35000,
    "topProducts": [
      {
        "name": "Fresh Tomatoes",
        "orders": 20,
        "revenue": 50000
      }
    ],
    "monthlyRevenue": [
      { "month": "May", "revenue": 35000 },
      { "month": "June", "revenue": 40000 }
    ]
  },
  "message": "Analytics fetched successfully"
}
```

---

## 🔔 NOTIFICATION APIs

### 1. Get Notifications

```http
GET /api/notifications
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "notif_id",
        "title": "Order Confirmed",
        "description": "Your order #123 has been confirmed",
        "type": "ORDER",
        "isRead": false,
        "createdAt": "2026-05-28T10:00:00Z"
      }
    ],
    "unreadCount": 5
  },
  "message": "Notifications fetched"
}
```

---

### 2. Mark Notification as Read

```http
PATCH /api/notifications/:id/read
Authorization: Bearer <access_token>
```

---

### 3. Mark All Notifications as Read

```http
PATCH /api/notifications/read-all
Authorization: Bearer <access_token>
```

---

## 👤 USER APIs

### 1. Get Public Profile

```http
GET /api/users/:userId
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "name": "John Farmer",
    "avatar": "url",
    "location": "Pune, Maharashtra",
    "bio": "Organic farmer...",
    "role": "FARMER",
    "trustScore": 4.8,
    "reviewCount": 25,
    "productCount": 15,
    "joiningDate": "2025-01-15"
  },
  "message": "Profile fetched successfully"
}
```

---

### 2. Get User Reviews

```http
GET /api/users/:userId/reviews
```

---

## 🔌 WebSocket Events

Real-time features use Socket.IO. Connect with JWT token:

```javascript
import io from 'socket.io-client'

const socket = io('https://agrovista-api.onrender.com', {
  auth: {
    token: accessToken
  }
})
```

### Socket Authentication

```javascript
socket.on('connect', () => {
  console.log('Connected:', socket.id)
})

socket.on('error', (error) => {
  console.error('Socket error:', error.message)
})
```

---

### Auction Room Events

**Join Auction:**
```javascript
socket.emit('join:auction', { auctionId: 'auction_123' })
```

**Receive Auction Updates:**
```javascript
socket.on('auction:started', (data) => {
  console.log('Auction started:', data.auctionId)
})

socket.on('auction:bid-placed', (data) => {
  // data: { auctionId, bidder, amount, createdAt }
  console.log('New bid:', data.amount)
})

socket.on('auction:ended', (data) => {
  // data: { auctionId, winner, finalAmount }
  console.log('Auction ended:', data.winner)
})
```

---

### Chat Room Events

**Join Chat:**
```javascript
socket.emit('join:chat', { orderId: 'order_123' })
```

**Send Message:**
```javascript
socket.emit('send:message', {
  orderId: 'order_123',
  content: 'When can you deliver?'
})
```

**Receive Message:**
```javascript
socket.on('chat:message', (data) => {
  // data: { _id, sender: {_id, name, avatar}, content, createdAt }
  console.log(`${data.sender.name}: ${data.content}`)
})
```

---

### Order Updates

**Receive Order Update:**
```javascript
socket.on('order:updated', (data) => {
  // data: { orderId, status, updatedAt }
  console.log('Order status changed to:', data.status)
})
```

---

### Price Drop Alerts

**Receive Price Alert:**
```javascript
socket.on('price:dropped', (data) => {
  // data: { productId, productName, oldPrice, newPrice }
  console.log(`Price dropped on ${data.productName}`)
})
```

---

## 💾 Database Schema

### User Model

```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (unique, required),
  passwordHash: String (not returned by default),
  role: 'FARMER' | 'BUYER' (default: 'BUYER'),
  phone: String,
  location: String,
  avatar: String (Cloudinary URL),
  bio: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Product Model

```javascript
{
  _id: ObjectId,
  farmer: ObjectId (ref: User),
  name: String (required),
  description: String,
  category: 'VEGETABLES' | 'FRUITS' | 'GRAINS' | 'DAIRY' | 'HERBS',
  price: Number (required),
  unit: String (kg, bundle, dozen, etc.),
  quantity: Number (required),
  isOrganic: Boolean (default: false),
  isAvailable: Boolean (default: true),
  location: String,
  images: [String] (Cloudinary URLs),
  createdAt: Date,
  updatedAt: Date
}
```

### Order Model

```javascript
{
  _id: ObjectId,
  buyer: ObjectId (ref: User),
  farmer: ObjectId (ref: User),
  product: ObjectId (ref: Product),
  quantity: Number (required),
  unitPrice: Number,
  totalAmount: Number,
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED',
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED',
  deliveryAddress: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Auction Model

```javascript
{
  _id: ObjectId,
  farmer: ObjectId (ref: User),
  productName: String,
  description: String,
  category: String,
  quantity: Number,
  unit: String,
  image: String (Cloudinary URL),
  startingPrice: Number,
  currentBid: Number,
  highestBidder: ObjectId (ref: User),
  startTime: Date,
  endTime: Date,
  status: 'UPCOMING' | 'LIVE' | 'ENDED',
  winner: ObjectId (ref: User),
  createdAt: Date
}
```

### Message Model

```javascript
{
  _id: ObjectId,
  order: ObjectId (ref: Order),
  sender: ObjectId (ref: User),
  content: String (required),
  createdAt: Date
}
```

### Review Model

```javascript
{
  _id: ObjectId,
  giver: ObjectId (ref: User),
  receiver: ObjectId (ref: User),
  rating: Number (1-5, required),
  comment: String,
  createdAt: Date
}
```

### Notification Model

```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  title: String,
  description: String,
  type: 'ORDER' | 'AUCTION' | 'REVIEW' | 'PRICE_DROP',
  relatedId: ObjectId (order/auction/etc.),
  isRead: Boolean (default: false),
  createdAt: Date
}
```

---

## ⚠️ Error Handling

The API uses consistent error responses:

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| 400 | Bad Request | Invalid input or missing required fields |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions for action |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists (e.g., duplicate email) |
| 500 | Server Error | Unexpected server error |

### Example Error Response

```json
{
  "success": false,
  "message": "Email already registered"
}
```

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Unauthorized - no token provided` | Missing Authorization header | Add `Authorization: Bearer <token>` |
| `Invalid token` | Expired or malformed JWT | Refresh token via `/api/auth/refresh` |
| `Forbidden - this action requires role: FARMER` | Wrong user role | Ensure user is logged in with correct role |
| `Validation error: name is required` | Missing required field | Check request body matches API spec |
| `File too large. Maximum size is 5MB` | Image exceeds limit | Use smaller image files |

---

## 📝 Response Format

All responses follow a consistent format:

**Success:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Descriptive success message"
}
```

**Error:**
```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

---

## 🌐 Deployment

### Deployed on Render

The backend is deployed on [Render.com](https://render.com):

**Live URL:** `https://agrovista-api.onrender.com`

### Environment Variables on Render

1. Go to Render Dashboard
2. Select the Service
3. Settings → Environment Variables
4. Add all variables from `.env` file
5. Redeploy service

### Health Check

```bash
curl https://agrovista-api.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "AgroVista API is running",
  "timestamp": "2026-05-28T10:00:00Z"
}
```

### Redeployment

Changes are automatically deployed when you push to the connected branch:

```bash
git add .
git commit -m "Update: feature description"
git push origin dev
```

---

## 🧪 Testing

### Using cURL

```bash
# Health check
curl https://agrovista-api.onrender.com/health

# Register
curl -X POST https://agrovista-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@farm.com","password":"Test@123","role":"FARMER"}'

# Get products
curl https://agrovista-api.onrender.com/api/products
```

### Using Postman

1. Import the API collection (if available)
2. Set variables:
   - `base_url`: `https://agrovista-api.onrender.com`
   - `access_token`: Token from login response
3. Use collection pre-request scripts to set authorization headers

### Using Frontend

```javascript
// Example: Fetch products
async function getProducts() {
  const response = await fetch('https://agrovista-api.onrender.com/api/products')
  const { success, data } = await response.json()
  console.log(data.products)
}

// Example: Register
async function registerFarmer() {
  const response = await fetch('https://agrovista-api.onrender.com/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'John Farmer',
      email: 'john@farm.com',
      password: 'SecurePass123',
      role: 'FARMER'
    })
  })
  const { data } = await response.json()
  return data.accessToken // Save for future requests
}

// Example: Get my products (with auth)
async function getMyProducts(token) {
  const response = await fetch('https://agrovista-api.onrender.com/api/products/farmer/mine', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const { data } = await response.json()
  return data
}
```

---

## 🔧 Troubleshooting

### 1. **Connection Refused**

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:5000`

**Solution:**
```bash
# Check if server is running
npm run dev

# Check port availability
netstat -an | grep 5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows
```

### 2. **MongoDB Connection Failed**

**Error:** `MongooseError: Connection failed`

**Solution:**
```bash
# Verify MongoDB URI in .env
# Check MongoDB Atlas network access
# Verify credentials are correct
# Test connection with MongoDB Compass
```

### 3. **Cloudinary Upload Failed**

**Error:** `Error: Invalid api_key`

**Solution:**
```bash
# Verify Cloudinary credentials in .env
# Check API key at dashboard.cloudinary.com
# Ensure folder permissions are correct
```

### 4. **JWT Token Expired**

**Error:** `Token expired, please log in again`

**Solution:**
```javascript
// Call refresh endpoint
const newToken = await refreshAccessToken()
// Use newToken for subsequent requests
```

### 5. **CORS Errors**

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:**
```bash
# Verify CLIENT_URL in .env matches your frontend URL
# Example: CLIENT_URL=http://localhost:3000
# For production: CLIENT_URL=https://yourdomain.com
```

### 6. **File Upload Size Exceeded**

**Error:** `File too large. Maximum size is 5MB`

**Solution:**
- Compress images before uploading
- Ensure file size < 5MB
- Maximum 5 files per request for products

### 7. **Port Already in Use**

**Error:** `Error: listen EADDRINUSE :::5000`

**Solution:**
```bash
# Use different port
PORT=5001 npm run dev

# Or kill process on port 5000
lsof -ti:5000 | xargs kill  # macOS/Linux
netstat -ano | findstr :5000 # Windows (then taskkill)
```

### 8. **Email Already Registered**

**Error:** `409 - An account with this email already exists`

**Solution:**
- Use different email
- Or reset database: `db.users.deleteMany({})` in MongoDB

---

## 📞 Support & Contact

**Issues or Questions?**

1. Check this README first
2. Review error messages carefully
3. Check browser console for client-side errors
4. Verify environment variables are set correctly
5. Contact the development team

---

## 📄 License

This project is part of the AgroVista initiative for supporting Indian farmers.

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Submit pull request with detailed description

---

## ✅ Quick Reference

### API Endpoints Summary

| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| POST | `/api/auth/register` | ❌ | - |
| POST | `/api/auth/login` | ❌ | - |
| POST | `/api/auth/refresh` | ❌ | - |
| GET | `/api/products` | ❌ | - |
| GET | `/api/products/:id` | ❌ | - |
| POST | `/api/products` | ✅ | FARMER |
| GET | `/api/auctions` | ❌ | - |
| POST | `/api/auctions/:id/bid` | ✅ | BUYER |
| POST | `/api/orders` | ✅ | BUYER |
| GET | `/api/wishlist` | ✅ | BUYER |
| POST | `/api/ai/price-advisor` | ✅ | FARMER |
| GET | `/api/notifications` | ✅ | - |

---

## 🎉 You're All Set!

Your frontend is now ready to connect with the AgroVista backend. Start integrating the APIs and building amazing features!

**Happy Coding! 🚀**
