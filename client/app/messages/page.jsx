"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Send,
  MessageSquare,
  Image as ImageIcon,
  Smile,
  Trash2,
  MoreVertical,
  X,
  ChevronRight,
  CheckCheck,
  Check,
  Paperclip,
  Info,
  Lock,
  PackageCheck,
  XCircle,
} from "lucide-react";
import Header from "../../components/shared/Header";
import Sidebar from "../../components/shared/Sidebar";
import Button from "../../components/ui/Button";
import { apiService } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { getSocket } from "../../lib/socket";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const shortId = (id = "") => {
  const s = String(id);
  return s.length > 8 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s;
};

const EMOJI_LIST = [
  "👍","✅","🌾","💰","🚚","🤝","❓","👏",
  "😊","🙏","⚡","📦","🔥","💯","❌","⏰",
];

function normalizeChatMessage(msg, fallbackOrderId) {
  if (!msg) return msg;
  const sender = msg.sender || {};
  return {
    id: msg.id || msg._id || `${msg.orderId || fallbackOrderId}-${msg.createdAt || Date.now()}`,
    orderId: msg.orderId || fallbackOrderId,
    senderId: msg.senderId || sender._id || sender.id || sender,
    senderName: msg.senderName || sender.name || "Unknown",
    senderRole: msg.senderRole || sender.role || "BUYER",
    content: msg.content || "",
    imageUrl: msg.imageUrl || null,
    createdAt: msg.createdAt || new Date().toISOString(),
    status: msg.status || "sent",
    reactions: msg.reactions || {},
  };
}

