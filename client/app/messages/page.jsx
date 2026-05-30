"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Send, MessageSquare, ArrowLeft, ShieldCheck, HelpCircle } from "lucide-react";
import Header from "../../components/shared/Header";
import Sidebar from "../../components/shared/Sidebar";
import { Card, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { apiService } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { getSocket } from "../../lib/socket";
import { toast } from "sonner";

export default function MessagesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const currentUserId = user?.id || user?._id || null;

  const [activeOrderId, setActiveOrderId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState("");
  const socketRef = useRef(null);
  const chatScrollRef = useRef(null);

  // Route security
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Fetch active orders to display as chat channels
  const { data: ordersRes, isLoading } = useQuery({
    queryKey: ["chatChannels", user?.role],
    queryFn: () => apiService.getOrders(user?.role),
    enabled: !!user,
  });

  const orders = ordersRes?.data || [];

  // Automatically select first order as active conversation
  useEffect(() => {
    if (orders.length > 0 && !activeOrderId) {
      setActiveOrderId(orders[0].id);
    }
  }, [orders, activeOrderId]);

  // Load active chat history
  useEffect(() => {
    if (!activeOrderId) return;
    const fetchChat = async () => {
      try {
        const res = await apiService.getChatHistory(activeOrderId);
        if (res.success) {
          setChatMessages((res.data || []).map(normalizeChatMessage));
        }
      } catch (e) {
        console.error("Chat history fetch error:", e);
      }
    };
    fetchChat();
  }, [activeOrderId]);

  // Socket IO connection
  useEffect(() => {
    if (!activeOrderId) return;
    
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    socket.emit("join:chat", { orderId: activeOrderId });

    const handleNewMessage = (msg) => {
      const normalizedMessage = normalizeChatMessage(msg);
      if (String(normalizedMessage.orderId) !== String(activeOrderId)) return;
      setChatMessages(prev => {
        const existingIndex = prev.findIndex(m => String(m.id) === String(normalizedMessage.id));
        if (existingIndex !== -1) {
          return prev.map(m => String(m.id) === String(normalizedMessage.id) ? normalizedMessage : m);
        }

        return [...prev, normalizedMessage];
      });

      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);
    };

    socket.on("chat:message", handleNewMessage);

    return () => {
      socket.off("chat:message", handleNewMessage);
    };
  }, [activeOrderId]);

  // Scroll to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !socketRef.current || !activeOrderId) return;

    socketRef.current.emit("send:message", {
      orderId: activeOrderId,
      content: typedMessage.trim()
    });

    setTypedMessage("");
  };

  function normalizeChatMessage(msg) {
    if (!msg) return msg;

    const sender = msg.sender || {};
    return {
      id: msg.id || msg._id || `${msg.orderId || activeOrderId}-${msg.createdAt || Date.now()}`,
      orderId: msg.orderId || activeOrderId,
      senderId: msg.senderId || sender._id || sender.id || sender,
      senderName: msg.senderName || sender.name || "Unknown",
      senderRole: msg.senderRole || sender.role || "BUYER",
      content: msg.content || "",
      imageUrl: msg.imageUrl || null,
      createdAt: msg.createdAt || new Date().toISOString(),
      status: msg.status || "sent",
    };
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const activeChannel = orders.find(o => o.id === activeOrderId);

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col text-current transition-colors">
      <Header />

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col h-[calc(100vh-5rem)] overflow-hidden">
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
              AgroVista Messages
            </h1>
            <p className="text-xs text-agri-brown mt-1">
              Direct negotiations and contract logistics chat rooms.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 bg-white/20 dark:bg-black/10 rounded-[2rem] border border-agri-green/5 overflow-hidden">
            {/* Left Channels list */}
            <div className="lg:col-span-4 border-r border-agri-green/5 flex flex-col h-full overflow-y-auto p-4 space-y-3">
              <span className="text-[10px] font-black uppercase text-agri-brown tracking-wider">Active Conversations</span>
              
              {isLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-14 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <p className="text-xs text-agri-brown italic p-4 text-center">No active contracts found.</p>
              ) : (
                orders.map((order) => {
                  const isActive = order.id === activeOrderId;
                  return (
                    <button
                      key={order.id}
                      onClick={() => setActiveOrderId(order.id)}
                      className={`text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                        isActive
                          ? "bg-agri-green/10 border-agri-green text-agri-green-dark dark:text-agri-green-light"
                          : "bg-white/60 dark:bg-zinc-900/30 border-transparent hover:bg-white"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-agri-green/5 flex items-center justify-center text-agri-green shrink-0">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div className="truncate flex-1">
                        <h5 className="text-xs font-black truncate">#{order.id} — {order.productName}</h5>
                        <p className="text-[10px] text-agri-brown font-semibold truncate mt-0.5">
                          {user.role === "FARMER" ? order.buyerName : order.farmerName}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Right Chat Message Box */}
            <div className="lg:col-span-8 flex flex-col h-full justify-between overflow-hidden">
              {activeChannel ? (
                <>
                  {/* Chat header */}
                  <div className="p-4 border-b border-agri-green/5 bg-agri-green/5 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase text-agri-brown">
                        {user.role === "FARMER" ? `Buyer: ${activeChannel.buyerName}` : `Farmer: ${activeChannel.farmerName}`}
                      </h4>
                      <h3 className="text-sm font-extrabold text-agri-green-dark dark:text-agri-green-light truncate max-w-[300px]">
                        Order #{activeChannel.id} — {activeChannel.productName}
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => router.push(`/orders/${activeChannel.id}`)}
                      className="text-[10px] font-bold py-1.5 px-3 border border-agri-green/20 text-agri-green"
                    >
                      Track Order Details
                    </Button>
                  </div>

                  {/* Scroll Area */}
                  <div
                    ref={chatScrollRef}
                    className="flex-1 p-4 overflow-y-auto space-y-4 bg-agri-cream/10 dark:bg-black/5"
                  >
                    {chatMessages.map((msg) => {
                      const isMe = String(msg.senderId) === String(currentUserId);
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col max-w-[80%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                        >
                          <span className="text-[9px] font-bold text-agri-brown mb-0.5 px-1">{msg.senderName}</span>
                          <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                            isMe
                              ? "bg-agri-green text-white rounded-tr-none"
                              : "bg-white dark:bg-zinc-800 border border-agri-green/5 text-current rounded-tl-none"
                          }`}>
                            {msg.content}
                          </div>
                          <span className="text-[8px] text-agri-brown-light mt-0.5 px-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Input form */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-agri-green/5 bg-white dark:bg-zinc-950 flex gap-2">
                    <input
                      type="text"
                      value={typedMessage}
                      onChange={(e) => setTypedMessage(e.target.value)}
                      placeholder="Type a message to discuss transit logistics..."
                      className="flex-1 px-4 py-2.5 rounded-xl border text-xs bg-white dark:bg-black/20 border-agri-green/10 focus:outline-none focus:ring-1 focus:ring-agri-green"
                    />
                    <Button
                      type="submit"
                      className="p-2.5 rounded-xl bg-agri-green text-white hover:bg-agri-green-hover"
                    >
                      <Send className="w-4.5 h-4.5" />
                    </Button>
                  </form>
                </>
              ) : (
                <div className="my-auto text-center p-8 space-y-2">
                  <MessageSquare className="w-12 h-12 text-agri-brown mx-auto" />
                  <h4 className="text-sm font-bold text-agri-green-dark">No Conversation Selected</h4>
                  <p className="text-xs text-agri-brown">Choose a contract channel from the sidebar list to start trading details.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
