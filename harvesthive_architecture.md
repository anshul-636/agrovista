# 🌾 HarvestHive — Complete Architecture & README Guide

---

## THE NAME

### **HarvestHive**

**Why this name works:**
- "Harvest" → instantly communicates agriculture/farming
- "Hive" → suggests a community/marketplace (bees, activity, collaboration)  
- Together → a living ecosystem where farmers and buyers connect
- Domain-ready: `harvesthive.io` / `harvesthive.app` — professional and believable as a real startup
- Memorable in one hear — recruiters won't forget it
- Works as a GitHub repo name: `harvesthive`

**Tagline:** *"Farm to Buyer. Direct."*

---

## THE 6 STANDOUT FEATURES (Original 4 + 2 New)

### Feature 1 — Live Auction System *(original)*
Real-time bidding via Socket.IO. Server-authoritative timer. Auto-winner via cron.

### Feature 2 — AI Price Advisor *(original)*
OpenAI GPT-4o mini suggests optimal listing price with market context explanation.

### Feature 3 — Real-time Order Status Push *(original)*
Farmer marks order "Dispatched" → buyer's UI updates via Socket.IO without refresh.

### Feature 4 — Farmer Trust Score *(original)*
Computed 0–100 score from ratings + order completion rate + response speed.

### ⭐ Feature 5 — Smart Watchlist & Restock Alerts *(NEW)*
**What it is:** Buyers can "Watch" any product. When that product is restocked (quantity updated), or the same farmer creates a live auction for that crop, every watcher gets a real-time in-app notification pushed via Socket.IO — and a badge count increments on the bell icon.

**Why it's impressive:**
- This is the pattern behind Amazon's "Notify me when available", Swiggy's "Restaurant open" alerts, and Airbnb's price drop notifications
- Uses a proper pub/sub model: a product has watchers → restock event → fan-out notification to all watchers
- All within the Socket.IO infrastructure already built for auctions — minimal extra work, maximum visual impact
- Shows you understand event-driven design and user engagement mechanics

**What it teaches:**
- Event fan-out: one event triggers notifications for N users (producer → multiple consumers)
- Notification model design: `notifications` table with `read`/`unread` status, dismissal, linking back to the relevant resource
- In-app notification bell with unread count badge (real-time via Socket.IO)
- The difference between "push" (Socket.IO for online users) and "pull" (REST endpoint to fetch notification history)

**Interview story:** *"When a farmer restocks tomatoes, my system queries all users who have watched that product, then emits a targeted Socket.IO event to each of their personal user rooms. It's a fan-out publish pattern — one event triggers N notifications. I persist each notification in the DB so users can see their history even if they were offline."*

---

### ⭐ Feature 6 — Farmer Analytics Dashboard *(NEW)*
**What it is:** A dedicated analytics section in the farmer dashboard showing:
- **Revenue chart** — last 7 days earnings (line chart, Recharts)
- **Top products** — which listings generated the most orders (bar chart)
- **Category breakdown** — revenue split by vegetable / fruit / grain (donut chart)
- **Key metrics** — total earnings this month, orders completed, avg. order value, products active

**Why it's impressive:**
- Every real SaaS product has an analytics dashboard — this makes the project look like a real product
- It's built with pure SQL aggregation queries — no extra libraries, no external analytics service
- Recharts looks beautiful with Tailwind and is easy to implement
- This is visually the most impressive screen in the entire app when demoed
- Shows you understand data aggregation, not just storage

**What it teaches:**
- SQL aggregation: `GROUP BY`, `SUM()`, `COUNT()`, `DATE_TRUNC()`, `WHERE created_at > NOW() - INTERVAL '7 days'`
- Recharts: `LineChart`, `BarChart`, `PieChart` with responsive containers
- Data transformation: shaping DB query results into chart-ready `[{ date, revenue }]` format
- "Stats API" design pattern: `/api/analytics/farmer` returns pre-aggregated summary objects

