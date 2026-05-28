import { create } from "zustand";
import { getSocket } from "../lib/socket";

export const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,

  initSocket: () => {
    if (get().socket) return;
    const client = getSocket();
    if (!client) return;

    set({ socket: client, connected: true });

    // Handle listeners if real socket
    if (typeof client.on === "function" && typeof client.io === "object") {
      client.on("connect", () => set({ connected: true }));
      client.on("disconnect", () => set({ connected: false }));
    }
  },

  joinRoom: (roomType, id) => {
    const s = get().socket;
    if (!s) return;

    if (roomType === "auction") {
      s.emit("join:auction", { auctionId: id });
    } else if (roomType === "chat") {
      s.emit("join:chat", { orderId: id });
    } else if (roomType === "user") {
      s.emit("join:user", { userId: id });
    }
  },

  emitBid: (auctionId, amount, bidder) => {
    const s = get().socket;
    if (!s) return;
    s.emit("place:bid", { auctionId, amount, bidder });
  },

  emitMessage: (orderId, content, senderId, senderName, senderRole) => {
    const s = get().socket;
    if (!s) return;
    s.emit("send:message", { orderId, content, senderId, senderName, senderRole });
  },

  disconnectSocket: () => {
    const s = get().socket;
    if (!s) return;
    s.disconnect();
    set({ socket: null, connected: false });
  }
}));
