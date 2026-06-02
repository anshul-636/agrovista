# 🌾 HarvestHive — 7-Day Team Plan
## Work Distribution + Learning + Execution

---

## TEAM ROLES

| | You (Dev 1) | Partner (Dev 2) |
|---|---|---|
| **Role** | Backend Lead + Real-time Engineer | Frontend Lead + UI Engineer |
| **Work %** | ~65% | ~35% |
| **Owns** | Server, DB, Auth, Socket.IO, AI, Analytics, Deployment | All pages, components, UI/UX, forms |
| **Stack focus** | Node.js, Express, Prisma, PostgreSQL, Socket.IO, OpenAI | Next.js, Tailwind, shadcn/ui, TanStack Query, Zustand |

> **Why this split makes sense:** The backend is genuinely harder and more complex — it has auth, database design, real-time architecture, AI integration, and deployment. Your partner builds the visual layer on top of the APIs you create. You also own the system design, which is what interviewers ask about the most.

---

## SHARED SETUP (Do this TOGETHER before Day 1 starts — 1 hour)

```
Both run this together on a call/screen share:

1. Create GitHub org or shared repo: github.com/yourname/harvesthive
   - Monorepo structure: /client and /server folders
   - Protect main branch: require PR to merge
   - Branch naming: feat/feature-name, fix/bug-name

2. Create shared .env.example files (commit this, NOT .env)

3. Set up free accounts (share credentials securely):
   - Neon.tech (free PostgreSQL)
   - Cloudinary (free image hosting)
   - OpenAI (you need ~$2 credits, gpt-4o-mini is cheap)
   - Vercel (frontend deploy)
   - Render.com (backend deploy)

4. Daily sync rule:
   - 15 min standup every morning (what did you do, what will you do, any blockers)
   - Merge to main every evening before sleeping
   - Never work on the same file at the same time
```

---

## GIT WORKFLOW (Follow this every day)

```bash
# Start of day
git pull origin main
git checkout -b feat/your-feature-name

# End of day
git add .
git commit -m "feat: add JWT auth middleware and login endpoint"
git push origin feat/your-feature-name
# Create PR → partner reviews → merge to main
```

---

# DAY 1 — FOUNDATION
**Theme: Project setup + Database + Auth backend**

---

## YOU (Dev 1) — Day 1

### Morning: Learn (2 hours)
**Topic: How JWT auth actually works end-to-end**

Read/watch in this order:
1. Read: "JWT.io Introduction" — https://jwt.io/introduction
   - Understand: header.payload.signature structure
   - Understand: why the signature prevents tampering
   - Understand: access token (short-lived) vs refresh token (long-lived)

2. Read: "Why store refresh token in httpOnly cookie?"
   - Search: "JWT httpOnly cookie vs localStorage security"
   - Key insight: localStorage is readable by JS → XSS can steal it
   - httpOnly cookie → JS cannot read it → XSS cannot steal it

3. Understand bcrypt:
   - It's a one-way hash. You can never "decrypt" a bcrypt hash.
   - On login: bcrypt.compare(plainPassword, storedHash) → true/false
   - Work factor 10-12 = good balance of security vs speed

**Before writing any code, be able to answer:**
- What happens if someone steals the access token?
- What is refresh token rotation and why does it prevent replay attacks?
- Why does the access token expire in 15 minutes?

---

### Afternoon: Build (4-5 hours)

**Step 1: Initialize the backend (30 min)**
```bash
mkdir server && cd server
npm init -y
npm install express cors dotenv bcryptjs jsonwebtoken cookie-parser
npm install prisma @prisma/client
npm install -D nodemon
npx prisma init
```

Set up `src/app.js`:
```javascript
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()
app.use(express.json())
app.use(cookieParser())
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true  // IMPORTANT: allows cookies to be sent cross-origin
}))

export default app
```

**Step 2: Write the Prisma schema (45 min)**
Open `prisma/schema.prisma` and write the full schema from the architecture document.
Tables to write today: `User`, `Product`, `Order`, `Auction`, `Bid`, `Review`, `Message`, `Watchlist`, `Notification`

Run:
```bash
npx prisma migrate dev --name init
npx prisma studio  # Opens a visual DB browser at localhost:5555 — use this to verify your tables
```

**Step 3: Build Auth module (2 hours)**

File: `src/utils/asyncHandler.js`
```javascript
// Wraps async route handlers so you don't repeat try/catch everywhere
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}
export default asyncHandler
```

File: `src/utils/ApiError.js`
```javascript
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}
export default ApiError
```

File: `src/utils/ApiResponse.js`
```javascript
class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode
    this.data = data
    this.message = message
    this.success = statusCode < 400
  }
}
export default ApiResponse
```

