import { create } from "zustand";

export const useCartStore = create((set, get) => ({
  items: [],
  
  hydrate: () => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("agrovista_cart");
      if (stored) {
        set({ items: JSON.parse(stored) });
      }
    } catch (e) {
      console.error("Failed to parse cart data", e);
    }
  },

  addItem: (product, quantity) => {
    const items = get().items;
    const prodId = product.id || product._id;
    const existing = items.find((item) => (item.product.id || item.product._id) === prodId);
    let newItems;
    if (existing) {
      newItems = items.map((item) =>
        (item.product.id || item.product._id) === prodId
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      newItems = [...items, { product, quantity }];
    }
    localStorage.setItem("agrovista_cart", JSON.stringify(newItems));
    set({ items: newItems });
  },

  updateQuantity: (productId, quantity) => {
    const items = get().items;
    const newItems = items.map((item) =>
      (item.product.id || item.product._id) === productId ? { ...item, quantity } : item
    );
    localStorage.setItem("agrovista_cart", JSON.stringify(newItems));
    set({ items: newItems });
  },

  removeItem: (productId) => {
    const items = get().items;
    const newItems = items.filter((item) => (item.product.id || item.product._id) !== productId);
    localStorage.setItem("agrovista_cart", JSON.stringify(newItems));
    set({ items: newItems });
  },

  clearCart: () => {
    localStorage.removeItem("agrovista_cart");
    set({ items: [] });
  },

  getTotals: () => {
    const items = get().items;
    const subtotal = items.reduce((acc, item) => acc + Number(item.product.price || 0) * Number(item.quantity || 0), 0);
    const shippingFee = 0; // standard free shipping
    const tax = Math.round(subtotal * 0.05); // 5% tax/GST
    const total = subtotal + shippingFee + tax;
    return { subtotal, shippingFee, tax, total };
  }
}));
