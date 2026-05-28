import { create } from "zustand";
import { toast } from "sonner";

export const useNotificationStore = create((set, get) => ({
  notifications: [
    {
      id: "notif-1",
      title: "🌾 Tomatoes Back In Stock!",
      body: "Priya Organic Farms restocked 150 kg of Organic Tomatoes.",
      link: "/products/tomato-1",
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
      type: "RESTOCK",
    },
    {
      id: "notif-2",
      title: "🔥 High Bid Alert!",
      body: "Your bid on Golden Wheat was exceeded. Current bid is ₹28/kg.",
      link: "/auctions/wheat-auction",
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      type: "AUCTION",
    },
    {
      id: "notif-3",
      title: "📦 Order Dispatched",
      body: "Farmer Green Farm has dispatched your order #ORD-9843.",
      link: "/orders/ord-9843",
      isRead: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      type: "ORDER",
    },
  ],
  unreadCount: 2,

  addNotification: (notification) => {
    const newNotif = {
      id: notification.id || `notif-${Date.now()}`,
      title: notification.title,
      body: notification.body,
      link: notification.link || "#",
      isRead: false,
      createdAt: notification.createdAt || new Date().toISOString(),
      type: notification.type || "INFO",
    };

    set((state) => {
      const updated = [newNotif, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.isRead).length,
      };
    });

    // Fire screen toast
    toast(newNotif.title, {
      description: newNotif.body,
      action: newNotif.link ? {
        label: "View",
        onClick: () => {
          if (typeof window !== "undefined") {
            window.location.href = newNotif.link;
          }
        }
      } : undefined,
    });
  },

  markAllAsRead: () => {
    set((state) => {
      const updated = state.notifications.map((n) => ({ ...n, isRead: true }));
      return {
        notifications: updated,
        unreadCount: 0,
      };
    });
  },

  markAsRead: (id) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.isRead).length,
      };
    });
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));
