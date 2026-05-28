"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Send,
  UserCheck
} from "lucide-react";
import ChatContainer from "../chat/ChatContainer";
import Button from "../ui/Button";
import { Card } from "../ui/Card";
import Badge from "../ui/Badge";
import { apiService } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { getSocket } from "../../lib/socket";
import { toast } from "sonner";

// This component only renders on client-side, avoiding hydration mismatches
export default function OrderDetailContent() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [status, setStatus] = useState("");
  const [timeline, setTimeline] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState("");
  const [onlineStatus, setOnlineStatus] = useState("Online");
  const [mounted, setMounted] = useState(false);

  const socketRef = useRef(null);
  const chatScrollRef = useRef(null);

  // Mark component as mounted to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch order details
  const { data: orderRes, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => apiService.getOrderById(id),
    enabled: !!id && mounted,
  });

  const order = orderRes?.data || null;

  // Initialize order states
  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setTimeline(order.timeline || []);
    }
  }, [order]);

  // Load chat history
  useEffect(() => {
    const fetchChat = async () => {
      try {
        const res = await apiService.getChatHistory(id);
        if (res.success && Array.isArray(res.data)) {
          // Ensure all messages have required fields
          const sanitizedMessages = res.data.map(msg => ({
            ...msg,
            senderId: msg.senderId || msg.sender_id || "",
            senderName: msg.senderName || msg.sender_name || "Unknown",
            content: msg.content || "",
            createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
            id: msg.id || msg._id || `msg-${Math.random()}`,
          }));
          setChatMessages(sanitizedMessages);
        } else {
          setChatMessages([]);
        }
      } catch (e) {
        console.error("Chat fetch error:", e);
        setChatMessages([]);
      }
    };
    if (mounted && id) {
      fetchChat();
    }
  }, [id, mounted]);

  // Socket IO connection & Event bindings
  useEffect(() => {
    if (!id || !mounted) return;

    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    // Join room
    socket.emit("join:chat", { orderId: id });

    const handleNewMessage = (msg) => {
      if (msg.orderId !== id) return;
      
      // Ensure message has required fields
      const sanitizedMsg = {
        ...msg,
        senderId: msg.senderId || msg.sender_id || "",
        senderName: msg.senderName || msg.sender_name || "Unknown",
        content: msg.content || "",
        createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
        id: msg.id || msg._id || `msg-${Math.random()}`,
      };
      
      setChatMessages(prev => [...prev, sanitizedMsg]);
      
      // Auto scroll chat
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);

      // Flash Toast if not focused on chat or tab
      if (sanitizedMsg.senderId !== user?.id) {
        toast.info(`New message from ${sanitizedMsg.senderName}`, { icon: "💬" });
      }
    };

    socket.on("chat:message", handleNewMessage);

    // Online status simulator
    const onlineTimer = setTimeout(() => {
      setOnlineStatus("Active 5m ago");
    }, 45000);

    return () => {
      socket.off("chat:message", handleNewMessage);
      clearTimeout(onlineTimer);
    };
  }, [id, user?.id, mounted]);

  // Scroll to bottom on load
  useEffect(() => {
    if (chatScrollRef.current && mounted) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, mounted]);

  // Status progression mutations (Farmer only)
  const updateStatusMutation = useMutation({
    mutationFn: (newStatus) => apiService.updateOrderStatus(id, newStatus),
    onSuccess: (res) => {
      if (res.success) {
        setStatus(res.data.status);
        setTimeline(res.data.timeline);
        queryClient.invalidateQueries(["order", id]);
        queryClient.invalidateQueries(["farmerOrders"]);
        toast.success(`Shipment status progressed to ${res.data.status}!`);

        // Emit Socket update event to alert buyer
        if (socketRef.current) {
          socketRef.current.emit("order:updated", { orderId: id, status: res.data.status });
        }
      }
    }
  });

  const handleProgressStatus = () => {
    const statusSequence = ["PENDING", "ACCEPTED", "PACKED", "DISPATCHED", "DELIVERED"];
    const currentIdx = statusSequence.indexOf(status);
    if (currentIdx !== -1 && currentIdx < statusSequence.length - 1) {
      const nextStatus = statusSequence[currentIdx + 1];
      updateStatusMutation.mutate(nextStatus);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !socketRef.current) return;

    socketRef.current.emit("send:message", {
      orderId: id,
      content: typedMessage.trim(),
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role
    });

    setTypedMessage("");
  };

  // Only render once mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col">
        <div className="max-w-7xl mx-auto p-8 w-full animate-pulse space-y-6">
          <div className="h-6 w-24 bg-gray-200 dark:bg-zinc-800 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
            <div className="lg:col-span-7 h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl" />
            <div className="lg:col-span-5 h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col">
        <div className="max-w-7xl mx-auto p-8 w-full animate-pulse space-y-6">
          <div className="h-6 w-24 bg-gray-200 dark:bg-zinc-800 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
            <div className="lg:col-span-7 h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl" />
            <div className="lg:col-span-5 h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col">
        <div className="max-w-md mx-auto my-auto text-center p-8 space-y-4">
          <h2 className="text-xl font-bold text-red-500">Order File Not Found</h2>
          <Button onClick={() => router.push("/orders")}>Return to Listings</Button>
        </div>
      </div>
    );
  }

  const otherPersonName = user?.role === "FARMER" ? order.buyerName : order.farmerName;
  const otherPersonRole = user?.role === "FARMER" ? "BUYER" : "FARMER";

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col text-current transition-colors">
      <div className="max-w-7xl mx-auto p-8 w-full">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-agri-brown hover:text-agri-green transition font-semibold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <span className="text-xs bg-agri-brown/10 text-agri-brown px-3 py-1 rounded-full font-bold">
            CONTRACT FULFILLMENT PORTAL
          </span>
        </div>

        {/* Order Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-agri-green-dark mb-2">Order # {order.orderId}</h1>
          <p className="text-agri-brown">
            Item: {order.productName} • Quantity: {order.quantity}
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel: Timeline & Logistics */}
          <div className="lg:col-span-7 space-y-8">
            {/* Timeline Card */}
            <Card className="border-agri-green/5 overflow-hidden">
              <div className="p-6 border-b border-agri-green/5 bg-gradient-to-r from-agri-green/5 to-transparent">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-agri-green-dark">Trade Timeline Progress</h2>
                  <Badge className="bg-agri-green text-white">Progress Status</Badge>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {timeline.map((event, idx) => (
                  <div key={idx} className="flex gap-4 relative">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-agri-green ring-2 ring-agri-green/20" />
                      {idx < timeline.length - 1 && (
                        <div className="w-0.5 h-16 bg-gradient-to-b from-agri-green to-agri-green/20 my-2" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-agri-green-dark">{event.status}</h4>
                      <p className="text-xs text-agri-brown font-semibold">{event.timestamp}</p>
                      <p className="text-sm text-agri-brown/70 mt-1">{event.description}</p>
                    </div>
                  </div>
                ))}

                {/* Progress Button */}
                {user?.role === "FARMER" && status !== "DELIVERED" && (
                  <button
                    onClick={handleProgressStatus}
                    className="w-full mt-6 px-4 py-3 bg-agri-green text-white rounded-xl font-bold hover:bg-agri-green-hover transition"
                  >
                    Progress to Next Step
                  </button>
                )}
              </div>
            </Card>

            {/* Logistics Card */}
            <Card className="border-agri-green/5">
              <div className="p-6 border-b border-agri-green/5 bg-gradient-to-r from-agri-green/5 to-transparent">
                <h2 className="text-xl font-black text-agri-green-dark">Logistics & Escrow Parameters</h2>
              </div>
              <div className="p-6 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-agri-brown font-bold mb-2 uppercase">Fulfillment Address</p>
                  <div className="flex gap-2">
                    <MapPin className="w-4 h-4 text-agri-green shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-current">{order.shippingAddress}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-agri-brown font-bold mb-2 uppercase">Financial Escrow Safety</p>
                  <div className="flex gap-2">
                    <UserCheck className="w-4 h-4 text-agri-green shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-current">₹{order.totalAmount.toLocaleString()} locked. Released upon buyer delivery verification.</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Panel: Chat Station */}
          <div className="lg:col-span-5">
            <Card className="border-agri-green/5 flex flex-col h-[500px] justify-between overflow-hidden relative">
              {/* Chat header */}
              <div className="p-4 border-b border-agri-green/5 bg-gradient-to-r from-agri-green/5 to-agri-green/2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-agri-green/40 to-agri-green/20 flex items-center justify-center font-bold text-base text-agri-green">
                    {otherPersonName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-agri-green-dark dark:text-agri-green-light">
                      {otherPersonName}
                    </h4>
                    <p className="text-[10px] text-agri-brown font-semibold">
                      {onlineStatus}
                    </p>
                  </div>
                </div>
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              </div>

              {/* Chat messages with new component */}
              <ChatContainer
                messages={chatMessages || []}
                currentUserId={user?.id || "anonymous"}
                isTyping={false}
                otherPersonName={otherPersonName}
              />

              {/* Input form */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-agri-green/5 bg-white dark:bg-zinc-950 flex gap-2">
                <input
                  type="text"
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 rounded-full border text-sm bg-white dark:bg-black/20 border-agri-green/10 focus:outline-none focus:ring-2 focus:ring-agri-green/30 focus:border-agri-green transition placeholder-gray-400"
                />
                <Button
                  type="submit"
                  className="p-3 rounded-full bg-agri-green text-white hover:bg-agri-green-dark shadow-md transition"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
