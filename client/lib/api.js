import axios from "axios";
import { useAuthStore } from "../store/authStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // Increased from 5000ms to 15000ms (15 seconds)
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  }
});

// Retry logic for failed requests
const retryConfig = {
  maxRetries: 2,
  retryDelay: 500,
};

let refreshPromise = null;

const unwrapData = (response) => response?.data?.data ?? response?.data ?? response;
const toId = (value) => (value?._id ? String(value._id) : value?.id ? String(value.id) : value ? String(value) : null);

const normalizeProduct = (item) => {
  if (!item) return item;
  return {
    ...item,
    id: toId(item),
    farmerId: toId(item.farmerId || item.farmer),
    farmerName: item.farmerName || item.farmer?.name || "Unknown",
    farmerLocation: item.farmerLocation || item.farmer?.location || item.location || "India",
    farmerTrustScore: Number(item.farmerTrustScore || item.farmer?.trustScore || 0),
    farmerVerified: (item.farmer?.verificationStatus || item.farmerVerified) === "VERIFIED",
    price: Number(item.price || 0),
    quantity: Number(item.quantity || 0),
    images: Array.isArray(item.images) ? item.images : [],
  };
};

const normalizeAuction = (item) => {
  if (!item) return item;
  return {
    ...item,
    id: toId(item),
    farmerId: toId(item.farmerId || item.farmer),
    farmerName: item.farmerName || item.farmer?.name || "Unknown",
    farmerLocation: item.farmerLocation || item.farmer?.location || "India",
    farmerVerified: (item.farmer?.verificationStatus || item.farmerVerified) === "VERIFIED",
    images: Array.isArray(item.images) ? item.images : item.image ? [item.image] : [],
    // server uses `quantity`, UI expects `lotSize` in several places — map both
    lotSize: item.lotSize || item.quantity || 0,
    quantity: Number(item.quantity || item.lotSize || 0),
    // numeric fields
    startingPrice: Number(item.startingPrice || 0),
    currentBid: item.currentBid == null ? (item.startingPrice ? Number(item.startingPrice) : null) : Number(item.currentBid),
    // new pricing controls
    reservePrice: item.reservePrice ? Number(item.reservePrice) : null,
    buyNowPrice: item.buyNowPrice ? Number(item.buyNowPrice) : null,
    minBidIncrement: Number(item.minBidIncrement || 1),
    reserveMet: Boolean(item.reserveMet),
  };
};

const normalizeOrder = (item) => {
  if (!item) return item;
  return {
    ...item,
    id: toId(item),
    productId: toId(item.productId || item.product),
    farmerId: toId(item.farmerId || item.farmer),
    buyerId: toId(item.buyerId || item.buyer),
    productName: item.productName || item.product?.name || "Unknown",
    buyerName: item.buyerName || item.buyer?.name || "Unknown",
    farmerName: item.farmerName || item.farmer?.name || "Unknown",
    unit: item.unit || item.product?.unit || "kg",
    quantity: Number(item.quantity || 0),
    totalAmount: Number(item.totalAmount || 0),
    // Persisted flag from the server — true when this buyer already reviewed
    // the farmer for this order. Prevents "Leave Review" reappearing on refresh.
    hasReview: Boolean(item.hasReview),
  };
};