File: `src/middleware/auth.js`
```javascript
import jwt from 'jsonwebtoken'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import { prisma } from '../config/db.js'

export const verifyToken = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) throw new ApiError(401, 'Unauthorized - no token')
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, role: true, name: true }
    // select: ALWAYS exclude passwordHash from responses
  })
  if (!user) throw new ApiError(401, 'Unauthorized - user not found')
  req.user = user
  next()
})
```

File: `src/middleware/authorize.js`
```javascript
import ApiError from '../utils/ApiError.js'

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    throw new ApiError(403, `Forbidden - requires role: ${roles.join(' or ')}`)
  }
  next()
}
```

File: `src/modules/auth/auth.service.js`
```javascript
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../config/db.js'
import ApiError from '../../utils/ApiError.js'

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' })
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' })
  return { accessToken, refreshToken }
}

export const registerUser = async ({ name, email, password, role }) => {
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) throw new ApiError(409, 'Email already registered')
  
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
    select: { id: true, name: true, email: true, role: true }
  })
  return user
}

export const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new ApiError(401, 'Invalid credentials')
  
  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) throw new ApiError(401, 'Invalid credentials')
  // NOTE: same error message for "user not found" and "wrong password"
  // This prevents user enumeration attacks
  
  const tokens = generateTokens(user.id)
  return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, ...tokens }
}

export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) throw new ApiError(401, 'No refresh token')
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId)
  return { accessToken, newRefreshToken }
}
```

File: `src/modules/auth/auth.controller.js`
```javascript
import asyncHandler from '../../utils/asyncHandler.js'
import ApiResponse from '../../utils/ApiResponse.js'
import * as authService from './auth.service.js'

const COOKIE_OPTIONS = {
  httpOnly: true,    // JS cannot access this cookie
  secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
}

export const register = asyncHandler(async (req, res) => {
  const user = await authService.registerUser(req.body)
  res.status(201).json(new ApiResponse(201, user, 'Registered successfully'))
})

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.loginUser(req.body)
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
  res.json(new ApiResponse(200, { user, accessToken }))
})

export const refresh = asyncHandler(async (req, res) => {
  const { accessToken, newRefreshToken } = await authService.refreshAccessToken(req.cookies.refreshToken)
  res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS)
  res.json(new ApiResponse(200, { accessToken }))
})

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('refreshToken', COOKIE_OPTIONS)
  res.json(new ApiResponse(200, null, 'Logged out'))
})

export const getMe = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, req.user))
})
```

**Step 4: Test with Postman/Thunder Client (30 min)**
```
POST /api/auth/register  { name, email, password, role: "FARMER" }
POST /api/auth/login     { email, password }
GET  /api/auth/me        (Authorization: Bearer <token>)
POST /api/auth/refresh   (sends cookie automatically)
POST /api/auth/logout
```

✅ **Day 1 Done when:** Register works, login returns access token + sets cookie, /me returns user, refresh issues new token.

---

## PARTNER (Dev 2) — Day 1

### Morning: Learn (2 hours)
**Topic: Next.js App Router fundamentals**
- Watch: "Next.js 14 App Router Tutorial" (any YouTube, ~30 min)
- Key concepts to understand: layouts, route groups `(auth)`, `(buyer)`, `(farmer)`, Server vs Client components, `"use client"` directive

### Afternoon: Build (4-5 hours)

**Step 1: Initialize Next.js (30 min)**
```bash
npx create-next-app@latest client --typescript --tailwind --app
cd client
npx shadcn-ui@latest init
# Install components you'll use:
npx shadcn-ui@latest add button card input label badge avatar toast
npm install axios zustand @tanstack/react-query sonner
```

**Step 2: Set up the route structure**
Create empty `page.jsx` files for all routes:
```
app/
  (auth)/login/page.jsx
  (auth)/register/page.jsx
  (buyer)/page.jsx           ← marketplace home
  (buyer)/products/page.jsx
  (buyer)/products/[id]/page.jsx
  (buyer)/auctions/page.jsx
  (buyer)/orders/page.jsx
  (farmer)/dashboard/page.jsx
  (farmer)/products/page.jsx
  (farmer)/products/new/page.jsx
  (farmer)/orders/page.jsx
  (farmer)/auctions/page.jsx
```

**Step 3: Build the auth store (Zustand)**
```javascript
// store/authStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(persist(
  (set) => ({
    user: null,
    accessToken: null,
    setAuth: (user, accessToken) => set({ user, accessToken }),
    logout: () => set({ user: null, accessToken: null }),
    isAuthenticated: () => !!useAuthStore.getState().accessToken,
  }),
  { name: 'auth-storage' }  // persists to localStorage
))
```