**Interview story:** *"The analytics dashboard runs 4 aggregation queries against the orders table — revenue grouped by day for the past 7 days, top products by order count, category revenue breakdown, and monthly totals. I wrote these as raw Prisma `$queryRaw` calls because ORM methods can't express `DATE_TRUNC` and `SUM` together cleanly. The results feed Recharts components on the frontend."*

---

## COMPLETE SYSTEM ARCHITECTURE

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           HARVESTHIVE                               │
│                                                                     │
│  ┌──────────────────┐      HTTPS       ┌──────────────────────┐    │
│  │                  │ ◄──────────────► │                      │    │
│  │   Next.js 14     │                  │   Express.js API     │    │
│  │   (Vercel)       │    REST + WS     │   (Render.com)       │    │
│  │                  │ ◄──────────────► │                      │    │
│  │  App Router      │                  │  /api/v1/...         │    │
│  │  Tailwind CSS    │                  │  Socket.IO server    │    │
│  │  shadcn/ui       │                  │  node-cron           │    │
│  │  TanStack Query  │                  │  BullMQ (optional)   │    │
│  │  Zustand         │                  │                      │    │
│  │  Recharts        │                  │                      │    │
│  └──────────────────┘                  └──────────┬───────────┘    │
│                                                   │                 │
│                              ┌────────────────────┼──────────────┐ │
│                              │                    │              │ │
│                         ┌────▼─────┐    ┌─────────▼──────┐      │ │
│                         │          │    │                │      │ │
│                         │PostgreSQL│    │  Cloudinary    │      │ │
│                         │(Supabase │    │  (Image CDN)   │      │ │
│                         │ or Neon) │    │                │      │ │
│                         │          │    └────────────────┘      │ │
│                         │ Prisma   │                             │ │
│                         │   ORM    │    ┌────────────────┐      │ │
│                         └──────────┘    │                │      │ │
│                                         │  OpenAI API    │      │ │
│                                         │  (gpt-4o-mini) │      │ │
│                                         │                │      │ │
│                                         └────────────────┘      │ │
│                              └────────────────────────────────── ┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Request Flow (What Actually Happens When a Buyer Places an Order)

```
[1] Buyer clicks "Buy Now" on product page
         │
         ▼
[2] Next.js → POST /api/v1/orders  (with JWT in Authorization header)
         │
         ▼
[3] Express: auth middleware verifies JWT → attaches req.user
         │
         ▼
[4] authorize('BUYER') middleware confirms role
         │
         ▼
[5] Zod validation: check quantity, productId, deliveryAddress exist
         │
         ▼
[6] OrderService.create():
     a. Check product.quantity >= requested quantity
     b. Prisma transaction:
        - Create order record (status: PENDING)
        - Decrement product quantity
     c. Emit Socket.IO event to farmer's personal room:
        io.to('user:${farmerId}').emit('order:new', { orderId, ... })
         │
         ▼
[7] Express returns 201 Created { order: {...} }
         │
         ▼
[8] Frontend (TanStack Query):
     - Invalidates 'orders' cache
     - Shows success toast
     - Redirects to /orders/${orderId}
         │
         ▼
[9] Farmer's dashboard (if open) receives Socket.IO 'order:new' event
    → Toast notification: "New order from Rahul for 5kg Tomatoes!"
    → Incoming orders count badge increments
```

### WebSocket Architecture (Socket.IO Rooms)

```
Socket.IO Server
│
├── Room: "user:{userId}"          → Personal room for every user
│   Events received:
│   ├── order:new                  → Farmer gets new order notification
│   ├── order:updated              → Buyer gets order status change
│   ├── watchlist:alert            → Buyer gets restock notification
│   └── notification:new           → Generic in-app notification
│
├── Room: "auction:{auctionId}"    → All users watching an auction
│   Events received:
│   ├── bid:new                    → New bid placed { bidder, amount, timestamp }
│   ├── auction:ended              → Timer hit zero { winner, finalAmount }
│   └── auction:extended           → (Optional) Timer extended if bid in last 30s
│
└── Room: "chat:{orderId}"         → Two-way chat between farmer and buyer
    Events received:
    └── chat:message               → New message { sender, content, timestamp }
```