// Request interceptor with retry logic
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("agrovista_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    config.retryCount = config.retryCount || 0; // Initialize retry count
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with automatic retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;
    const message = error.response?.data?.message || "";

    const shouldRefresh =
      status === 401 &&
      !config?._retry &&
      !config?.url?.includes("/auth/login") &&
      !config?.url?.includes("/auth/register") &&
      !config?.url?.includes("/auth/refresh") &&
      !config?.url?.includes("/auth/logout") &&
      (message.toLowerCase().includes("token") || message.toLowerCase().includes("unauthorized"));

    if (shouldRefresh) {
      config._retry = true;

      try {
        // Send refreshToken in request body as cross-origin fallback.
        // Cookies are blocked by SameSite policy when frontend and backend
        // are on different domains (Vercel + Render). Body always works.
        const storedRefreshToken = typeof window !== "undefined"
          ? localStorage.getItem("agrovista_refresh_token")
          : null;
        refreshPromise = refreshPromise || axios.post(
          `${API_URL}/auth/refresh`,
          { refreshToken: storedRefreshToken },
          { withCredentials: true }
        );
        const refreshRes = await refreshPromise;
        refreshPromise = null;

        const newToken = refreshRes?.data?.data?.accessToken || refreshRes?.data?.accessToken;
        if (newToken) {
          if (typeof window !== "undefined") {
            localStorage.setItem("agrovista_token", newToken);
          }
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${newToken}`;
          return api(config);
        }
      } catch (refreshError) {
        refreshPromise = null;
        if (typeof window !== "undefined") {
          useAuthStore.getState().logout();
        }
        return Promise.reject(refreshError);
      }
    }
    
    // Retry only on network errors or 5xx server errors
    if (config && config.retryCount < retryConfig.maxRetries) {
      if (!error.response || (error.response && error.response.status >= 500)) {
        config.retryCount += 1;
        await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay));
        return api(config);
      }
    }
    
    return Promise.reject(error);
  }
);

// API ENDPOINTS WRAPPER
export const apiService = {
  // Auth Operations
  login: async (credentials) => {
    try {
      const res = await api.post("/auth/login", credentials);
      const backendData = res.data;
      // Store refreshToken in localStorage — cookie alone fails cross-origin (Vercel+Render)
      if (backendData.data?.refreshToken && typeof window !== "undefined") {
        localStorage.setItem("agrovista_refresh_token", backendData.data.refreshToken);
      }
      return {
        success: backendData.success,
        user: backendData.data?.user,
        token: backendData.data?.accessToken,
        refreshToken: backendData.data?.refreshToken,
      };
    } catch (e) {
      throw e;
    }
  },

  signup: async (userData) => {
    try {
      const res = await api.post("/auth/register", userData);
      const backendData = res.data;
      if (backendData.data?.refreshToken && typeof window !== "undefined") {
        localStorage.setItem("agrovista_refresh_token", backendData.data.refreshToken);
      }
      return {
        success: backendData.success,
        user: backendData.data?.user,
        token: backendData.data?.accessToken,
        refreshToken: backendData.data?.refreshToken,
      };
    } catch (e) {
      throw e;
    }
  },

  // Products Operations
  getProducts: async (filters = {}) => {
    try {
      const res = await api.get("/products", { params: filters });
      const payload = unwrapData(res);
      const list = Array.isArray(payload?.products) ? payload.products : Array.isArray(payload) ? payload : [];
      return {
        success: true,
        data: list.map(normalizeProduct),
        total: payload?.total ?? 0,
        page: payload?.page ?? 1,
        totalPages: payload?.totalPages ?? 1,
      };
    } catch (e) {
      throw e;
    }
  },

  // Fetch only the currently authenticated farmer's own products
  getMyProducts: async () => {
    try {
      const res = await api.get("/products/farmer/mine");
      const payload = unwrapData(res);
      const list = Array.isArray(payload) ? payload : Array.isArray(payload?.products) ? payload.products : [];
      return {
        success: true,
        data: list.map(normalizeProduct),
      };
    } catch (e) {
      throw e;
    }
  },

  getProductById: async (id) => {
    try {
      const res = await api.get(`/products/${id}`);
      const payload = unwrapData(res);
      return { success: true, data: normalizeProduct(payload) };
    } catch (e) {
      throw e;
    }
  },

  createProduct: async (productData) => {
    try {
      const res = await api.post("/products", productData);
      const payload = unwrapData(res);
      return { success: true, data: normalizeProduct(payload) };
    } catch (e) {
      throw e;
    }
  },

  editProduct: async (id, productData) => {
    try {
      const res = await api.put(`/products/${id}`, productData);
      const payload = unwrapData(res);
      return { success: true, data: normalizeProduct(payload) };
    } catch (e) {
      throw e;
    }
  },

  deleteProduct: async (id) => {
    try {
      const res = await api.delete(`/products/${id}`);
      const payload = unwrapData(res);
      return { success: true, data: payload };
    } catch (e) {
      throw e;
    }
  },

  // Auctions Operations
  getAuctions: async (filters = {}) => {
    try {
      const res = await api.get("/auctions", { params: filters });
      const payload = unwrapData(res);
      return {
        success: true,
        data: (Array.isArray(payload) ? payload : Array.isArray(payload?.auctions) ? payload.auctions : []).map(normalizeAuction)
      };
    } catch (e) {
      throw e;
    }
  },

  getPublicStats: async () => {
    try {
      const res = await api.get("/users/stats");
      const payload = unwrapData(res);
      return { success: true, data: payload };
    } catch (e) {
      throw e;
    }
  },

  getUserProfile: async (id) => {
    try {
      const res = await api.get(`/users/${id}`);
      const payload = unwrapData(res);
      return { success: true, data: payload };
    } catch (e) {
      throw e;
    }
  },

  updateProfile: async (profileData) => {
    try {
      const res = await api.patch("/users/me", profileData);
      const payload = unwrapData(res);
      return { success: true, data: payload };
    } catch (e) {
      throw e;
    }
  },

  getAuctionById: async (id) => {
    try {
      const res = await api.get(`/auctions/${id}`);
      const payload = unwrapData(res);
      return { success: true, data: normalizeAuction(payload) };
    } catch (e) {
      throw e;
    }
  },

  createAuction: async (aucData) => {
    try {
      let res;
      // if caller passed a FormData (file upload), post with multipart/form-data
      if (typeof FormData !== 'undefined' && aucData instanceof FormData) {
        res = await api.post("/auctions", aucData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        res = await api.post("/auctions", aucData);
      }
      const payload = unwrapData(res);
      return { success: true, data: normalizeAuction(payload) };
    } catch (e) {
      throw e;
    }
  },

  deleteAuction: async (id) => {
    try {
      const res = await api.delete(`/auctions/${id}`);
      const payload = unwrapData(res);
      return { success: true, data: payload };
    } catch (e) {
      const message = e?.response?.data?.message || e?.message || 'Failed to delete auction';
      return { success: false, error: message };
    }
  },

  placeBid: async (auctionId, amount) => {
    try {
      const res = await api.post(`/auctions/${auctionId}/bid`, { amount });
      const payload = unwrapData(res);
      return { success: true, data: payload };
    } catch (e) {
      // return structured error for UI
      const message = e?.response?.data?.message || e?.message || 'Failed to place bid';
      return { success: false, error: message };
    }
  },

  // Orders Operations
  getOrders: async (role) => {
    try {
      const endpoint = role === "FARMER" ? "/orders/farmer" : "/orders/buyer";
      const res = await api.get(endpoint);
      const payload = unwrapData(res);
      return {
        success: true,
        data: (Array.isArray(payload) ? payload : Array.isArray(payload?.orders) ? payload.orders : []).map(normalizeOrder)
      };
    } catch (e) {
      throw e;
    }
  },

  getOrderById: async (id) => {
    try {
      const res = await api.get(`/orders/${id}`);
      const payload = unwrapData(res);
      return { success: true, data: normalizeOrder(payload) };
    } catch (e) {
      throw e;
    }
  },

  createOrder: async (orderData) => {
    try {
      const res = await api.post("/orders", orderData);
      const payload = unwrapData(res);
      return { success: true, data: normalizeOrder(payload) };
    } catch (e) {
      throw e;
    }
  },

  updateOrderStatus: async (id, status) => {
    try {
      const res = await api.patch(`/orders/${id}/status`, { status });
      const payload = unwrapData(res);
      return { success: true, data: normalizeOrder(payload) };
    } catch (e) {
      throw e;
    }
  },

  verifyOrderDelivery: async (id) => {
    try {
      const res = await api.patch(`/orders/${id}/verify`);
      const payload = unwrapData(res);
      return { success: true, data: normalizeOrder(payload) };
    } catch (e) {
      throw e;
    }
  },

  cancelOrder: async (id) => {
    try {
      const res = await api.post(`/orders/${id}/cancel`);
      const payload = unwrapData(res);
      return { success: true, data: normalizeOrder(payload) };
    } catch (e) {
      throw e;
    }
  },

  // Analytics Operations
  getFarmerAnalytics: async () => {
    try {
      const res = await api.get("/analytics/farmer");
      const payload = unwrapData(res);
      return { success: true, data: payload };
    } catch (e) {
      throw e;
    }
  },

  // Chat Operations
  getChatHistory: async (orderId) => {
    try {
      const res = await api.get(`/chat/${orderId}`);
      const payload = unwrapData(res);
      return { success: true, data: Array.isArray(payload) ? payload : payload?.messages || [] };
    } catch (e) {
      throw e;
    }
  },

  sendMessage: async (orderId, content, file = null) => {
    try {
      if (file) {
        const formData = new FormData();
        formData.append("content", content || "");
        formData.append("file", file);
        const res = await api.post(`/chat/${orderId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        const payload = unwrapData(res);
        return { success: true, data: payload };
      }

      const res = await api.post(`/chat/${orderId}`, { content });
      const payload = unwrapData(res);
      return { success: true, data: payload };
    } catch (e) {
      throw e;
    }
  },

  // Clear chat history for an order
  clearChat: async (orderId) => {
    try {
      const res = await api.delete(`/chat/${orderId}/clear`);
      const payload = unwrapData(res);
      return { success: true, data: payload };
    } catch (e) {
      throw e;
    }
  },

  // Submit a review for a farmer
  submitReview: async (farmerId, { rating, comment }) => {
    try {
      const res = await api.post(`/reviews/${farmerId}`, { rating, comment });
      const payload = unwrapData(res);
      return { success: true, data: payload };
    } catch (e) {
      throw e;
    }
  },

  // Get all reviews received by a farmer (farmer sees their own feedback)
  getFarmerReviews: async (farmerId) => {
    try {
      const res = await api.get(`/reviews/${farmerId}`);
      const payload = unwrapData(res);
      return { success: true, data: payload };
    } catch (e) {
      throw e;
    }
  },

  // Get public profile (includes trust score)
  getPublicProfile: async (userId) => {
    try {
      const res = await api.get(`/users/${userId}`);
      const payload = unwrapData(res);
      return { success: true, data: payload };
    } catch (e) {
      throw e;
    }
  },

  // OpenAI AI Pricing Suggestion
  getAiPriceSuggestion: async (cropDetails) => {
    try {
      const res = await api.post("/ai/price-advisor", cropDetails);
      const payload = unwrapData(res);
      return { success: true, data: payload };
    } catch (e) {
      throw e;
    }
  },

  createCheckoutOrder: async (checkoutData) => {
    try {
      const res = await api.post("/checkout/create-order", checkoutData);
      return res.data;
    } catch (e) {
      throw e;
    }
  },

  verifyPayment: async (verificationData) => {
    try {
      const res = await api.post("/payments/verify", verificationData);
      return res.data;
    } catch (e) {
      throw e;
    }
  },

  createPayment: async (paymentData) => {
    try {
      const res = await api.post("/payments/create", paymentData);
      return res.data;
    } catch (e) {
      throw e;
    }
  },

  // ── Farmer Verification ──────────────────────────────────────────────────
  // Farmer submits doc URLs for admin review
  requestFarmerVerification: async (docUrls) => {
    try {
      const res = await api.post("/users/me/verification-request", { docUrls });
      const payload = unwrapData(res);
      return { success: true, data: payload };
    } catch (e) {
      return { success: false, error: e?.response?.data?.message || e.message };
    }
  },

  // Farmer uploads actual document files (JPG/PNG/PDF) to Cloudinary via server
  // Called by the FarmerVerificationPanel in profile/page.jsx
  uploadVerificationDocs: async (files) => {
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("docs", file));
      const res = await api.post("/users/me/verification-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const payload = unwrapData(res);
      return { success: true, data: payload };
    } catch (e) {
      return { success: false, error: e?.response?.data?.message || e.message };
    }
  },

  // Admin: list pending verifications
  getPendingVerifications: async () => {
    try {
      const res = await api.get("/users/admin/verifications");
      const payload = unwrapData(res);
      return { success: true, data: payload };
    } catch (e) {
      return { success: false, error: e?.response?.data?.message || e.message };
    }
  },

  // Admin: approve or reject a verification
  processVerification: async (farmerId, action, note) => {
    try {
      const res = await api.post(`/users/admin/verifications/${farmerId}`, { action, note });
      const payload = unwrapData(res);
      return { success: true, data: payload };
    } catch (e) {
      return { success: false, error: e?.response?.data?.message || e.message };
    }
  },

  deleteAccount: async () => {
    try {
      const res = await api.delete("/users/me");
      const payload = unwrapData(res);
      return { success: true, data: payload };
    } catch (e) {
      return { success: false, error: e?.response?.data?.message || e.message };
    }
  }
};