**Step 4: Build login + register pages (UI only for now)**
Both pages should be fully styled with shadcn components.
Register page has a role selector (FARMER / BUYER) as toggle buttons.

**Step 5: Set up Axios instance**
```javascript
// lib/api.js
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,  // sends cookies with every request
})

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 - auto refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const { data } = await axios.post(`${process.env NEXT_PUBLIC_API_URL}/api/auth/refresh`, {}, { withCredentials: true })
        useAuthStore.getState().setAuth(useAuthStore.getState().user, data.data.accessToken)
        error.config.headers.Authorization = `Bearer ${data.data.accessToken}`
        return axios(error.config)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
```

✅ **Day 1 Done when:** Next.js runs, routes exist, login/register pages are styled, Axios is configured.

---

# DAY 2 — PRODUCTS
**Theme: Product CRUD (backend) + Product UI (frontend)**

---

## YOU (Dev 1) — Day 2

### Morning: Learn (1.5 hours)
**Topic: File uploads and cloud storage**

Understand this before writing code:
- Why NOT store images on your server: servers are ephemeral (Render restarts = files gone)
- How Cloudinary works: you stream the file directly to Cloudinary, get back a URL
- What a Multer + Cloudinary pipeline is: Multer parses multipart form data → Cloudinary storage engine uploads → returns URL
- Read: Cloudinary Node.js SDK docs (15 min)

**Also understand: Prisma query patterns you'll use today**
```javascript
// findMany with filters (search + category + price)
prisma.product.findMany({
  where: {
    isAvailable: true,
    category: category || undefined,  // undefined = ignore filter
    name: { contains: search, mode: 'insensitive' },
    price: { gte: minPrice, lte: maxPrice }
  },
  include: { farmer: { select: { id: true, name: true, avatar: true } } },
  orderBy: { createdAt: 'desc' },
  take: limit,
  skip: (page - 1) * limit
})
```

### Afternoon: Build (4-5 hours)

**Product routes + controller + service following the exact same pattern as auth**

`POST /api/products` — FARMER only, with image upload
`GET /api/products` — public, with filters
`GET /api/products/:id` — public, includes farmer + trust score
`PUT /api/products/:id` — FARMER only, owns the product
`DELETE /api/products/:id` — FARMER only
`GET /api/products/farmer/mine` — FARMER only

Key things to get right:
1. Cloudinary upload middleware — set this up first, test with Postman sending a form-data request
2. The GET /products query — implement search + category + price range properly
3. Trust score — add a method to UserService that computes it:
```javascript
export const getTrustScore = async (farmerId) => {
  const [reviews, orders] = await Promise.all([
    prisma.review.aggregate({ where: { receiverId: farmerId }, _avg: { rating: true }, _count: true }),
    prisma.order.groupBy({
      by: ['status'],
      where: { farmerId },
      _count: true
    })
  ])
  const avgRating = reviews._avg.rating || 0
  const total = orders.reduce((sum, o) => sum + o._count, 0)
  const completed = orders.find(o => o.status === 'DELIVERED')?._count || 0
  const completionRate = total > 0 ? completed / total : 0
  return Math.round((avgRating / 5) * 40 + completionRate * 40 + 20)
  // responseScore always 20 for now (can improve later)
}
```

✅ **Day 2 Done when:** You can create a product with image upload via Postman, list products with search filter, get single product.

---

## PARTNER (Dev 2) — Day 2

### Afternoon: Build (4-5 hours)

**Connect auth pages to backend:**
- Wire login form → POST /api/auth/login → setAuth() in Zustand → redirect to dashboard
- Wire register form → POST /api/auth/register → redirect to login

**Build marketplace home page (buyer):**
- Product card component (image, name, farmer name + trust badge, price, category badge)
- Grid layout with loading skeletons (use shadcn Skeleton)
- Search bar + category filter buttons
- Connect to GET /api/products (use TanStack Query)

**Build protected route wrapper:**
```javascript
// components/ProtectedRoute.jsx
'use client'
import { useAuthStore } from '@/store/authStore'
import { redirect } from 'next/navigation'

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, accessToken } = useAuthStore()
  if (!accessToken) redirect('/login')
  if (requiredRole && user?.role !== requiredRole) redirect('/')
  return children
}
```
Wrap farmer routes with `requiredRole="FARMER"` and buyer routes with `requiredRole="BUYER"`.

✅ **Day 2 Done when:** Marketplace page shows products from the API, login works end-to-end, auth is protected.

---