### Authentication Flow (JWT with Refresh)

```
[REGISTER/LOGIN]
User submits credentials
      │
      ▼
Server validates → bcrypt.compare(password, hash)
      │
      ▼
Generate:
  accessToken  = JWT { userId, role, exp: 15min }  → sent in response body
  refreshToken = JWT { userId, exp: 7days }         → set as httpOnly cookie
      │
      ▼
Client stores accessToken in Zustand memory
Client stores refreshToken cookie automatically (httpOnly = JS can't read it)

[EVERY REQUEST]
Axios interceptor adds: Authorization: Bearer <accessToken>
      │
      ▼
Server: auth middleware decodes + verifies token
If valid → req.user = { id, role }
If expired (401) → Axios interceptor calls POST /auth/refresh
                   → Server reads refreshToken cookie → issues new accessToken
                   → Retry original request with new token

[SECURITY]
httpOnly cookie → XSS can't steal refresh token
Refresh token rotation → each refresh issues a NEW refresh token, old one invalidated
```

### Database Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    users    │         │  products   │         │   orders    │
│─────────────│         │─────────────│         │─────────────│
│ id (PK)     │◄──────  │ farmerId FK │         │ id (PK)     │
│ email       │  1:N    │─────────────│  1:N    │ buyerId FK  │
│ passwordHash│         │ id (PK)     │◄──────  │ farmerId FK │
│ name        │         │ name        │         │ productId FK│
│ role        │         │ description │         │ quantity    │
│ phone       │         │ category    │         │ totalAmount │
│ location    │         │ price       │         │ status      │
│ avatar      │         │ unit        │         │ deliveryAddr│
│ bio         │         │ quantity    │         │ createdAt   │
│ createdAt   │         │ images[]    │         └──────┬──────┘
└──────┬──────┘         │ isOrganic   │                │
       │                │ harvestDate │                │
       │                │ isAvailable │         ┌──────▼──────┐
       │                │ createdAt   │         │  messages   │
       │                └──────┬──────┘         │─────────────│
       │                       │                │ id (PK)     │
       │              ┌────────▼──────┐         │ orderId FK  │
       │              │  watchlist    │         │ senderId FK │
       │              │───────────────│         │ content     │
       │              │ id (PK)       │         │ createdAt   │
       │              │ userId FK     │         └─────────────┘
       │              │ productId FK  │
       │              │ createdAt     │
       │              └───────────────┘
       │
       │         ┌─────────────┐         ┌─────────────┐
       │         │  auctions   │         │    bids     │
       │         │─────────────│         │─────────────│
       └───────► │ farmerId FK │         │ id (PK)     │
         1:N     │─────────────│  1:N    │ auctionId FK│
                 │ id (PK)     │◄──────  │ bidderId FK │
                 │ productName │         │ amount      │
                 │ startingPrc │         │ createdAt   │
                 │ currentBid  │         └─────────────┘
                 │ winnerId    │
                 │ status      │         ┌─────────────┐
                 │ startTime   │         │   reviews   │
                 │ endTime     │         │─────────────│
                 │ createdAt   │         │ id (PK)     │
                 └─────────────┘         │ giverId FK  │
                                         │ receiverId FK│
                 ┌─────────────┐         │ rating (1-5)│
                 │notifications│         │ comment     │
                 │─────────────│         │ createdAt   │
                 │ id (PK)     │         └─────────────┘
                 │ userId FK   │
                 │ type        │
                 │ title       │
                 │ body        │
                 │ link        │
                 │ isRead      │
                 │ createdAt   │
                 └─────────────┘
