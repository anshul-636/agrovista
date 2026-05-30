"use client";

import { create } from "zustand";
import { toast } from "sonner";

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

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