# DAY 3 — ORDERS + DASHBOARDS
**Theme: Order system + role-specific dashboards**

---

## YOU (Dev 1) — Day 3

### Morning: Learn (1.5 hours)
**Topic: Database transactions and state machines**

Read and understand:
- **Why transactions matter:** If you create an order BUT the stock decrement fails, you have an order for a product that still shows full stock. A transaction makes both operations atomic — either both succeed or both are rolled back.
- **Prisma transactions:**
```javascript
await prisma.$transaction(async (tx) => {
  // All operations inside here are atomic
  const order = await tx.order.create({ data: {...} })
  await tx.product.update({
    where: { id: productId },
    data: { quantity: { decrement: quantity } }
  })
  return order
})
```
- **State machine thinking:** An order can only move FORWARD through states. A DELIVERED order cannot go back to PENDING. You enforce this in your service layer.

### Afternoon: Build (4 hours)

**Orders API:**
- `POST /api/orders` — BUYER, wrapped in `$transaction`
- `GET /api/orders/buyer` — BUYER's orders with product + farmer details
- `GET /api/orders/farmer` — FARMER's incoming orders
- `PATCH /api/orders/:id/status` — FARMER, validate state machine transition
- `POST /api/orders/:id/cancel` — BUYER, only if PENDING

**State machine validation (add this to order.service.js):**
```javascript
const VALID_TRANSITIONS = {
  PENDING:    ['ACCEPTED', 'CANCELLED'],
  ACCEPTED:   ['PACKED', 'CANCELLED'],
  PACKED:     ['DISPATCHED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED:  [],
  CANCELLED:  []
}

const validateTransition = (current, next) => {
  if (!VALID_TRANSITIONS[current].includes(next)) {
    throw new ApiError(400, `Cannot move order from ${current} to ${next}`)
  }
}
```

**Analytics API (for farmer dashboard):**
```javascript
// GET /api/analytics/farmer
// Run all 4 queries in parallel with Promise.all
const [revenueByDay, topProducts, categoryBreakdown, summary] = await Promise.all([
  prisma.$queryRaw`
    SELECT DATE_TRUNC('day', created_at) as day, 
           SUM(total_amount) as revenue,
           COUNT(*) as orders
    FROM orders 
    WHERE farmer_id = ${farmerId}::uuid
      AND status = 'DELIVERED'
      AND created_at > NOW() - INTERVAL '7 days'
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY day ASC
  `,
  // ... other queries from architecture doc
])
```

✅ **Day 3 Done when:** Orders can be placed, farmer can accept/decline, state transitions are enforced, analytics endpoint returns data.

---

## PARTNER (Dev 2) — Day 3

### Afternoon: Build (4-5 hours)

**Farmer Dashboard page:**
- 4 KPI stat cards: earnings this month, active listings, pending orders, completion rate
- "Recent orders" table: shows last 5 orders with status badges
- "My listings" quick view: 3 product cards with edit/delete buttons
- Connect to GET /api/analytics/farmer (use TanStack Query)
- Use Recharts `LineChart` for revenue: `npm install recharts`

**Buyer Orders page:**
- List of all buyer orders
- Order status badge with color coding:
  - PENDING → amber
  - ACCEPTED → blue
  - DISPATCHED → purple
  - DELIVERED → green
  - CANCELLED → red
- Click order → order detail page with chat panel placeholder

**Farmer Orders page:**
- Incoming orders with Accept/Decline buttons (for PENDING)
- Status update dropdown (for accepted orders)
- Connect to PATCH /api/orders/:id/status

✅ **Day 3 Done when:** Farmer sees their dashboard with real data, buyer sees their orders, farmer can update order status from the UI.

---

# DAY 4 — REAL-TIME (Socket.IO)
**Theme: The hardest day. Real-time everything.**

---

## YOU (Dev 1) — Day 4

### Morning: Learn (2 hours)
**Topic: Socket.IO architecture — CRITICAL to understand before coding**

Read this carefully:

**What Socket.IO rooms are:**
- A "room" is just a label. When a client joins `auction:abc123`, the server can emit events to ALL clients in that room.
- `io.to('auction:abc123').emit('bid:new', data)` → every browser watching that auction gets it
- `socket.join('user:userId')` → the personal room for private notifications

**The authentication problem in WebSockets:**
HTTP has Authorization headers. WebSocket connection doesn't. You solve this by sending the JWT in the Socket.IO handshake auth:
```javascript
// Client sends:
const socket = io(SERVER_URL, { auth: { token: accessToken } })

// Server reads it:
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  socket.userId = decoded.userId
  next()
})
```

