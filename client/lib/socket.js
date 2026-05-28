import { io } from "socket.io-client";
import { useNotificationStore } from "../store/notificationStore";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

class MockSocket {
  listeners = {};
  joinedRooms = new Set();
  intervals = {};

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    if (!callback) {
      delete this.listeners[event];
      return;
    }
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    console.log(`[Mock Socket] EMIT ${event}:`, data);

    // Handle Mock Bidding Simulation
    if (event === "join:auction") {
      const { auctionId } = data;
      this.joinedRooms.add(`auction:${auctionId}`);
      
      // Setup a periodic bid generator for this auction
      if (this.intervals[auctionId]) clearInterval(this.intervals[auctionId]);
      
      this.intervals[auctionId] = setInterval(() => {
        const mockBidders = ["Rahul Sharma", "Amit Singh", "Rajesh Patel", "Vikram Sen", "Pooja Hegde"];
        const randomBidder = mockBidders[Math.floor(Math.random() * mockBidders.length)];
        // Get the current bid from DOM or state indirectly, or just emit a relative increment
        const increment = Math.floor(Math.random() * 5) + 1;
        
        this.trigger("bid:new", {
          auctionId,
          bidder: randomBidder,
          amount: increment, // Increment modifier handled in component
          timestamp: new Date().toISOString()
        });
      }, 12000); // New bid every 12 seconds
    }

    if (event === "place:bid") {
      const { auctionId, amount, bidder } = data;
      
      // Echo the user's bid immediately to everyone in room
      setTimeout(() => {
        this.trigger("bid:new", {
          auctionId,
          bidder: bidder || "You (Buyer)",
          amount: amount,
          isUser: true,
          timestamp: new Date().toISOString()
        });
      }, 100);

      // Schedule an outbid response after 6 seconds to trigger competition
      setTimeout(() => {
        const outbidAmount = Number(amount) + Math.floor(Math.random() * 3) + 1;
        const mockCompetitors = ["Suresh K.", "Harish Mehta", "Priya Verma"];
        const randomCompetitor = mockCompetitors[Math.floor(Math.random() * mockCompetitors.length)];
        
        this.trigger("bid:new", {
          auctionId,
          bidder: randomCompetitor,
          amount: outbidAmount,
          timestamp: new Date().toISOString()
        });
      }, 6000);
    }

    // Handle Mock Chat Simulation
    if (event === "join:chat") {
      const { orderId } = data;
      this.joinedRooms.add(`chat:${orderId}`);
    }

    if (event === "send:message") {
      const { orderId, content, senderId, senderName, senderRole } = data;
      
      // Echo user message back
      setTimeout(() => {
        this.trigger("chat:message", {
          id: `msg-${Date.now()}`,
          orderId,
          senderId,
          senderName: senderName || "You",
          senderRole: senderRole || "BUYER",
          content,
          createdAt: new Date().toISOString()
        });
      }, 50);

      // Trigger automatic replies from the opposite role after 2.5 seconds
      setTimeout(() => {
        const replies = [
          "Thank you for the message. I am preparing the fresh crops for delivery.",
          "The harvest is 100% organic and will be packed in standard burlap bags. Is that fine?",
          "Yes, the shipment will leave tomorrow morning. I will update the status tracker.",
          "I have verified the quality check. The moisture level is perfect.",
          "Let me know if you need helper details for transit."
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        
        this.trigger("chat:message", {
          id: `msg-reply-${Date.now()}`,
          orderId,
          senderId: senderRole === "FARMER" ? "buyer-123" : "farmer-456",
          senderName: senderRole === "FARMER" ? "Amit Singh (Buyer)" : "Rajesh Kumar (Farmer)",
          senderRole: senderRole === "FARMER" ? "BUYER" : "FARMER",
          content: randomReply,
          createdAt: new Date().toISOString()
        });
      }, 2500);
    }

    if (event === "join:user") {
      const { userId } = data;
      this.joinedRooms.add(`user:${userId}`);
    }
  }

  trigger(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  disconnect() {
    console.log("[Mock Socket] Disconnected");
    Object.keys(this.intervals).forEach(key => {
      clearInterval(this.intervals[key]);
    });
    this.intervals = {};
  }

  connect() {
    console.log("[Mock Socket] Connected & Simulated Live Bidding Active");
  }
}

let socketInstance = null;

export function getSocket() {
  if (typeof window === "undefined") return null;

  if (!socketInstance) {
    try {
      // Attempt real connection if URL is local/reachable, else use Mock
      console.log(`[Socket] Attempting connection to ${SOCKET_URL}`);
      const realSocket = io(SOCKET_URL, {
        autoConnect: false,
        timeout: 3000,
        reconnectionAttempts: 2
      });

      realSocket.connect();
      
      // Listen for error or timeout to fall back
      realSocket.on("connect_error", () => {
        console.warn("[Socket] Connect error, falling back to MockSocket emulation.");
        socketInstance = new MockSocket();
        socketInstance.connect();
      });

      socketInstance = realSocket;
    } catch (e) {
      console.warn("[Socket] Init error, using MockSocket.", e);
      socketInstance = new MockSocket();
      socketInstance.connect();
    }
  }
  return socketInstance;
}