```

### Analytics Query Architecture

```javascript
// Example: What the analytics endpoint runs

// 1. Revenue last 7 days (for line chart)
SELECT 
  DATE_TRUNC('day', created_at) AS day,
  SUM(total_amount) AS revenue,
  COUNT(*) AS order_count
FROM orders
WHERE farmer_id = $1
  AND status = 'DELIVERED'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day ASC;

// 2. Top 5 products by order count
SELECT 
  p.name,
  COUNT(o.id) AS order_count,
  SUM(o.total_amount) AS revenue
FROM orders o
JOIN products p ON o.product_id = p.id
WHERE o.farmer_id = $1
GROUP BY p.id, p.name
ORDER BY order_count DESC
LIMIT 5;

// 3. Revenue by category (for donut chart)  
SELECT 
  p.category,
  SUM(o.total_amount) AS revenue
FROM orders o
JOIN products p ON o.product_id = p.id
WHERE o.farmer_id = $1
  AND o.status = 'DELIVERED'
GROUP BY p.category;

// 4. Summary stats
SELECT
  SUM(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) 
           THEN total_amount ELSE 0 END) AS this_month_revenue,
  COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END)::float / 
  NULLIF(COUNT(*), 0) * 100 AS completion_rate,
  AVG(total_amount) AS avg_order_value
FROM orders
WHERE farmer_id = $1;
```

### Watchlist Fan-out Architecture

```
[Farmer updates product quantity from 0 → 50]
            │
            ▼
ProductService.update() detects quantity increased from 0
            │
            ▼
Query: SELECT userId FROM watchlist WHERE productId = $1
  → Returns: [userId1, userId2, userId3]
            │
            ▼
For each watcher:
  1. INSERT into notifications (userId, type: 'RESTOCK', title, link)
  2. io.to('user:${watcherId}').emit('notification:new', { ... })
            │
            ▼
Each watcher's browser (if online):
  - Bell icon badge count increments
  - Toast: "🌾 Tomatoes back in stock! Priya Farm restocked 50kg"
  - Links to product page

Offline watchers:
  - Notification saved in DB
  - They see it when they next open the app (GET /api/notifications/unread)
```

---

## README (Copy-Paste Ready for GitHub)

---

```markdown
<div align="center">

# 🌾 HarvestHive

**Farm to Buyer. Direct.**