**The server-authoritative timer concept:**
Never trust client clocks. Instead:
- Store `endTime` as a UTC timestamp in the database when creating an auction
- Client receives `endTime`, calculates `remaining = endTime - Date.now()` every second
- Even if a user joins mid-auction, they see the correct remaining time
- No sync needed. No server timer. Pure math.

### Afternoon: Build (5 hours)

**Step 1: Socket.IO server setup (45 min)**
```javascript
// src/config/socket.js
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'

let io

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL, credentials: true }
  })
  
  // Auth middleware - runs before connection is established
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) return next(new Error('Authentication error'))
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.userId = decoded.userId
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })
  
  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`)
    
    // Every user joins their personal room immediately
    socket.join(`user:${socket.userId}`)
    
    // Auction room
    socket.on('join:auction', ({ auctionId }) => {
      socket.join(`auction:${auctionId}`)
    })
    
    // Chat room
    socket.on('join:chat', ({ orderId }) => {
      socket.join(`chat:${orderId}`)
    })
    
    socket.on('send:message', async ({ orderId, content }) => {
      const message = await prisma.message.create({
        data: { orderId, senderId: socket.userId, content },
        include: { sender: { select: { name: true, avatar: true } } }
      })
      io.to(`chat:${orderId}`).emit('chat:message', message)
    })
    
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`)
    })
  })
  
  return io
}

export const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized')
  return io
}
```

**Step 2: Connect order status updates to Socket.IO (30 min)**
In `order.service.js`, after updating status:
```javascript
import { getIO } from '../../config/socket.js'

// After PATCH /orders/:id/status succeeds:
getIO().to(`user:${order.buyerId}`).emit('order:updated', {
  orderId: order.id,
  status: newStatus,
  updatedAt: new Date()
})
```

**Step 3: Build the Auction system (2.5 hours)**

`POST /api/auctions` — FARMER, creates auction with startTime/endTime
`GET /api/auctions` — public, filter by status
`GET /api/auctions/:id` — includes all bids
`POST /api/auctions/:id/bid` — BUYER, validates amount > currentBid

```javascript
// auction.service.js - place a bid
export const placeBid = async (auctionId, bidderId, amount) => {
  const auction = await prisma.auction.findUnique({ where: { id: auctionId } })
  
  if (auction.status !== 'LIVE') throw new ApiError(400, 'Auction is not live')
  if (new Date() > auction.endTime) throw new ApiError(400, 'Auction has ended')
  if (auction.currentBid && amount <= auction.currentBid) {
    throw new ApiError(400, `Bid must be higher than current bid of ${auction.currentBid}`)
  }
  if (auction.farmerId === bidderId) throw new ApiError(400, 'Cannot bid on your own auction')
  
  // Use a transaction: save bid + update currentBid atomically
  const [bid] = await prisma.$transaction([
    prisma.bid.create({ data: { auctionId, bidderId, amount } }),
    prisma.auction.update({ where: { id: auctionId }, data: { currentBid: amount } })
  ])
  
  // Broadcast to everyone in the auction room
  getIO().to(`auction:${auctionId}`).emit('bid:new', {
    auctionId,
    bidderName: bid.bidder?.name || 'Anonymous',
    amount: Number(amount),
    timestamp: new Date()
  })
  
  return bid
}
```

**Step 4: Cron job to close expired auctions (30 min)**
```javascript
// src/jobs/auctionCron.js
import cron from 'node-cron'
import { prisma } from '../config/db.js'
import { getIO } from '../config/socket.js'

export const startAuctionCron = () => {
  // Runs every minute: '* * * * *'
  cron.schedule('* * * * *', async () => {
    const expiredAuctions = await prisma.auction.findMany({
      where: { status: 'LIVE', endTime: { lte: new Date() } },
      include: { bids: { orderBy: { amount: 'desc' }, take: 1 } }
    })
    
    for (const auction of expiredAuctions) {
      const winner = auction.bids[0] || null
      await prisma.auction.update({
        where: { id: auction.id },
        data: {
          status: 'ENDED',
          winnerId: winner?.bidderId || null
        }
      })
      
      getIO().to(`auction:${auction.id}`).emit('auction:ended', {
        auctionId: auction.id,
        winner: winner?.bidderId || null,
        finalPrice: winner?.amount || auction.startingPrice
      })
    }
  })
}
```

