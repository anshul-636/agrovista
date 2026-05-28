"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Truck,
  MessageSquare,
  Send,
  UserCheck,
  Package,
  Calendar,
  CheckCircle
} from "lucide-react";
import Header from "../../../components/shared/Header";
import Sidebar from "../../../components/shared/Sidebar";
import Button from "../../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import { apiService } from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import { getSocket } from "../../../lib/socket";
import { toast } from "sonner";

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const [status, setStatus] = useState("");
  const [timeline, setTimeline] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState("");
  const [onlineStatus, setOnlineStatus] = useState("Online");

  const socketRef = useRef(null);
  const chatScrollRef = useRef(null);

  // Fetch order details
  const { data: orderRes, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => apiService.getOrderById(id),
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
        if (res.success) {
          setChatMessages(res.data || []);
        }
      } catch (e) {
        console.error("Chat fetch error:", e);
      }
    };
    fetchChat();
  }, [id]);

  // Socket IO connection & Event bindings
  useEffect(() => {
    if (!id) return;

    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    // Join room
    socket.emit("join:chat", { orderId: id });

    const handleNewMessage = (msg) => {
      if (msg.orderId !== id) return;
      setChatMessages(prev => [...prev, msg]);
      
      // Auto scroll chat
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);

      // Flash Toast if not focused on chat or tab
      if (msg.senderId !== user?.id) {
        toast.info(`New message from ${msg.senderName}`, { icon: "💬" });
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
  }, [id, user]);

  // Scroll to bottom on load
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col">
        <Header />
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
        <Header />
        <div className="max-w-md mx-auto my-auto text-center p-8 space-y-4">
          <h2 className="text-xl font-bold text-red-500">Order File Not Found</h2>
          <Button onClick={() => router.push("/orders")}>Return to Listings</Button>
        </div>
      </div>
    );
  }

  const otherPersonName = user.role === "FARMER" ? order.buyerName : order.farmerName;
  const otherPersonRole = user.role === "FARMER" ? "BUYER" : "FARMER";

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col text-current transition-colors">
      <Header />

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
          {/* Header Portal */}
          <div>
            <button
              onClick={() => router.push("/orders")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-agri-brown hover:text-agri-green mb-4 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase text-agri-green">Contract Fulfillment portal</span>
                <h1 className="text-2xl sm:text-3xl font-black text-agri-green-dark dark:text-agri-green-light mt-1">
                  Order # {order.id}
                </h1>
                <p className="text-xs text-agri-brown mt-0.5">
                  Item: {order.productName} • Quantity: {order.quantity} kg
                </p>
              </div>
              <Badge variant={status === "DELIVERED" ? "green" : "yellow"}>{status}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Panel: Logistics Timelines & Details */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="border-agri-green/5 p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-agri-green/5 pb-4">
                  <h3 className="text-base font-extrabold text-agri-green-dark dark:text-agri-green-light">
                    Trade Timeline Progress
                  </h3>
                  {user.role === "FARMER" && status !== "DELIVERED" && (
                    <Button
                      onClick={handleProgressStatus}
                      variant="primary"
                      className="py-1.5 px-4 rounded-xl text-xs font-extrabold flex items-center gap-1"
                      disabled={updateStatusMutation.isLoading}
                    >
                      Progress Status
                    </Button>
                  )}
                </div>

                {/* Vertical Timeline Steps */}
                <div className="space-y-6 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-agri-green/10">
                  {timeline.map((step, idx) => (
                    <div key={idx} className="relative space-y-1">
                      <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-agri-green border-2 border-white dark:border-zinc-900" />
                      <h4 className="text-xs sm:text-sm font-extrabold text-agri-green-dark dark:text-agri-green-light flex items-center gap-2">
                        {step.title}
                        <span className="text-[10px] text-agri-brown font-semibold">
                          {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </h4>
                      <p className="text-xs text-agri-brown dark:text-gray-300">{step.description}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Delivery specifications */}
              <Card className="border-agri-green/5 p-6 space-y-4">
                <h3 className="text-base font-extrabold text-agri-green-dark dark:text-agri-green-light">
                  Logistics & Escrow Parameters
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-agri-brown">
                  <div className="space-y-1 p-3 bg-white/50 dark:bg-black/20 rounded-xl border border-agri-green/5">
                    <p className="text-[9px] uppercase font-bold text-agri-brown-light">Fulfillment Address</p>
                    <div className="flex gap-1.5 mt-1">
                      <MapPin className="w-4 h-4 text-agri-green shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{order.deliveryAddress}</p>
                    </div>
                  </div>
                  <div className="space-y-1 p-3 bg-white/50 dark:bg-black/20 rounded-xl border border-agri-green/5">
                    <p className="text-[9px] uppercase font-bold text-agri-brown-light">Financial Escrow Safety</p>
                    <div className="flex gap-1.5 mt-1">
                      <UserCheck className="w-4 h-4 text-agri-green shrink-0" />
                      <p className="leading-relaxed">₹{order.totalAmount.toLocaleString()} locked. Released upon buyer delivery verification.</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Panel: Chat Station */}
            <div className="lg:col-span-5">
              <Card className="border-agri-green/5 flex flex-col h-[500px] justify-between overflow-hidden relative">
                {/* Chat header */}
                <div className="p-4 border-b border-agri-green/5 bg-agri-green/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-agri-green/10 flex items-center justify-center font-bold text-agri-green">
                      {otherPersonName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-agri-green-dark dark:text-agri-green-light">
                        {otherPersonName}
                      </h4>
                      <p className="text-[10px] text-agri-brown font-semibold flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${onlineStatus === "Online" ? "bg-green-500" : "bg-gray-300"}`} />
                        {onlineStatus}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-agri-brown/10 text-agri-brown px-2 py-0.5 rounded-full font-bold">
                    {otherPersonRole}
                  </span>
                </div>

                {/* Message display scroll panel */}
                <div
                  ref={chatScrollRef}
                  className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-agri-cream/30 dark:bg-black/10"
                >
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-20 text-agri-brown text-xs italic">
                      No message history found. Type below to start direct trade coordination.
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.senderId === user.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col max-w-[80%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                        >
                          <span className="text-[9px] font-bold text-agri-brown mb-0.5 px-1">{msg.senderName}</span>
                          <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                            isMe
                              ? "bg-agri-green text-white rounded-tr-none shadow shadow-agri-green/10"
                              : "bg-white dark:bg-zinc-800 border border-agri-green/5 text-current rounded-tl-none"
                          }`}>
                            {msg.content}
                          </div>
                          <span className="text-[8px] text-agri-brown-light mt-0.5 px-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input form */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-agri-green/5 bg-white dark:bg-zinc-950 flex gap-2">
                  <input
                    type="text"
                    value={typedMessage}
                    onChange={(e) => setTypedMessage(e.target.value)}
                    placeholder="Type a message to other party..."
                    className="flex-1 px-4 py-2.5 rounded-xl border text-xs bg-white dark:bg-black/20 border-agri-green/10 focus:outline-none focus:ring-1 focus:ring-agri-green"
                  />
                  <Button
                    type="submit"
                    className="p-2.5 rounded-xl bg-agri-green text-white hover:bg-agri-green-hover"
                  >
                    <Send className="w-4.5 h-4.5" />
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
