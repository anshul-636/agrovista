import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 5000,
});

// Attach JWT access token to headers
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("agrovista_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// MOCK DATABASES (In-Memory Fallback)
export const mockProducts = [
  {
    id: "tomato-1",
    name: "Organic Roma Tomatoes",
    description: "Premium sun-ripened Roma tomatoes, handpicked and grown with zero synthetic pesticides. Excellent firmness and deep red coloration, perfect for cooking or salads.",
    category: "Vegetables",
    price: 45,
    unit: "kg",
    quantity: 120,
    images: [
      "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=600"
    ],
    isOrganic: true,
    harvestDate: "2026-05-25",
    farmerId: "farmer-1",
    farmerName: "Rajesh Kumar",
    farmerLocation: "Nashik, Maharashtra",
    farmerTrustScore: 94,
    reviews: [
      { id: "r1", reviewer: "Suresh Patel", rating: 5, comment: "Incredibly fresh and uniform sizes!", createdAt: "2026-05-26" },
      { id: "r2", reviewer: "Neha Singh", rating: 4, comment: "Very good quality, arrived in great packing.", createdAt: "2026-05-26" }
    ]
  },
  {
    id: "potato-1",
    name: "Yukon Gold Potatoes",
    description: "Naturally buttery-flavored Yukon Gold potatoes. Rich in texture, freshly dug from sandy soil. Kept in climate-controlled storage to maintain moisture levels.",
    category: "Vegetables",
    price: 25,
    unit: "kg",
    quantity: 500,
    images: [
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=600"
    ],
    isOrganic: false,
    harvestDate: "2026-05-20",
    farmerId: "farmer-1",
    farmerName: "Rajesh Kumar",
    farmerLocation: "Nashik, Maharashtra",
    farmerTrustScore: 94,
    reviews: []
  },
  {
    id: "rice-1",
    name: "Premium Basmati Rice (1121)",
    description: "Extra-long grain Basmati Rice 1121 steam variant. Highly aromatic, aged for 12 months for non-sticky cooking profile and maximum elongation.",
    category: "Grains",
    price: 110,
    unit: "kg",
    quantity: 2500,
    images: [
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600"
    ],
    isOrganic: true,
    harvestDate: "2026-04-10",
    farmerId: "farmer-2",
    farmerName: "Gurbaksh Singh",
    farmerLocation: "Karnal, Haryana",
    farmerTrustScore: 98,
    reviews: [
      { id: "r3", reviewer: "Hotel Taj Chef", rating: 5, comment: "Aromatic grain elongation is perfect. Consistent quality.", createdAt: "2026-05-15" }
    ]
  },
  {
    id: "onion-1",
    name: "Red Globe Onions",
    description: "Strong pungent flavored medium-sized red globe onions. Properly sun-cured with intact dry outer skins. Excellent shelf life of up to 3 months.",
    category: "Vegetables",
    price: 32,
    unit: "kg",
    quantity: 1500,
    images: [
      "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=600"
    ],
    isOrganic: false,
    harvestDate: "2026-05-18",
    farmerId: "farmer-3",
    farmerName: "Dinesh Patel",
    farmerLocation: "Rajkot, Gujarat",
    farmerTrustScore: 89,
    reviews: []
  },
  {
    id: "apple-1",
    name: "Kashmiri Royal Delicious Apples",
    description: "Crispy, sweet, and moderately juicy Kashmiri Royal Delicious Apples. Harvested from high altitude orchards in Sopore. Packed carefully in foam sleeves.",
    category: "Fruits",
    price: 160,
    unit: "kg",
    quantity: 300,
    images: [
      "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=600"
    ],
    isOrganic: true,
    harvestDate: "2026-05-22",
    farmerId: "farmer-4",
    farmerName: "Waseem Bhat",
    farmerLocation: "Sopore, Jammu & Kashmir",
    farmerTrustScore: 97,
    reviews: [
      { id: "r4", reviewer: "Fruit Union Delhi", rating: 5, comment: "Superb crunchiness and color.", createdAt: "2026-05-24" }
    ]
  }
];

export const mockAuctions = [
  {
    id: "auc-1",
    productId: "tomato-1",
    productName: "Premium Roma Tomatoes Auction",
    startingPrice: 35,
    currentBid: 42,
    unit: "kg",
    lotSize: 200, // lot size in kg
    farmerId: "farmer-1",
    farmerName: "Rajesh Kumar",
    farmerLocation: "Nashik, Maharashtra",
    farmerTrustScore: 94,
    status: "LIVE",
    startTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // started 30 mins ago
    endTime: new Date(Date.now() + 1000 * 60 * 45).toISOString(),   // ends in 45 mins
    bids: [
      { bidderName: "Amit Singh", amount: 42, timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString() },
      { bidderName: "Rahul Sharma", amount: 40, timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
      { bidderName: "Suresh K.", amount: 37, timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString() }
    ],
    images: ["https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=600"]
  },
  {
    id: "auc-2",
    productId: "rice-1",
    productName: "Aromatic Basmati Rice Lot #12",
    startingPrice: 90,
    currentBid: 98,
    unit: "kg",
    lotSize: 1000,
    farmerId: "farmer-2",
    farmerName: "Gurbaksh Singh",
    farmerLocation: "Karnal, Haryana",
    farmerTrustScore: 98,
    status: "LIVE",
    startTime: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    endTime: new Date(Date.now() + 1000 * 60 * 18).toISOString(), // ends in 18 mins
    bids: [
      { bidderName: "Priya Verma", amount: 98, timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
      { bidderName: "Amit Singh", amount: 95, timestamp: new Date(Date.now() - 1000 * 60 * 22).toISOString() }
    ],
    images: ["https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600"]
  },
  {
    id: "auc-3",
    productId: "onion-1",
    productName: "Cured RedGlobe Onions Lot",
    startingPrice: 20,
    currentBid: 24,
    unit: "kg",
    lotSize: 1500,
    farmerId: "farmer-3",
    farmerName: "Dinesh Patel",
    farmerLocation: "Rajkot, Gujarat",
    farmerTrustScore: 89,
    status: "LIVE",
    startTime: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    endTime: new Date(Date.now() + 1000 * 60 * 120).toISOString(), // ends in 2 hours
    bids: [
      { bidderName: "Harish Mehta", amount: 24, timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString() }
    ],
    images: ["https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=600"]
  }
];

export const mockOrders = [
  {
    id: "ord-9843",
    productId: "tomato-1",
    productName: "Organic Roma Tomatoes",
    farmerId: "farmer-1",
    farmerName: "Rajesh Kumar",
    buyerId: "buyer-1",
    buyerName: "Amit Singh",
    quantity: 50,
    price: 45,
    totalAmount: 2250,
    status: "DISPATCHED", // PENDING, ACCEPTED, PACKED, DISPATCHED, DELIVERED
    deliveryAddress: "HSR Layout, Sector 4, Bangalore, 560102",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    timeline: [
      { status: "PENDING", title: "Order Placed", description: "Waiting for farmer confirmation.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
      { status: "ACCEPTED", title: "Order Accepted", description: "Farmer approved your order.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString() },
      { status: "PACKED", title: "Order Packed", description: "Packed in sanitized wooden boxes.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString() },
      { status: "DISPATCHED", title: "In Transit", description: "Dispatched via Agrologistics Truck #KA-03-F-1200.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() }
    ],
    image: "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "ord-4251",
    productId: "apple-1",
    productName: "Kashmiri Royal Delicious Apples",
    farmerId: "farmer-4",
    farmerName: "Waseem Bhat",
    buyerId: "buyer-1",
    buyerName: "Amit Singh",
    quantity: 10,
    price: 160,
    totalAmount: 1600,
    status: "DELIVERED",
    deliveryAddress: "HSR Layout, Sector 4, Bangalore, 560102",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    timeline: [
      { status: "PENDING", title: "Order Placed", description: "Order successfully submitted.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
      { status: "ACCEPTED", title: "Order Accepted", description: "Farmer approved shipment.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 44).toISOString() },
      { status: "PACKED", title: "Order Packed", description: "Cushioned in foam packs.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString() },
      { status: "DISPATCHED", title: "Dispatched", description: "Shipped via AirCargo Express.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
      { status: "DELIVERED", title: "Delivered", description: "Delivered to buyer doorstep. Freshness verified.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString() }
    ],
    image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=600"
  }
];

export const mockChats = {
  "ord-9843": [
    { id: "m1", senderId: "farmer-1", senderName: "Rajesh Kumar", senderRole: "FARMER", content: "Hello Amit, I have selected the freshest Roma Tomatoes for you. They will be harvested tomorrow morning.", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString() },
    { id: "m2", senderId: "buyer-1", senderName: "Amit Singh", senderRole: "BUYER", content: "Great! Please ensure proper ventilation in crates, as the transit is about 6 hours.", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString() },
    { id: "m3", senderId: "farmer-1", senderName: "Rajesh Kumar", senderRole: "FARMER", content: "Absolutely. I am using standard plastic crates with mesh sheets. Dispatched just now!", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() }
  ]
};

// API ENDPOINTS WRAPPER
export const apiService = {
  // Auth Operations
  login: async (credentials) => {
    try {
      const res = await api.post("/auth/login", credentials);
      return res.data;
    } catch (e) {
      // Mock Login Fallback
      console.warn("[API] Login error, using mock fallback.");
      const isFarmer = credentials.email.includes("farmer");
      const user = {
        id: isFarmer ? "farmer-1" : "buyer-1",
        email: credentials.email,
        name: isFarmer ? "Rajesh Kumar" : "Amit Singh",
        role: isFarmer ? "FARMER" : "BUYER",
        phone: "+91 98765 43210",
        location: isFarmer ? "Nashik, Maharashtra" : "Bangalore, Karnataka",
        avatar: isFarmer ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" : "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        bio: isFarmer ? "Organic Farmer specializing in Tomatoes and Potatoes with over 15 years of experience." : "Bulk buyer supplying retail outlets in Bangalore.",
        trustScore: isFarmer ? 94 : undefined
      };
      return { success: true, user, token: "mock-jwt-token-abcdef" };
    }
  },

  signup: async (userData) => {
    try {
      const res = await api.post("/auth/register", userData);
      return res.data;
    } catch (e) {
      console.warn("[API] Signup error, using mock fallback.");
      const user = {
        id: `user-${Date.now()}`,
        email: userData.email,
        name: userData.name,
        role: userData.role || "BUYER",
        phone: userData.phone || "+91 99999 88888",
        location: userData.location || "Gujarat, India",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        bio: "Agricultural platform member.",
        trustScore: userData.role === "FARMER" ? 100 : undefined
      };
      return { success: true, user, token: "mock-jwt-token-signup" };
    }
  },

  // Products Operations
  getProducts: async (filters = {}) => {
    try {
      const res = await api.get("/products", { params: filters });
      return res.data;
    } catch (e) {
      console.warn("[API] getProducts error, returning mock.");
      let filtered = [...mockProducts];
      if (filters.search) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(filters.search.toLowerCase()));
      }
      if (filters.category && filters.category !== "All Categories" && filters.category !== "All") {
        filtered = filtered.filter(p => p.category.toLowerCase() === filters.category.toLowerCase());
      }
      if (filters.isOrganic === "true" || filters.isOrganic === true) {
        filtered = filtered.filter(p => p.isOrganic);
      }
      return { success: true, data: filtered };
    }
  },

  getProductById: async (id) => {
    try {
      const res = await api.get(`/products/${id}`);
      return res.data;
    } catch (e) {
      console.warn("[API] getProductById error, returning mock.");
      const item = mockProducts.find(p => p.id === id) || mockProducts[0];
      return { success: true, data: item };
    }
  },

  createProduct: async (productData) => {
    try {
      const res = await api.post("/products", productData);
      return res.data;
    } catch (e) {
      console.warn("[API] createProduct error, appending to mock database.");
      const newProduct = {
        id: `tomato-${Date.now()}`,
        name: productData.name,
        description: productData.description,
        category: productData.category || "Vegetables",
        price: Number(productData.price),
        unit: productData.unit || "kg",
        quantity: Number(productData.quantity),
        images: productData.images && productData.images.length > 0 ? productData.images : ["https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=600"],
        isOrganic: !!productData.isOrganic,
        harvestDate: productData.harvestDate || new Date().toISOString().split("T")[0],
        farmerId: "farmer-1",
        farmerName: "Rajesh Kumar",
        farmerLocation: "Nashik, Maharashtra",
        farmerTrustScore: 94,
        reviews: []
      };
      mockProducts.unshift(newProduct);
      return { success: true, data: newProduct };
    }
  },

  editProduct: async (id, productData) => {
    try {
      const res = await api.put(`/products/${id}`, productData);
      return res.data;
    } catch (e) {
      console.warn("[API] editProduct error, applying to mock database.");
      const idx = mockProducts.findIndex(p => p.id === id);
      if (idx !== -1) {
        mockProducts[idx] = { ...mockProducts[idx], ...productData };
        return { success: true, data: mockProducts[idx] };
      }
      return { success: false, error: "Product not found" };
    }
  },

  deleteProduct: async (id) => {
    try {
      const res = await api.delete(`/products/${id}`);
      return res.data;
    } catch (e) {
      console.warn("[API] deleteProduct error, deleting from mock database.");
      const idx = mockProducts.findIndex(p => p.id === id);
      if (idx !== -1) {
        mockProducts.splice(idx, 1);
        return { success: true };
      }
      return { success: false, error: "Product not found" };
    }
  },

  // Auctions Operations
  getAuctions: async () => {
    try {
      const res = await api.get("/auctions");
      return res.data;
    } catch (e) {
      return { success: true, data: mockAuctions };
    }
  },

  getAuctionById: async (id) => {
    try {
      const res = await api.get(`/auctions/${id}`);
      return res.data;
    } catch (e) {
      const item = mockAuctions.find(a => a.id === id) || mockAuctions[0];
      return { success: true, data: item };
    }
  },

  createAuction: async (aucData) => {
    try {
      const res = await api.post("/auctions", aucData);
      return res.data;
    } catch (e) {
      const newAuc = {
        id: `auc-${Date.now()}`,
        productId: `prod-${Date.now()}`,
        productName: aucData.productName,
        startingPrice: Number(aucData.startingPrice),
        currentBid: Number(aucData.startingPrice),
        unit: aucData.unit || "kg",
        lotSize: Number(aucData.lotSize),
        farmerId: "farmer-1",
        farmerName: "Rajesh Kumar",
        farmerLocation: "Nashik, Maharashtra",
        farmerTrustScore: 94,
        status: "LIVE",
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 1000 * 60 * Number(aucData.durationMinutes || 60)).toISOString(),
        bids: [],
        images: ["https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=600"]
      };
      mockAuctions.unshift(newAuc);
      return { success: true, data: newAuc };
    }
  },

  // Orders Operations
  getOrders: async (role) => {
    try {
      const endpoint = role === "FARMER" ? "/orders/farmer" : "/orders/buyer";
      const res = await api.get(endpoint);
      return res.data;
    } catch (e) {
      return { success: true, data: mockOrders };
    }
  },

  getOrderById: async (id) => {
    try {
      const res = await api.get(`/orders/${id}`);
      return res.data;
    } catch (e) {
      const item = mockOrders.find(o => o.id === id) || mockOrders[0];
      return { success: true, data: item };
    }
  },

  createOrder: async (orderData) => {
    try {
      const res = await api.post("/orders", orderData);
      return res.data;
    } catch (e) {
      const prod = mockProducts.find(p => p.id === orderData.productId) || mockProducts[0];
      const newOrder = {
        id: `ord-${Math.floor(1000 + Math.random() * 9000)}`,
        productId: orderData.productId,
        productName: prod.name,
        farmerId: prod.farmerId,
        farmerName: prod.farmerName,
        buyerId: "buyer-1",
        buyerName: "Amit Singh",
        quantity: Number(orderData.quantity),
        price: prod.price,
        totalAmount: Number(orderData.quantity) * prod.price,
        status: "PENDING",
        deliveryAddress: orderData.deliveryAddress || "Sector 5, Bangalore, Karnataka",
        createdAt: new Date().toISOString(),
        timeline: [
          { status: "PENDING", title: "Order Placed", description: "Waiting for farmer confirmation.", timestamp: new Date().toISOString() }
        ],
        image: prod.images[0]
      };
      mockOrders.unshift(newOrder);

      // Simulate real-time order lifecycle changes in mock mode!
      setTimeout(() => {
        newOrder.status = "ACCEPTED";
        newOrder.timeline.push({ status: "ACCEPTED", title: "Order Accepted", description: "Farmer approved your order.", timestamp: new Date().toISOString() });
      }, 30000); // accept in 30 seconds

      setTimeout(() => {
        newOrder.status = "PACKED";
        newOrder.timeline.push({ status: "PACKED", title: "Order Packed", description: "Packed in crop boxes.", timestamp: new Date().toISOString() });
      }, 60000); // pack in 1 min

      return { success: true, data: newOrder };
    }
  },

  updateOrderStatus: async (id, status) => {
    try {
      const res = await api.patch(`/orders/${id}/status`, { status });
      return res.data;
    } catch (e) {
      const order = mockOrders.find(o => o.id === id);
      if (order) {
        order.status = status;
        let desc = "Status updated.";
        if (status === "ACCEPTED") desc = "Order approved by the farmer.";
        if (status === "PACKED") desc = "Packed and sealed.";
        if (status === "DISPATCHED") desc = "Sent out via logistics vehicle.";
        if (status === "DELIVERED") desc = "Delivered and verified.";

        order.timeline.push({
          status,
          title: status.charAt(0) + status.slice(1).toLowerCase(),
          description: desc,
          timestamp: new Date().toISOString()
        });
        return { success: true, data: order };
      }
      return { success: false, error: "Order not found" };
    }
  },

  // Analytics Operations
  getFarmerAnalytics: async () => {
    try {
      const res = await api.get("/analytics/farmer");
      return res.data;
    } catch (e) {
      // Mock Farmer Analytics Data for Recharts
      const revenueTrend = [
        { date: "May 21", revenue: 12000, orders: 4 },
        { date: "May 22", revenue: 15400, orders: 5 },
        { date: "May 23", revenue: 8900, orders: 3 },
        { date: "May 24", revenue: 21000, orders: 7 },
        { date: "May 25", revenue: 18500, orders: 6 },
        { date: "May 26", revenue: 24300, orders: 8 },
        { date: "May 27", revenue: 29800, orders: 9 }
      ];
      
      const topProducts = [
        { name: "Organic Tomatoes", sales: 180, revenue: 8100 },
        { name: "Yukon Potatoes", sales: 310, revenue: 7750 },
        { name: "Basmati Rice", sales: 150, revenue: 16500 },
        { name: "Red Globe Onions", sales: 400, revenue: 12800 }
      ];

      const categoryData = [
        { name: "Vegetables", value: 28650, color: "#2E7D32" },
        { name: "Grains", value: 16500, color: "#F9A825" },
        { name: "Fruits", value: 8400, color: "#8D6E63" }
      ];

      const summary = {
        thisMonthRevenue: 74800,
        completionRate: 97.4,
        avgOrderValue: 2450,
        activeProducts: 6,
        liveAuctions: 2
      };

      return {
        success: true,
        data: { revenueTrend, topProducts, categoryData, summary }
      };
    }
  },

  // Chat Operations
  getChatHistory: async (orderId) => {
    try {
      const res = await api.get(`/chat/${orderId}`);
      return res.data;
    } catch (e) {
      return { success: true, data: mockChats[orderId] || [] };
    }
  },

  // OpenAI AI Pricing Suggestion
  getAiPriceSuggestion: async (cropDetails) => {
    try {
      const res = await api.post("/ai/suggest-price", cropDetails);
      return res.data;
    } catch (e) {
      console.warn("[API] AI pricing suggestion failed, generating mock suggestion.");
      // Standard intelligence emulator
      const basePrice = cropDetails.category === "Grains" ? 85 : 30;
      const suggestedMin = basePrice + Math.floor(Math.random() * 5);
      const suggestedMax = suggestedMin + Math.floor(Math.random() * 10) + 5;
      
      return {
        success: true,
        data: {
          recommendedRange: `₹${suggestedMin} - ₹${suggestedMax} per ${cropDetails.unit || "kg"}`,
          explanation: `Based on pricing analysis for "${cropDetails.name}" in "${cropDetails.location || "Maharashtra"}":\n- **Demand Trends**: High consumer demand for organic certified crops this season.\n- **Market Competition**: Local supply is down by 14% due to unexpected rainfall patterns, allowing for a price premium.\n- **Quality Modifier**: Your crop status (${cropDetails.isOrganic ? "Organic" : "Standard"}) justifies a starting price of ₹${suggestedMin}/kg for rapid sale, with a maximum yield value of ₹${suggestedMax}/kg in wholesale markets.`
        }
      };
    }
  }
};