**Step 5: Watchlist API + fan-out (30 min)**
```javascript
// When a product is restocked (quantity updated from 0):
if (oldProduct.quantity === 0 && newQuantity > 0) {
  const watchers = await prisma.watchlist.findMany({ where: { productId } })
  
  // Create notifications for all watchers in parallel
  await prisma.notification.createMany({
    data: watchers.map(w => ({
      userId: w.userId,
      type: 'RESTOCK',
      title: `${product.name} is back in stock!`,
      body: `${product.farmer.name} restocked ${newQuantity} ${product.unit}`,
      link: `/products/${productId}`
    }))
  })
  
  // Push to all online watchers
  watchers.forEach(w => {
    getIO().to(`user:${w.userId}`).emit('notification:new', {
      title: `${product.name} is back in stock!`,
      link: `/products/${productId}`
    })
  })
}
```

✅ **Day 4 Done when:** Order status emits to buyer, auctions accept bids and broadcast, cron closes expired auctions, watchlist sends alerts.

---

## PARTNER (Dev 2) — Day 4

### Morning: Learn (1.5 hours)
**Topic: Socket.IO client patterns in React**
- Read Socket.IO client docs (30 min)
- Understand: why you need a singleton socket instance (don't create new socket on every render)
- Understand: cleanup in useEffect return (prevent memory leaks)

### Afternoon: Build (4 hours)

**Step 1: Socket.IO client singleton**
```javascript
// lib/socket.js
import { io } from 'socket.io-client'

let socket

export const getSocket = (token) => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      auth: { token },
      autoConnect: false
    })
  }
  return socket
}
```

**Step 2: Notification bell component**
```javascript
// components/NotificationBell.jsx
'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { getSocket } from '@/lib/socket'

export default function NotificationBell() {
  const [unread, setUnread] = useState(0)
  const { accessToken } = useAuthStore()
  
  useEffect(() => {
    const socket = getSocket(accessToken)
    socket.connect()
    
    socket.on('notification:new', () => setUnread(prev => prev + 1))
    socket.on('order:updated', (data) => {
      // Show a toast
      toast.info(`Order ${data.orderId} is now ${data.status}`)
    })
    
    return () => {
      socket.off('notification:new')
      socket.off('order:updated')
    }
  }, [accessToken])
  
  return (
    <button className="relative">
      <BellIcon />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
          {unread}
        </span>
      )}
    </button>
  )
}
```

**Step 3: Build the Auction room page**
This is the most complex frontend page. Take time on it:
- Countdown timer component (calculates from `endTime - Date.now()` every second)
- Live bid feed (new bids scroll in from top, animated)
- Bid input form
- Connection to Socket.IO auction room

**Step 4: Chat component**
- Reusable `ChatWindow` that takes `orderId` as a prop
- Shows message history, input field, send button
- Real-time via `socket.on('chat:message')`

✅ **Day 4 Done when:** Auction room shows live bids, order status toasts work, chat works between farmer and buyer.

---

# DAY 5 — AI + POLISH
**Theme: AI Price Advisor + UI polish + remaining features**

---

## YOU (Dev 1) — Day 5

### Morning: Learn (1 hour)
**Topic: LLM API integration — structured outputs**

Understand:
- `gpt-4o-mini` costs ~$0.00015 per 1K input tokens. A price suggestion costs ~$0.001. Very cheap.
- Structured output: tell the model to respond ONLY in JSON format so you can parse it
- Always wrap OpenAI calls in try/catch — if the API is down, show a graceful error, not a crash

### Afternoon: Build (3 hours)

**AI Price Advisor endpoint:**
```javascript
// src/modules/ai/ai.routes.js
// POST /api/ai/suggest-price
// Body: { cropName, quantity, unit, location }

import OpenAI from 'openai'
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const suggestPrice = asyncHandler(async (req, res) => {
  const { cropName, quantity, unit, location } = req.body
  
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 200,
    messages: [{
      role: 'system',
      content: 'You are an agricultural pricing assistant for Indian markets. Respond ONLY with valid JSON, no markdown, no explanation outside the JSON.'
    }, {
      role: 'user',
      content: `Suggest a fair market price for: ${quantity} ${unit} of ${cropName} from ${location}. 
      Respond with exactly this JSON format: 
      {"minPrice": <number>, "maxPrice": <number>, "unit": "${unit}", "reason": "<2 sentence explanation>"}`
    }]
  })
  
  const text = completion.choices[0].message.content
  const suggestion = JSON.parse(text)  // Parse the JSON response
  
  res.json(new ApiResponse(200, suggestion))
})
```

**Build Reviews API:**
- `POST /api/reviews/:userId` — BUYER can review a FARMER after a DELIVERED order
- `GET /api/users/:id/reviews` — public, paginated reviews list
- Validate: buyer must have a DELIVERED order from this farmer before reviewing

**Build Notifications API:**
- `GET /api/notifications` — auth user's notification history, ordered by `createdAt DESC`
- `PATCH /api/notifications/read-all` — marks all as read

**Deploy the backend (end of Day 5):**
```bash
# On Render.com:
# 1. Connect your GitHub repo
# 2. Set environment variables (copy from .env)
# 3. Build command: npm install
# 4. Start command: node index.js
# Set DATABASE_URL to your Neon.tech PostgreSQL URL
# Test all endpoints with the live URL
```

✅ **Day 5 Done when:** AI suggestions work, reviews work, backend is LIVE on Render.

---

## PARTNER (Dev 2) — Day 5

### Afternoon: Build (4-5 hours)

**Create product form (Farmer):**
- Full form with image upload preview (show preview before upload)
- Category select, organic toggle, harvest date picker
- "Get AI Price" button → calls POST /api/ai/suggest-price → shows suggestion card
- On submit → POST /api/products with FormData

**Product detail page:**
- Large image gallery
- Farmer info card with Trust Score circular progress
- "Buy Now" form (quantity selector → order placement)
- Reviews section

**General UI polish pass:**
- Add loading skeletons everywhere data is fetching
- Add Sonner toasts for all success/error states
- Ensure all pages are mobile-responsive
- Add empty states ("No products yet" with a nice illustration)
- Make sure the color theme (green + amber) is consistent

✅ **Day 5 Done when:** Create product form works with AI suggestion, product detail page is polished.

---

# DAY 6 — TESTING + SEED DATA + DEPLOY FRONTEND
**Theme: Make it look real, fix bugs, go live**

---

## YOU (Dev 1) — Day 6

### Afternoon: Build (4 hours)

**Write the seed script:**
```javascript
// prisma/seed.js
// Creates:
// - 5 farmer accounts (farmer1@test.com through farmer5@test.com, password: test1234)
// - 3 buyer accounts (buyer1@test.com, password: test1234)
// - 20 diverse products (vegetables, fruits, grains, dairy)
// - 2 LIVE auctions (endTime = 2 hours from now)
// - 1 UPCOMING auction (startTime = tomorrow)
// - Some completed orders with reviews

// Run with: npx prisma db seed
```

**Fix all known bugs** (spend 1.5 hours on this — it's important)
- Test every API endpoint methodically
- Check error messages are meaningful (not stack traces)
- Add 404 handler for unknown routes
- Add global error handler:
```javascript
// In app.js - last middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'
  res.status(statusCode).json({ success: false, message })
})
```

**Security checklist:**
- [ ] No passwords in API responses (check every endpoint)
- [ ] All farmer routes have `authorize('FARMER')` middleware
- [ ] Farmers can only edit/delete THEIR OWN products (check in service layer)
- [ ] Buyers can only cancel THEIR OWN orders
- [ ] Input validation on all POST/PATCH endpoints

---

## PARTNER (Dev 2) — Day 6

### Afternoon: Build (4-5 hours)

**Farmer analytics dashboard (polished):**
- Install and configure Recharts: `npm install recharts`
- Revenue line chart (7-day), connect to /api/analytics/farmer
- Top products bar chart
- Category donut chart
- KPI cards with icons (shadcn Card + Lucide icons)

**Complete watchlist UI:**
- Heart/bookmark button on every product card
- Toggle watch/unwatch via API
- "My Watchlist" section on buyer dashboard

**Deploy to Vercel:**
```bash
# Push to GitHub main
# Vercel auto-detects Next.js
# Add environment variable: NEXT_PUBLIC_API_URL = your Render backend URL
# Deploy
```

**Test the full flow end-to-end:**
- Register as farmer → create product → set AI price
- Register as buyer → browse → place order → watch farmer update status → see real-time toast
- Go to auctions page → bid in a live auction → watch bid feed update

✅ **Day 6 Done when:** Both backend and frontend are LIVE, seed data is in the DB, end-to-end flow works.

---

# DAY 7 — README + PORTFOLIO + FINAL POLISH
**Theme: Make it look elite. This day is as important as coding.**

---

## YOU (Dev 1) — Day 7

### Morning (3 hours):
**Write the README** (use the template from the architecture document)
- Add real screenshots (take them from your deployed app)
- Record a 30-60 second GIF of the auction room in action (Kap / ScreenToGif)
- Write the "Engineering Highlights" section with SPECIFIC details from your implementation
- Add the live demo link

**Write your LinkedIn post draft:**
```
Just shipped HarvestHive — a full-stack agricultural marketplace 
I built in 7 days as part of a hackathon.

Tech: Next.js · Node.js · PostgreSQL · Socket.IO · OpenAI

What I'm most proud of:
→ Live auction system with real-time WebSocket bidding
→ JWT auth with refresh token rotation
→ AI-powered crop price advisor (GPT-4o-mini)
→ Watchlist fan-out notifications (pub/sub pattern)
→ SQL aggregation analytics dashboard

GitHub: [link] | Live: [link]
```

### Afternoon (2 hours):
**Prepare interview answers (practice saying these out loud):**

1. "Tell me about this project"
   → Lead with the pitch, then pick your favorite feature to go deep on

2. "How does the auction system work?"
   → Socket.IO rooms, server-authoritative timer, bid validation, cron job

3. "How does your auth work?"
   → bcrypt, JWT, access + refresh, httpOnly cookie, rotation

4. "What was the hardest technical challenge?"
   → Pick one genuine challenge you faced and how you solved it

5. "What would you improve?"
   → Have 3 real answers ready (payment integration, Redis caching, proper testing)

---

## PARTNER (Dev 2) — Day 7

### Morning (3 hours):
**Final UI polish pass:**
- Test on mobile (Chrome DevTools → 375px viewport)
- Fix any broken layouts
- Add proper error pages (not-found.jsx, error.jsx in Next.js)
- Make sure all loading states are implemented

**Write README section for frontend:**
- Add screenshots of all major pages
- Document how to run locally

### Afternoon (2 hours):
**Cross-browser testing:**
- Chrome, Firefox, Safari (if available)
- Fix any inconsistencies

**Demo prep:**
- Plan a 5-minute demo flow (what to show, in what order)
- Best demo order: Home page → AI price creation → Place order → Auction room bidding → Farmer sees notification → Analytics dashboard

---

# DAILY SYNC TEMPLATE (copy this to your messaging app)

```
--- DAILY STANDUP ---
Date: 
Dev 1 (You):
  ✅ Done yesterday:
  🔨 Doing today:
  🚧 Blockers:

Dev 2 (Partner):
  ✅ Done yesterday:
  🔨 Doing today:
  🚧 Blockers:

Shared:
  🔗 Backend URL:
  🔗 Frontend URL:
  🔗 Any new env vars added:
---------------------
```

---

# WORK DISTRIBUTION SUMMARY

| Feature | Owner | Day |
|---------|-------|-----|
| Backend setup + Prisma schema | YOU | Day 1 |
| JWT Auth (full implementation) | YOU | Day 1 |
| Next.js setup + routing | Partner | Day 1 |
| Login/Register pages + Zustand | Partner | Day 1 |
| Products API (CRUD + Cloudinary) | YOU | Day 2 |
| Trust Score algorithm | YOU | Day 2 |
| Marketplace home + product cards | Partner | Day 2 |
| Auth connection end-to-end | Partner | Day 2 |
| Orders API + state machine | YOU | Day 3 |
| Analytics API (SQL aggregations) | YOU | Day 3 |
| Farmer + Buyer dashboards | Partner | Day 3 |
| Socket.IO server architecture | YOU | Day 4 |
| Auction API + bidding system | YOU | Day 4 |
| Auction cron job | YOU | Day 4 |
| Watchlist fan-out notifications | YOU | Day 4 |
| Auction room UI | Partner | Day 4 |
| Notification bell component | Partner | Day 4 |
| Chat UI | Partner | Day 4 |
| AI Price Advisor API | YOU | Day 5 |
| Reviews API | YOU | Day 5 |
| Backend deployment (Render) | YOU | Day 5 |
| Create product form + AI button | Partner | Day 5 |
| Product detail page polish | Partner | Day 5 |
| Seed data script | YOU | Day 6 |
| Security audit + bug fixes | YOU | Day 6 |
| Analytics dashboard UI (Recharts) | Partner | Day 6 |
| Frontend deployment (Vercel) | Partner | Day 6 |
| README + documentation | YOU | Day 7 |
| Interview prep | YOU | Day 7 |
| Final UI polish + mobile | Partner | Day 7 |
| Demo prep | BOTH | Day 7 |

**Your contribution: ~65% | Partner contribution: ~35%**

---

# GOLDEN RULES FOR THE WEEK

1. **Commit every night.** Nothing is "done" until it's pushed to GitHub.
2. **Test as you build.** Don't write 3 features then test. Test each one immediately.
3. **Backend first, frontend second.** Partner should always be building UI for APIs you finished yesterday — never waiting on each other.
4. **When stuck for >30 minutes, ask.** Don't lose 2 hours to a bug. Check the error, Google it, then ask after 30 min.
5. **Seed data is not optional.** A demo with empty database looks unprofessional.
6. **Deploy early.** Both of you should be deploying by Day 5. Local-only projects feel unfinished.
7. **The demo is a product story.** Practice showing it as a user journey, not a feature list.