// ─── Emoji Picker ─────────────────────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute bottom-full mb-2 right-0 bg-white dark:bg-zinc-900 border border-agri-green/10 rounded-2xl shadow-xl p-3 z-50"
    >
      <div className="grid grid-cols-8 gap-1.5">
        {EMOJI_LIST.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => { onSelect(emoji); onClose(); }}
            className="text-xl hover:bg-agri-green/10 rounded-lg p-1 transition"
          >
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe, onReact, onDelete, showDelete }) {
  const [showActions, setShowActions] = useState(false);
  const [showReactPicker, setShowReactPicker] = useState(false);

  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col max-w-[75%] group ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactPicker(false); }}
    >
      {/* Sender name */}
      {!isMe && (
        <span className="text-[9px] font-bold text-agri-brown mb-1 px-1">
          {msg.senderName}
        </span>
      )}

      <div className="relative flex items-end gap-1.5">
        {/* Action buttons — appear on hover */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`flex items-center gap-1 mb-1 ${isMe ? "order-first" : "order-last"}`}
            >
              {/* Reaction button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowReactPicker(!showReactPicker)}
                  className="w-6 h-6 rounded-full bg-white dark:bg-zinc-800 border border-agri-green/10 flex items-center justify-center text-agri-brown hover:text-agri-green hover:border-agri-green/30 transition shadow-sm"
                >
                  <Smile className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {showReactPicker && (
                    <div className={`absolute bottom-full mb-1 ${isMe ? "right-0" : "left-0"}`}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white dark:bg-zinc-900 border border-agri-green/10 rounded-2xl shadow-xl p-2 flex gap-1 z-50"
                      >
                        {["👍","✅","🌾","🚚","❌","🔥"].map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => { onReact(msg.id, e); setShowReactPicker(false); setShowActions(false); }}
                            className="text-lg hover:bg-agri-green/10 rounded-lg px-1.5 py-0.5 transition"
                          >
                            {e}
                          </button>
                        ))}
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Delete (buyer's own messages only) */}
              {isMe && showDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(msg.id)}
                  className="w-6 h-6 rounded-full bg-white dark:bg-zinc-800 border border-red-200 flex items-center justify-center text-red-400 hover:text-red-600 hover:border-red-400 transition shadow-sm"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bubble */}
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed max-w-full break-words ${
            isMe
              ? "bg-agri-green text-white rounded-tr-sm shadow-sm shadow-agri-green/20"
              : "bg-white dark:bg-zinc-800 border border-agri-green/5 text-current rounded-tl-sm shadow-sm"
          }`}
        >
          {/* Image */}
          {msg.imageUrl && (
            <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={msg.imageUrl}
                alt="Shared image"
                className="max-w-[200px] rounded-xl mb-2 cursor-zoom-in hover:opacity-90 transition"
              />
            </a>
          )}
          {msg.content && <p>{msg.content}</p>}
        </div>
      </div>

      {/* Reactions display */}
      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 px-1">
          {Object.entries(msg.reactions).map(([emoji, count]) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onReact(msg.id, emoji)}
              className="text-[10px] bg-white dark:bg-zinc-800 border border-agri-green/10 rounded-full px-2 py-0.5 flex items-center gap-0.5 hover:border-agri-green/30 transition"
            >
              {emoji} <span className="font-bold text-agri-brown">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Time + read receipt */}
      <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
        <span className="text-[8px] text-agri-brown/60">{time}</span>
        {isMe && (
          msg.status === "read"
            ? <CheckCheck className="w-3 h-3 text-agri-green" />
            : <Check className="w-3 h-3 text-agri-brown/40" />
        )}
      </div>
    </motion.div>
  );
}

// ─── Conversation list item ───────────────────────────────────────────────────
function ConvItem({ order, isActive, onClick, onDelete, userName }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`relative group rounded-2xl border transition-all ${
        isActive
          ? "bg-agri-green/10 border-agri-green"
          : "bg-white/60 dark:bg-zinc-900/30 border-transparent hover:bg-white dark:hover:bg-zinc-900/60"
      }`}
    >
      <button
        onClick={onClick}
        className="w-full text-left p-3.5 flex items-center gap-3"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          isActive ? "bg-agri-green text-white" : "bg-agri-green/5 text-agri-green"
        }`}>
          <MessageSquare className="w-4 h-4" />
        </div>
        <div className="truncate flex-1 min-w-0">
          {/* ✅ FIX: Short readable order ID */}
          <h5 className="text-xs font-black truncate text-agri-green-dark dark:text-agri-green-light">
            #{shortId(order.id)} — {order.productName}
          </h5>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[10px] text-agri-brown font-semibold truncate">
              {userName}
            </p>
            {(order.status === "DELIVERED" || order.status === "CANCELLED") && (
              <Lock className="w-2.5 h-2.5 text-agri-brown/50 flex-shrink-0" />
            )}
          </div>
        </div>
      </button>

      {/* ⋮ menu */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-800 border border-agri-green/10 flex items-center justify-center text-agri-brown hover:text-agri-green transition"
        >
          <MoreVertical className="w-3 h-3" />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute right-0 top-7 bg-white dark:bg-zinc-900 border border-agri-green/10 rounded-xl shadow-lg z-50 overflow-hidden min-w-[140px]"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete(order.id);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Conversation
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const currentUserId = user?.id || user?._id || null;

  const [activeOrderId, setActiveOrderId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const [deletedConvs, setDeletedConvs] = useState([]); // local-only delete
  const [confirmDeleteConv, setConfirmDeleteConv] = useState(null);

  const socketRef = useRef(null);
  const chatScrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const { data: ordersRes, isLoading } = useQuery({
    queryKey: ["chatChannels", user?.role],
    queryFn: () => apiService.getOrders(user?.role),
    enabled: !!user,
  });

  const allOrders = ordersRes?.data || [];
  const orders = allOrders.filter((o) => !deletedConvs.includes(o.id));

  useEffect(() => {
    if (orders.length > 0 && !activeOrderId) {
      setActiveOrderId(orders[0].id);
    }
  }, [orders, activeOrderId]);

  // Load chat history
  useEffect(() => {
    if (!activeOrderId) return;
    const fetch = async () => {
      try {
        const res = await apiService.getChatHistory(activeOrderId);
        if (res.success) {
          setChatMessages((res.data || []).map((m) => normalizeChatMessage(m, activeOrderId)));
        }
      } catch {}
    };
    fetch();
  }, [activeOrderId]);

  // Socket
  useEffect(() => {
    if (!activeOrderId) return;
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;
    socket.emit("join:chat", { orderId: activeOrderId });

    const handleNewMessage = (msg) => {
      const n = normalizeChatMessage(msg, activeOrderId);
      if (String(n.orderId) !== String(activeOrderId)) return;
      setChatMessages((prev) => {
        const idx = prev.findIndex((m) => String(m.id) === String(n.id));
        return idx !== -1 ? prev.map((m) => String(m.id) === String(n.id) ? n : m) : [...prev, n];
      });
      setTimeout(() => {
        if (chatScrollRef.current)
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }, 80);
    };

    const handleTyping = ({ userId, name }) => {
      if (String(userId) !== String(currentUserId)) {
        setTypingUser(name || "Someone");
        setIsTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
      }
    };

    socket.on("chat:message", handleNewMessage);
    socket.on("chat:typing", handleTyping);

    return () => {
      socket.off("chat:message", handleNewMessage);
      socket.off("chat:typing", handleTyping);
    };
  }, [activeOrderId, currentUserId]);

  // Scroll to bottom
  useEffect(() => {
    if (chatScrollRef.current)
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages]);

  // Send message
  const handleSendMessage = (e) => {
    e?.preventDefault();
    const content = typedMessage.trim();
    const img = imageUrl.trim();
    if (!content && !img) return;
    if (!socketRef.current || !activeOrderId) return;

    socketRef.current.emit("send:message", {
      orderId: activeOrderId,
      content,
      imageUrl: img || undefined,
    });

    setTypedMessage("");
    setImageUrl("");
    setShowImageInput(false);
    inputRef.current?.focus();
  };

  // Typing indicator emit
  const handleTyping = (e) => {
    setTypedMessage(e.target.value);
    if (socketRef.current && activeOrderId) {
      socketRef.current.emit("chat:typing", {
        orderId: activeOrderId,
        userId: currentUserId,
        name: user?.name,
      });
    }
  };

  // Emoji insert
  const handleEmojiSelect = (emoji) => {
    setTypedMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  // Reaction toggle (local + socket)
  const handleReact = (msgId, emoji) => {
    setChatMessages((prev) =>
      prev.map((m) => {
        if (String(m.id) !== String(msgId)) return m;
        const reactions = { ...(m.reactions || {}) };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...m, reactions };
      })
    );
  };

  // Delete a single message (local only for now)
  const handleDeleteMessage = (msgId) => {
    setChatMessages((prev) => prev.filter((m) => String(m.id) !== String(msgId)));
    toast.success("Message deleted.");
  };

  // Delete whole conversation (local hide)
  const handleDeleteConversation = (orderId) => {
    setConfirmDeleteConv(orderId);
  };

  const confirmDelete = () => {
    setDeletedConvs((prev) => [...prev, confirmDeleteConv]);
    if (activeOrderId === confirmDeleteConv) {
      const next = orders.find((o) => o.id !== confirmDeleteConv);
      setActiveOrderId(next?.id || null);
      setChatMessages([]);
    }
    setConfirmDeleteConv(null);
    toast.success("Conversation removed from your inbox.");
  };

  if (!isAuthenticated || !user) return null;

  const activeChannel = orders.find((o) => o.id === activeOrderId);

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col transition-colors">
      <Header />

      {/* ── Delete conversation confirm modal ─────────────────────────── */}
      <AnimatePresence>
        {confirmDeleteConv && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setConfirmDeleteConv(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-3xl border border-agri-green/10 p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-agri-green-dark dark:text-white">
                  Delete conversation?
                </h3>
                <p className="text-xs text-agri-brown">
                  This will remove the chat from your inbox. The farmer's copy remains unaffected.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteConv(null)}
                  className="flex-1 py-2.5 rounded-2xl text-xs font-bold border border-agri-green/15 text-agri-brown hover:bg-agri-green/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-2xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col h-[calc(100vh-5rem)] overflow-hidden">
          {/* Page header */}
          <div className="mb-5">
            <h1 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
              AgroVista Messages
            </h1>
            <p className="text-xs text-agri-brown mt-1">
              Direct negotiations and contract logistics chat rooms.
            </p>
          </div>

          {/* Chat layout */}
          <div className="flex flex-1 min-h-0 rounded-[2rem] border border-agri-green/5 overflow-hidden bg-white/20 dark:bg-black/10">

            {/* ── LEFT: Conversation list ─────────────────────────────── */}
            <div className="w-72 flex-shrink-0 border-r border-agri-green/5 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-agri-green/5">
                <p className="text-[10px] font-black uppercase text-agri-brown tracking-widest">
                  Active Conversations
                </p>
                {orders.length > 0 && (
                  <p className="text-[10px] text-agri-brown/60 mt-0.5">
                    {orders.length} thread{orders.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {isLoading ? (
                  <div className="space-y-2 animate-pulse">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-14 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-10 space-y-2 px-4">
                    <MessageSquare className="w-8 h-8 text-agri-green/20 mx-auto" />
                    <p className="text-xs text-agri-brown font-semibold">
                      No conversations yet
                    </p>
                    <p className="text-[10px] text-agri-brown/60">
                      Place an order to start chatting with a farmer.
                    </p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <ConvItem
                      key={order.id}
                      order={order}
                      isActive={order.id === activeOrderId}
                      onClick={() => { setActiveOrderId(order.id); setChatMessages([]); }}
                      onDelete={handleDeleteConversation}
                      userName={user.role === "FARMER" ? order.buyerName : order.farmerName}
                    />
                  ))
                )}
              </div>
            </div>

            {/* ── RIGHT: Chat area ────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {activeChannel ? (
                <>
                  {/* Chat header */}
                  <div className="px-5 py-3.5 border-b border-agri-green/5 bg-agri-green/5 dark:bg-agri-green/3 flex items-center justify-between flex-shrink-0">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase text-agri-brown tracking-widest">
                        {user.role === "FARMER"
                          ? `Buyer: ${activeChannel.buyerName}`
                          : `Farmer: ${activeChannel.farmerName}`}
                      </p>
                      <h3 className="text-sm font-extrabold text-agri-green-dark dark:text-agri-green-light truncate flex items-center gap-2">
                        Order #{shortId(activeChannel.id)} — {activeChannel.productName}
                        {activeChannel.status && (
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${
                            activeChannel.status === "DELIVERED"
                              ? "bg-agri-green/15 text-agri-green"
                              : activeChannel.status === "CANCELLED"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-agri-wheat/15 text-agri-wheat-dark"
                          }`}>
                            {activeChannel.status}
                          </span>
                        )}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        onClick={() => router.push(`/orders/${activeChannel.id}`)}
                        className="text-[10px] font-bold py-1.5 px-3 border border-agri-green/20 text-agri-green rounded-xl flex items-center gap-1"
                      >
                        <Info className="w-3.5 h-3.5" />
                        Track Order
                      </Button>
                      {/* Delete this conversation */}
                      <button
                        type="button"
                        onClick={() => handleDeleteConversation(activeChannel.id)}
                        className="w-8 h-8 rounded-xl border border-red-200 dark:border-red-500/20 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Messages scroll area */}
                  <div
                    ref={chatScrollRef}
                    className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
                  >
                    {chatMessages.length === 0 ? (
                      <div className="text-center py-16 space-y-2">
                        <MessageSquare className="w-10 h-10 text-agri-green/15 mx-auto" />
                        <p className="text-xs text-agri-brown/60 font-semibold">
                          No messages yet. Start the conversation!
                        </p>
                      </div>
                    ) : (
                      chatMessages.map((msg) => {
                        const isMe = String(msg.senderId) === String(currentUserId);
                        return (
                          <MessageBubble
                            key={msg.id}
                            msg={msg}
                            isMe={isMe}
                            onReact={handleReact}
                            onDelete={handleDeleteMessage}
                            showDelete={isMe}
                          />
                        );
                      })
                    )}

                    {/* Typing indicator */}
                    <AnimatePresence>
                      {isTyping && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 mr-auto"
                        >
                          <div className="bg-white dark:bg-zinc-800 border border-agri-green/5 rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-1.5">
                            <span className="text-[9px] text-agri-brown font-semibold">{typingUser} is typing</span>
                            <div className="flex gap-0.5">
                              {[0, 1, 2].map((i) => (
                                <motion.span
                                  key={i}
                                  animate={{ y: [0, -4, 0] }}
                                  transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                                  className="w-1.5 h-1.5 rounded-full bg-agri-brown/40 inline-block"
                                />
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ✅ FIX: Lock chat when order is DELIVERED or CANCELLED */}
                  {(activeChannel.status === "DELIVERED" || activeChannel.status === "CANCELLED") ? (
                    <div className="px-4 pb-4 pt-3 border-t border-agri-green/5 bg-white dark:bg-zinc-950 flex-shrink-0">
                      <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border ${
                        activeChannel.status === "DELIVERED"
                          ? "bg-agri-green/5 border-agri-green/15"
                          : "bg-red-500/5 border-red-500/15"
                      }`}>
                        {activeChannel.status === "DELIVERED" ? (
                          <>
                            <div className="w-8 h-8 rounded-xl bg-agri-green/10 flex items-center justify-center flex-shrink-0">
                              <PackageCheck className="w-4 h-4 text-agri-green" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-agri-green-dark dark:text-agri-green-light">
                                Order delivered — chat closed
                              </p>
                              <p className="text-[10px] text-agri-brown mt-0.5">
                                This order has been completed. No further messages can be sent.
                              </p>
                            </div>
                            <Lock className="w-4 h-4 text-agri-green/50 flex-shrink-0" />
                          </>
                        ) : (
                          <>
                            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                              <XCircle className="w-4 h-4 text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-red-600 dark:text-red-400">
                                Order cancelled — chat closed
                              </p>
                              <p className="text-[10px] text-agri-brown mt-0.5">
                                This order was cancelled. You can still view the message history above.
                              </p>
                            </div>
                            <Lock className="w-4 h-4 text-red-400/50 flex-shrink-0" />
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Image URL input (expandable) */}
                      <AnimatePresence>
                        {showImageInput && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-4 pb-2 overflow-hidden"
                          >
                            <div className="flex gap-2 bg-agri-green/5 border border-agri-green/10 rounded-2xl px-3 py-2">
                              <ImageIcon className="w-4 h-4 text-agri-green mt-0.5 flex-shrink-0" />
                              <input
                                type="text"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="Paste image URL (e.g. https://...)"
                                className="flex-1 bg-transparent text-xs focus:outline-none text-agri-green-dark dark:text-gray-200 placeholder:text-agri-brown/50"
                              />
                              {imageUrl && (
                                <img
                                  src={imageUrl}
                                  alt="Preview"
                                  className="w-8 h-8 rounded-lg object-cover border border-agri-green/20"
                                  onError={(e) => { e.target.style.display = "none"; }}
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => { setImageUrl(""); setShowImageInput(false); }}
                                className="text-agri-brown hover:text-red-500 transition"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Active input bar */}
                      <div className="px-4 pb-4 pt-2 border-t border-agri-green/5 bg-white dark:bg-zinc-950 flex-shrink-0">
                        <div className="flex items-center gap-2 bg-agri-green/5 dark:bg-white/5 border border-agri-green/10 rounded-2xl px-3 py-2">
                          {/* Image attach */}
                          <button
                            type="button"
                            onClick={() => setShowImageInput(!showImageInput)}
                            className={`w-7 h-7 rounded-xl flex items-center justify-center transition ${
                              showImageInput
                                ? "bg-agri-green text-white"
                                : "text-agri-brown hover:text-agri-green hover:bg-agri-green/10"
                            }`}
                            title="Attach image URL"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>

                          {/* Text input */}
                          <input
                            ref={inputRef}
                            type="text"
                            value={typedMessage}
                            onChange={handleTyping}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) handleSendMessage(e);
                            }}
                            placeholder="Type a message to discuss logistics..."
                            className="flex-1 bg-transparent text-xs focus:outline-none text-agri-green-dark dark:text-gray-200 placeholder:text-agri-brown/50 py-1"
                          />

                          {/* Emoji */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              className={`w-7 h-7 rounded-xl flex items-center justify-center transition ${
                                showEmojiPicker
                                  ? "bg-agri-green text-white"
                                  : "text-agri-brown hover:text-agri-green hover:bg-agri-green/10"
                              }`}
                              title="Emoji"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                            <AnimatePresence>
                              {showEmojiPicker && (
                                <EmojiPicker
                                  onSelect={handleEmojiSelect}
                                  onClose={() => setShowEmojiPicker(false)}
                                />
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Send */}
                          <button
                            type="button"
                            onClick={handleSendMessage}
                            disabled={!typedMessage.trim() && !imageUrl.trim()}
                            className="w-8 h-8 rounded-xl bg-agri-green text-white flex items-center justify-center hover:bg-agri-green-hover disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm shadow-agri-green/25"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[9px] text-agri-brown/40 mt-1.5 text-center">
                          Press Enter to send • Emoji & image sharing supported
                        </p>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="my-auto text-center p-8 space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-agri-green/5 flex items-center justify-center mx-auto">
                    <MessageSquare className="w-8 h-8 text-agri-green/30" />
                  </div>
                  <h4 className="text-sm font-bold text-agri-green-dark dark:text-white">
                    No conversation selected
                  </h4>
                  <p className="text-xs text-agri-brown max-w-xs mx-auto">
                    Choose a contract channel from the left to view messages and discuss logistics.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