A full-stack agricultural marketplace connecting farmers and buyers — with live auctions, real-time notifications, AI pricing, and farmer analytics.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-336791?logo=postgresql)](https://postgresql.org)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-010101?logo=socket.io)](https://socket.io)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai)](https://openai.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com)

[**Live Demo →**](https://harvesthive.vercel.app) · [API Docs →](#api-reference) · [Architecture →](#architecture)

---

![HarvestHive Demo](./docs/screenshots/auction-demo.gif)

</div>

---

## What Is HarvestHive?

HarvestHive is a two-sided marketplace where **farmers list fresh produce** and **buyers purchase directly** — cutting out middlemen, improving farmer earnings, and giving buyers fresher produce at lower prices.

Beyond a basic marketplace, HarvestHive features a **live auction system**, **real-time order tracking**, **AI-powered pricing**, a **smart watchlist with restock alerts**, and a **farmer analytics dashboard** — making it a genuinely full-featured platform.

---

## ✨ Features

### Core Marketplace
- **Dual-role Auth** — Farmers and buyers have separate accounts, dashboards, and permissions via JWT + RBAC
- **Product Listings** — Farmers create listings with Cloudinary-hosted images, harvest date, stock quantity, and organic tags
- **Smart Search** — Filter by category, price range, location, organic status
- **Order Management** — Full order lifecycle from placement → acceptance → dispatch → delivery

### 🔴 Live Auction System
Real-time bidding powered by Socket.IO. Each auction runs in its own WebSocket room. Bids are validated server-side (must exceed current bid), the countdown timer is server-authoritative, and a cron job automatically closes auctions and determines winners.

### 🟡 AI Price Advisor
When creating a listing, farmers can request an AI-suggested price range. A single GPT-4o mini API call analyzes crop type, quantity, unit, and location to return a market-context price recommendation with explanation.

### 🟢 Real-time Order Status Push
Status updates (Accepted → Packed → Dispatched → Delivered) are pushed via Socket.IO to the buyer's active session. No refresh needed. Powered by personal user rooms.

### 🔵 Farmer Trust Score
A computed 0–100 trust score displayed on every farmer profile and product listing. Calculated from: average star rating (40%), order completion rate (40%), and average response time (20%). Aggregated via SQL on every profile view.

### ⭐ Smart Watchlist & Restock Alerts
Buyers can watch any product. When a farmer restocks a watched product, the system fan-outs a real-time Socket.IO notification to all watchers (with DB persistence for offline users). Notification bell with unread count badge.

### 📊 Farmer Analytics Dashboard
A visual analytics section for farmers showing:
- Revenue trend (last 7 days) — line chart
- Top products by order volume — bar chart  
- Revenue by category — donut chart
- KPI cards: monthly earnings, completion rate, avg. order value

Built with Recharts and powered by PostgreSQL aggregation queries (`DATE_TRUNC`, `GROUP BY`, `SUM`).

### Farmer-Buyer Chat
Per-order real-time chat via Socket.IO. Message history persisted in PostgreSQL. Open from any order detail page.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 (App Router) | SSR, layouts, routing |
| Styling | Tailwind CSS + shadcn/ui | Component library, responsive design |
| Charts | Recharts | Analytics dashboard visualizations |
| State | Zustand | Auth state, notifications count |
| Data fetching | TanStack Query | Server state caching, auto-refetch |
| Backend | Node.js + Express | REST API server |
| Database | PostgreSQL | Primary data store |
| ORM | Prisma | Type-safe queries, migrations |
| Auth | JWT (access + refresh) | Stateless authentication, RBAC |
| Real-time | Socket.IO | Auctions, chat, order updates, notifications |
| Images | Cloudinary | Image upload, CDN delivery, optimization |
| AI | OpenAI GPT-4o mini | Price recommendation feature |
| Scheduler | node-cron | Auction expiry, watchlist checks |
| Frontend deploy | Vercel | CI/CD on push to main |
| Backend deploy | Render | Auto-deploy Docker container |

---

## 🏗 Architecture

### System Overview

```
Browser (Next.js)
      │
      ├─── REST (HTTPS) ──────► Express API ──► PostgreSQL (Prisma)
      │                              │
      ├─── WebSocket ─────────► Socket.IO ──── Personal Rooms (user:id)
      │                              │         Auction Rooms (auction:id)
      │                              │         Chat Rooms (chat:orderId)
      │                              │
      │                         ┌────┴────┐
      │                         │  Cron   │  Checks auction expiry every minute
      │                         └─────────┘
      │
      ├─── Image Upload ──────► Cloudinary CDN
      └─── AI Request ────────► OpenAI API
```

### Role-Based Access Control

```
Role: FARMER                    Role: BUYER
├── Create/edit products         ├── Browse products
├── View/manage orders           ├── Place orders
├── Create auctions              ├── Bid in auctions
├── Update order status          ├── Watch products
├── View analytics               ├── Chat with farmers
└── Chat with buyers             └── Leave reviews
```

### Auction Lifecycle

```
UPCOMING ──── (startTime reached, cron) ────► LIVE
LIVE     ──── (bid placed) ─────────────────► LIVE (currentBid updated, broadcast)
LIVE     ──── (endTime reached, cron) ──────► ENDED (winner = highest bidder)
```

### Order State Machine

```
PENDING ──── farmer accepts ──────────────► ACCEPTED
PENDING ──── farmer declines / buyer cancels ► CANCELLED
ACCEPTED ─── farmer packs ───────────────► PACKED
PACKED ───── farmer dispatches ──────────► DISPATCHED
DISPATCHED ── delivery confirmed ─────────► DELIVERED
```

---

## 📁 Project Structure

```
harvesthive/
├── client/                     # Next.js frontend (deployed to Vercel)
│   ├── app/
│   │   ├── (auth)/            # Login, Register pages
│   │   ├── (buyer)/           # Buyer-facing routes + layout
│   │   │   ├── page.jsx       # Marketplace home
│   │   │   ├── products/      # Browse + product detail
│   │   │   ├── auctions/      # Auction list + room
│   │   │   ├── orders/        # My orders
│   │   │   └── notifications/ # Notification history
│   │   └── (farmer)/          # Farmer dashboard + routes
│   │       ├── dashboard/     # Analytics overview
│   │       ├── products/      # Manage listings
│   │       ├── orders/        # Incoming orders
│   │       └── auctions/      # My auctions
│   ├── components/
│   │   ├── ui/                # shadcn/ui auto-generated
│   │   ├── auction/           # BidTimer, BidHistory, BidInput
│   │   ├── analytics/         # RevenueChart, TopProducts, CategoryDonut
│   │   └── shared/            # ProductCard, TrustBadge, NotificationBell
│   ├── hooks/
│   │   ├── useSocket.js       # Socket.IO connection + room management
│   │   └── useNotifications.js # Unread count, mark-read
│   ├── lib/
│   │   ├── api.js             # Axios instance with JWT interceptor
│   │   └── socket.js          # Socket.IO client init (singleton)
│   └── store/
│       ├── authStore.js       # Zustand: user, token
│       └── notifStore.js      # Zustand: unread notification count
│
├── server/                     # Express backend (deployed to Render)
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js          # Prisma client singleton
│   │   │   ├── cloudinary.js  # Cloudinary config
│   │   │   └── socket.js      # Socket.IO init + event handlers
│   │   ├── middleware/
│   │   │   ├── auth.js        # verifyToken → req.user
│   │   │   ├── authorize.js   # authorize('FARMER') role guard
│   │   │   └── upload.js      # multer + cloudinary-storage
│   │   ├── modules/
│   │   │   ├── auth/          # register, login, refresh, logout
│   │   │   ├── products/      # CRUD + Cloudinary upload
│   │   │   ├── orders/        # Create, status update, history
│   │   │   ├── auctions/      # Create, bid, close
│   │   │   ├── watchlist/     # Watch/unwatch, fan-out alerts
│   │   │   ├── analytics/     # Aggregation queries → chart data
│   │   │   ├── notifications/ # Fetch, mark-read
│   │   │   ├── chat/          # Message history
│   │   │   ├── reviews/       # Create, fetch by user
│   │   │   └── ai/            # OpenAI price suggestion
│   │   ├── jobs/
│   │   │   └── auctionCron.js # node-cron: every 1min, close expired auctions
│   │   └── utils/
│   │       ├── ApiError.js    # Custom error class with status codes
│   │       ├── ApiResponse.js # { success, data, message } wrapper
│   │       └── asyncHandler.js # Wraps async controllers (no try/catch repeat)
│   ├── prisma/
│   │   ├── schema.prisma      # Full DB schema
│   │   └── seed.js            # Demo data: 5 farmers, 20 products, 2 live auctions
│   └── index.js               # App entry: Express + Socket.IO + cron start
│
└── docs/
    ├── architecture.md        # This document
    ├── api.md                 # Full API reference
    └── screenshots/           # UI screenshots for README
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or use [Neon](https://neon.tech) / [Supabase](https://supabase.com) free tier)
- Cloudinary account (free tier)
- OpenAI API key

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/harvesthive.git
cd harvesthive
```

### 2. Backend setup
```bash
cd server
cp .env.example .env
# Fill in your DATABASE_URL, JWT_SECRET, CLOUDINARY keys, OPENAI_API_KEY

npm install
npx prisma migrate dev --name init
npx prisma db seed        # Seeds demo farmers, products, auctions
npm run dev               # Starts on http://localhost:5000
```

### 3. Frontend setup
```bash
cd client
cp .env.example .env.local
# Fill in NEXT_PUBLIC_API_URL=http://localhost:5000

npm install
npm run dev               # Starts on http://localhost:3000
```

### 4. Environment Variables

**Server `.env`:**
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=another-secret-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
OPENAI_API_KEY=sk-...
CLIENT_URL=http://localhost:3000
PORT=5000
```

**Client `.env.local`:**
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

---

## 📡 API Reference

### Auth
| Method | Endpoint | Access | Description |
|--------|---------|--------|-------------|
| POST | `/api/auth/register` | Public | Create account |
| POST | `/api/auth/login` | Public | Login, receive tokens |
| POST | `/api/auth/refresh` | Public | Refresh access token |
| POST | `/api/auth/logout` | Auth | Clear refresh cookie |
| GET | `/api/auth/me` | Auth | Current user profile |

### Products
| Method | Endpoint | Access | Description |
|--------|---------|--------|-------------|
| GET | `/api/products` | Public | Browse all (with filters) |
| GET | `/api/products/:id` | Public | Product detail |
| POST | `/api/products` | Farmer | Create listing |
| PUT | `/api/products/:id` | Farmer | Update own listing |
| DELETE | `/api/products/:id` | Farmer | Delete listing |
| GET | `/api/products/farmer/mine` | Farmer | My listings |

### Orders
| Method | Endpoint | Access | Description |
|--------|---------|--------|-------------|
| POST | `/api/orders` | Buyer | Place order |
| GET | `/api/orders/buyer` | Buyer | My order history |
| GET | `/api/orders/farmer` | Farmer | Incoming orders |
| PATCH | `/api/orders/:id/status` | Farmer | Update status |

### Auctions
| Method | Endpoint | Access | Description |
|--------|---------|--------|-------------|
| GET | `/api/auctions` | Public | All auctions |
| GET | `/api/auctions/:id` | Public | Auction + bid history |
| POST | `/api/auctions` | Farmer | Create auction |
| POST | `/api/auctions/:id/bid` | Buyer | Place bid |

### Analytics
| Method | Endpoint | Access | Description |
|--------|---------|--------|-------------|
| GET | `/api/analytics/farmer` | Farmer | Revenue, top products, stats |

### Notifications
| Method | Endpoint | Access | Description |
|--------|---------|--------|-------------|
| GET | `/api/notifications` | Auth | Notification history |
| PATCH | `/api/notifications/read-all` | Auth | Mark all as read |

### Watchlist & AI
| Method | Endpoint | Access | Description |
|--------|---------|--------|-------------|
| POST | `/api/watchlist/:productId` | Buyer | Watch product |
| DELETE | `/api/watchlist/:productId` | Buyer | Unwatch product |
| GET | `/api/watchlist` | Buyer | My watched products |
| POST | `/api/ai/suggest-price` | Farmer | Get AI price suggestion |

### Socket.IO Events
| Event (Client → Server) | Payload | Description |
|------------------------|---------|-------------|
| `join:user` | `{ userId }` | Join personal notification room |
| `join:auction` | `{ auctionId }` | Join auction room for live bids |
| `place:bid` | `{ auctionId, amount }` | Place a bid |
| `join:chat` | `{ orderId }` | Join order chat room |
| `send:message` | `{ orderId, content }` | Send chat message |

| Event (Server → Client) | Payload | Description |
|------------------------|---------|-------------|
| `bid:new` | `{ auctionId, bidder, amount }` | New bid placed |
| `auction:ended` | `{ auctionId, winner, amount }` | Auction closed |
| `order:updated` | `{ orderId, status }` | Order status changed |
| `order:new` | `{ orderId, buyer, product }` | New order received (farmer) |
| `notification:new` | `{ title, body, link }` | In-app notification |
| `chat:message` | `{ sender, content, timestamp }` | New chat message |

---

## 🖼 Screenshots

| Screen | Description |
|--------|-------------|
| ![Marketplace](./docs/screenshots/marketplace.png) | **Marketplace** — Product grid with filters, trust scores, freshness tags |
| ![Auction Room](./docs/screenshots/auction.png) | **Live Auction** — Real-time bidding with animated counter and bid feed |
| ![Analytics](./docs/screenshots/analytics.png) | **Farmer Analytics** — Revenue charts, top products, KPI cards |
| ![AI Price](./docs/screenshots/ai-price.png) | **AI Price Advisor** — Contextual price suggestion with explanation |
| ![Notifications](./docs/screenshots/notifications.png) | **Watchlist Alert** — Real-time restock notification bell |

---

## 🧑‍💻 Engineering Highlights

**JWT refresh token rotation** — Each refresh issues a new token and invalidates the previous one, preventing token replay attacks.

**Server-authoritative auction timer** — Auction `endTime` is stored in DB. Clients compute `endTime - Date.now()` each second rather than running independent countdowns, eliminating drift across clients.

**Transaction-wrapped order creation** — Product stock decrement and order insert are wrapped in a Prisma transaction, preventing overselling under concurrent requests.

**Fan-out notification pattern** — A single product restock event triggers a DB query for all watchers, persists N notification records, and emits N targeted Socket.IO events — same pattern used by Amazon "Notify me" and Airbnb price alerts.

**PostgreSQL aggregation for analytics** — `DATE_TRUNC('day', created_at)` + `SUM(total_amount)` grouped by day, run as `$queryRaw` through Prisma, feeds the Recharts `LineChart` component directly.

---

## 🗓 Roadmap

- [x] JWT auth with roles
- [x] Product listings with Cloudinary
- [x] Order management + status machine
- [x] Socket.IO live auctions
- [x] Real-time order push
- [x] AI Price Advisor
- [x] Trust Score
- [x] Smart Watchlist & Alerts
- [x] Farmer Analytics Dashboard
- [x] Farmer-Buyer Chat
- [ ] Email notifications (Resend)
- [ ] Mobile app (React Native / Expo)
- [ ] Razorpay payment integration

---

## 👤 Author

**[Your Name]**  
[LinkedIn](https://linkedin.com/in/yourname) · [GitHub](https://github.com/yourusername) · [Portfolio](https://yoursite.dev)

---

<div align="center">

Built with ❤️ for farmers who deserve better tools.

</div>
```

---

## HOW TO USE THIS README

1. **Replace all placeholder text** — `[Your Name]`, `yourusername`, `yoursite.dev`
2. **Take real screenshots** after you build each feature — put them in `/docs/screenshots/`
3. **Record a 30-second GIF** of the live auction in action — use [Kap](https://getkap.co) (Mac) or [ScreenToGif](https://www.screentogif.com) (Windows)
4. **Deploy before adding the live demo link** — an empty link is worse than no link
5. **The "Engineering Highlights" section** is what sets this apart from generic READMEs — keep it, expand it with real details once you've built each feature

---

## RESUME SUMMARY (One-liner for your resume header)

```
HarvestHive | Agricultural Marketplace · Next.js, Node.js, PostgreSQL, Socket.IO, OpenAI
Full-stack two-sided marketplace with real-time live auctions, JWT/RBAC auth, AI pricing, 
watchlist push notifications, and farmer analytics dashboards.
```

---

*This guide covers the final scope of 6 standout features for HarvestHive. The previous build guide document contains the complete Week 1-5 building roadmap, Prisma schema, and interview prep answers.*
