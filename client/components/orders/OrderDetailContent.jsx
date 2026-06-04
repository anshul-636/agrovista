"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, MapPin, Send, UserCheck, CheckCircle,
  Clock, Package, Truck, ShieldCheck, XCircle, Star,
  Trash2, Lock,
} from "lucide-react";
import ChatContainer from "../chat/ChatContainer";
import Button from "../ui/Button";
import { Card } from "../ui/Card";
import Badge from "../ui/Badge";
import { apiService } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { getSocket } from "../../lib/socket";
import { toast } from "sonner";

// ── ETA stages ────────────────────────────────────────────────────────────────
const ORDER_STAGES = [
  { key: "PENDING",    label: "Order Placed",    description: "Awaiting farmer confirmation.",                              icon: Clock,        offsetDays: 0 },
  { key: "ACCEPTED",   label: "Order Confirmed", description: "Farmer accepted — preparation begins.",                     icon: CheckCircle,  offsetDays: 1 },
  { key: "PACKED",     label: "Packed & Ready",  description: "Produce harvested, graded, and packaged.",                  icon: Package,      offsetDays: 3 },
  { key: "DISPATCHED", label: "Dispatched",      description: "Consignment in transit to your address.",                   icon: Truck,        offsetDays: 5 },
  { key: "DELIVERED",  label: "Delivered",       description: "Order delivered. Confirm receipt to release escrow.",       icon: ShieldCheck,  offsetDays: 8 },
];

function addDays(date, days) {
  const d = new Date(date); d.setDate(d.getDate() + days); return d;
}
function fmtDate(d) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(d);
}
function fmtDateTime(s) {
  if (!s) return null;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(s));
}

function buildTimeline(order) {
  if (!order) return [];
  const placed = new Date(order.createdAt);
  const curIdx = ORDER_STAGES.findIndex(s => s.key === order.status);

  // ✅ FIX: DELIVERED is a terminal completed state — no stage should pulse
  // as "In Progress" once the order is fully done. Without this flag, the
  // DELIVERED step gets both isDone=true AND isActive=true, so the badge
  // shows "In Progress" and the icon pulses even after buyer confirmation.
  const isTerminalComplete = order.status === "DELIVERED";

  return ORDER_STAGES.map((stage, idx) => {
    const isDone = idx <= curIdx;

    // ✅ FIX: isActive is only true when the step is the CURRENT step AND
    // the order has NOT yet reached a terminal completed state.
    const isActive = idx === curIdx && !isTerminalComplete;
    const isFuture = idx > curIdx;

    const serverEvent = (order.timeline || []).find(e => e.status === stage.key);
    const actualTime  = serverEvent?.timestamp ? fmtDateTime(serverEvent.timestamp) : null;
    const estimated   = addDays(placed, stage.offsetDays);

    const etaLabel = isFuture
      ? `Expected by ${fmtDate(estimated)}`
      : actualTime
      ? `Completed ${actualTime}`
      : isActive
      ? `In progress — expected ${fmtDate(estimated)}`
      : "Completed";

    return { ...stage, isDone, isActive, isFuture, etaLabel, estimatedDate: estimated };
  });
}

// ── Star-rating widget ────────────────────────────────────────────────────────
function StarRating({ value, onChange, size = 7 }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110">
          <Star className={`w-${size} h-${size} transition-colors ${
            n <= (hovered || value) ? "text-amber-400 fill-amber-400" : "text-gray-300"
          }`} />
        </button>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function OrderDetailContent() {
  const { id }          = useParams();
  const router          = useRouter();
  const queryClient     = useQueryClient();
  const { user }        = useAuthStore();
  const currentUserId   = user?.id || user?._id || null;

  const [status,        setStatus]        = useState("");
  const [timeline,      setTimeline]      = useState([]);
  const [chatMessages,  setChatMessages]  = useState([]);
  const [typedMessage,  setTypedMessage]  = useState("");
  const [imageFile,     setImageFile]     = useState(null);
  const [imagePreview,  setImagePreview]  = useState(null);
  const [isSending,     setIsSending]     = useState(false);
  const [onlineStatus,  setOnlineStatus]  = useState("Online");
  const [mounted,       setMounted]       = useState(false);

  // Review state
  const [reviewRating,  setReviewRating]  = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  
  const socketRef     = useRef(null);
  const chatScrollRef = useRef(null);
  const imageInputRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  const { data: orderRes, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn:  () => apiService.getOrderById(id),
    enabled:  !!id && mounted,
  });

  const order       = orderRes?.data || null;
  const isDelivered = status === "DELIVERED";
  const isCancelled = status === "CANCELLED";
  const isBuyer     = user?.role === "BUYER";
  const chatLocked  = isDelivered || isCancelled;

  useEffect(() => {
    if (order) { 
      setStatus(order.status); 
      setTimeline(order.timeline || []);
      if(order.hasReview) setReviewSubmitted(true);
     }
  }, [order]);

  // Load chat history
  useEffect(() => {
    if (!mounted || !id) return;
    apiService.getChatHistory(id)
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setChatMessages(res.data.map(m => ({
            ...m,
            senderId:   m.senderId   || m.sender_id   || "",
            senderName: m.senderName || m.sender_name || "Unknown",
            content:    m.content    || "",
            createdAt:  m.createdAt  || m.created_at  || new Date().toISOString(),
            id:         m.id || m._id || `msg-${Math.random()}`,
          })));
        } else { setChatMessages([]); }
      })
      .catch(() => setChatMessages([]));
  }, [id, mounted]);

  // Socket bindings
  useEffect(() => {
    if (!id || !mounted) return;
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;
    socket.emit("join:chat", { orderId: id });

    const handleMsg = (msg) => {
      if (msg.orderId !== id) return;
      const s = {
        ...msg,
        senderId:   msg.senderId   || "",
        senderName: msg.senderName || "Unknown",
        content:    msg.content    || "",
        createdAt:  msg.createdAt  || new Date().toISOString(),
        id:         msg.id || msg._id || `msg-${Math.random()}`,
      };
      setChatMessages(prev => {
        if (prev.find(m => String(m.id) === String(s.id))) return prev.map(m => String(m.id) === String(s.id) ? s : m);
        const optIdx = prev.findIndex(m => String(m.senderId) === String(s.senderId) && String(m.content).trim() === String(s.content).trim() && m.status === "sending");
        if (optIdx !== -1) return prev.map((m, i) => i === optIdx ? s : m);
        return [...prev, s];
      });
      setTimeout(() => { if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }, 100);
      if (String(s.senderId) !== String(currentUserId)) toast.info(`New message from ${s.senderName}`, { icon: "💬" });
    };

    // When other party clears chat, clear locally too
    const handleClear = (data) => {
      if (data?.orderId === id) setChatMessages([]);
    };

    // Listen for status changes pushed by the OTHER party so both
    // buyer and farmer see updates without refreshing the page.
    const handleOrderUpdated = (data) => {
      if (!data || data.orderId !== id) return;
      if (data.status) {
        setStatus(data.status);
        // Notify the other party in real time
        const statusLabels = {
          ACCEPTED: "Order accepted by farmer",
          PACKED: "Order packed & ready",
          DISPATCHED: "Order dispatched",
          DELIVERED: "Delivery confirmed — funds released",
          CANCELLED: "Order cancelled",
        };
        const label = statusLabels[data.status];
        if (label) toast.info(label, { icon: "📦" });
      }
      if (data.timeline) setTimeline(data.timeline);
      // Re-fetch for full order data (timeline details, etc.)
      queryClient.invalidateQueries(["order", id]);
    };

    socket.on("chat:message", handleMsg);
    socket.on("chat:cleared", handleClear);
    socket.on("order:updated", handleOrderUpdated);
    const t = setTimeout(() => setOnlineStatus("Active 5m ago"), 45000);
    return () => {
      socket.off("chat:message", handleMsg);
      socket.off("chat:cleared", handleClear);
      socket.off("order:updated", handleOrderUpdated);
      clearTimeout(t);
    };
  }, [id, currentUserId, mounted]);

  useEffect(() => {
    if (chatScrollRef.current && mounted) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages, mounted]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateStatusMutation = useMutation({
    mutationFn: (s) => apiService.updateOrderStatus(id, s),
    onSuccess: (res) => {
      if (res.success && res.data) {
        setStatus(res.data.status);
        setTimeline(res.data.timeline || []);
        queryClient.invalidateQueries(["order", id]);
        queryClient.invalidateQueries(["farmerOrders"]);
        toast.success(`Status updated to ${res.data.status}!`);
        socketRef.current?.emit("order:updated", { orderId: id, status: res.data.status });
      } else { toast.error(res.error || "Failed to update status"); }
    },
  });

  const verifyDeliveryMutation = useMutation({
    mutationFn: () => apiService.verifyOrderDelivery(id),
    onSuccess: (res) => {
      if (res.success && res.data) {
        setStatus(res.data.status); setTimeline(res.data.timeline || []);
        queryClient.invalidateQueries(["order", id]);
        toast.success("Delivery confirmed! Escrow released.");
        socketRef.current?.emit("order:updated", { orderId: id, status: res.data.status });
      } else { toast.error(res.error || "Verification failed"); }
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: () => apiService.cancelOrder(id),
    onSuccess: (res) => {
      if (res.success && res.data) {
        setStatus(res.data.status); setTimeline(res.data.timeline || []);
        queryClient.invalidateQueries(["order", id]);
        queryClient.invalidateQueries(["buyerOrders"]);
        queryClient.invalidateQueries(["farmerOrders"]);
        toast.success("Order cancelled. Stock restored.");
        socketRef.current?.emit("order:updated", { orderId: id, status: res.data.status });
      } else { toast.error(res.error || "Cancellation failed"); }
    },
  });

  const handleProgressStatus = () => {
    const seq = ["PENDING", "ACCEPTED", "PACKED", "DISPATCHED"];
    const idx = seq.indexOf(status);
    if (idx !== -1 && idx < seq.length - 1) updateStatusMutation.mutate(seq[idx + 1]);
  };

  // Clear chat
  const handleClearChat = async () => {
    if (!window.confirm("Clear all messages in this chat? This cannot be undone.")) return;
    try {
      await apiService.clearChat(id);
      setChatMessages([]);
      toast.success("Chat cleared.");
    } catch { toast.error("Failed to clear chat."); }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (chatLocked || (!typedMessage.trim() && !imageFile) || isSending) return;
    setIsSending(true);
    const opt = {
      id: `opt-${Date.now()}`, orderId: id, senderId: currentUserId || "me",
      senderName: user?.name || "You", senderRole: user?.role || "BUYER",
      content: typedMessage.trim(), imageUrl: imagePreview,
      createdAt: new Date().toISOString(), status: "sending",
    };
    setChatMessages(prev => [...prev, opt]);
    setTypedMessage(""); setImageFile(null); setImagePreview(null);
    try {
      const res = await apiService.sendMessage(id, opt.content, imageFile);
      if (res.success && res.data)
        setChatMessages(prev => prev.map(m => m.id === opt.id ? { ...res.data, status: "sent" } : m));
    } catch {
      setChatMessages(prev => prev.map(m => m.id === opt.id ? { ...m, status: "failed" } : m));
    } finally { setIsSending(false); }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select a valid image."); return; }
    setImageFile(file); setImagePreview(URL.createObjectURL(file));
  };

  // Submit review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (reviewRating === 0) { toast.error("Please select a star rating."); return; }
    setReviewLoading(true);
    try {
      const farmerId = order?.farmerId || order?.farmer?._id || order?.farmer;
      const orderId = order?._id || order?.id;
      await apiService.submitReview(farmerId, { rating: reviewRating, comment: reviewComment, orderId });
      setReviewSubmitted(true);
      toast.success("Review submitted! Thank you.");
      queryClient.invalidateQueries(["order", id]);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit review.");
    } finally { setReviewLoading(false); }
  };

  // ── Loading states ──────────────────────────────────────────────────────────
  const skeleton = (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col">
      <div className="max-w-7xl mx-auto p-8 w-full animate-pulse space-y-6">
        <div className="h-6 w-24 bg-gray-200 dark:bg-zinc-800 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl" />
          <div className="lg:col-span-5 h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl" />
        </div>
      </div>
    </div>
  );

  if (!mounted || isLoading) return skeleton;
  if (!order) return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex items-center justify-center">
      <div className="text-center p-8 space-y-4">
        <h2 className="text-xl font-bold text-red-500">Order Not Found</h2>
        <Button onClick={() => router.push("/orders")}>Return to Orders</Button>
      </div>
    </div>
  );

  const etaStages = buildTimeline(order);
  const otherName = user?.role === "FARMER" ? order.buyerName : order.farmerName;

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col text-current transition-colors">
      <div className="max-w-7xl mx-auto p-6 lg:p-8 w-full">

        {/* Header nav */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 text-agri-brown hover:text-agri-green transition font-semibold text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-xs bg-agri-brown/10 text-agri-brown px-3 py-1 rounded-full font-bold">
            CONTRACT FULFILLMENT PORTAL
          </span>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-black text-agri-green-dark">
              Order #{(order.orderId || order.id || "").slice(-8).toUpperCase()}
            </h1>
            <Badge variant={
              isDelivered ? "green" : status === "DISPATCHED" ? "yellow" :
              isCancelled ? "red" : "outline"
            }>{status}</Badge>
          </div>
          <p className="text-agri-brown mt-1 text-sm">
            {order.productName} · {order.quantity} kg · ₹{order.totalAmount?.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── LEFT: Timeline ── */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-agri-green/5 overflow-hidden">
              <div className="p-5 border-b border-agri-green/5 bg-gradient-to-r from-agri-green/5 to-transparent flex items-center justify-between">
                <h2 className="text-lg font-black text-agri-green-dark">
                  {isCancelled ? "Order Cancelled" : isDelivered ? "Order Completed" : "Live Shipment Tracker"}
                </h2>
              </div>

              <div className="p-6">
                {isCancelled ? (
                  <div className="flex flex-col items-center py-8 gap-3 text-center">
                    <XCircle className="w-12 h-12 text-red-400" />
                    <p className="font-bold text-red-500">This order was cancelled.</p>
                    <p className="text-sm text-agri-brown">Stock has been restored to the listing.</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {etaStages.map((stage, idx) => {
                      const Icon   = stage.icon;
                      const isLast = idx === etaStages.length - 1;
                      return (
                        <div key={stage.key} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                              stage.isDone
                                ? "bg-agri-green text-white shadow-md"
                                : stage.isActive
                                ? "bg-agri-green/20 text-agri-green ring-2 ring-agri-green ring-offset-2 animate-pulse"
                                : "bg-gray-100 dark:bg-zinc-800 text-gray-400"
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            {!isLast && (
                              <div className={`w-0.5 h-12 my-1 rounded-full ${
                                stage.isDone ? "bg-agri-green" : "bg-gray-200 dark:bg-zinc-700"
                              }`} />
                            )}
                          </div>
                          <div className="pb-6 flex-1">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <h4 className={`font-black text-sm ${
                                stage.isDone ? "text-agri-green-dark dark:text-agri-green-light"
                                : stage.isActive ? "text-agri-green" : "text-gray-400"
                              }`}>{stage.label}</h4>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                stage.isDone && !stage.isActive ? "bg-agri-green/10 text-agri-green"
                                : stage.isActive ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-gray-100 dark:bg-zinc-800 text-gray-400"
                              }`}>
                                {stage.isDone && !stage.isActive ? "✓ Done" : stage.isActive ? "In Progress" : `Est. ${fmtDate(stage.estimatedDate)}`}
                              </span>
                            </div>
                            <p className={`text-xs mt-0.5 ${stage.isFuture ? "text-gray-400" : "text-agri-brown"}`}>
                              {stage.description}
                            </p>
                            <p className={`text-[10px] mt-1 font-semibold ${
                              stage.isFuture ? "text-gray-400" : stage.isActive ? "text-amber-600" : "text-agri-green"
                            }`}>{stage.etaLabel}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Action buttons */}
                <div className="space-y-3 mt-2">
                  {user?.role === "FARMER" && !["DELIVERED", "DISPATCHED", "CANCELLED"].includes(status) && (
                    <button onClick={handleProgressStatus} disabled={updateStatusMutation.isPending}
                      className="w-full px-4 py-3 bg-agri-green text-white rounded-xl font-bold hover:bg-agri-green-hover transition disabled:opacity-50">
                      {updateStatusMutation.isPending ? "Updating…" : `Mark as ${
                        status === "PENDING" ? "Accepted" : status === "ACCEPTED" ? "Packed" : "Dispatched"
                      }`}
                    </button>
                  )}
                  {isBuyer && status === "DISPATCHED" && (
                    <button onClick={() => verifyDeliveryMutation.mutate()} disabled={verifyDeliveryMutation.isPending}
                      className="w-full px-4 py-3 bg-agri-green text-white rounded-xl font-bold hover:bg-agri-green-hover transition shadow-lg ring-4 ring-agri-green/20">
                      {verifyDeliveryMutation.isPending ? "Verifying…" : "✓ Confirm Delivery & Release Funds"}
                    </button>
                  )}
                  {isBuyer && ["PENDING", "ACCEPTED"].includes(status) && (
                    <button onClick={() => { if (window.confirm("Cancel this order?")) cancelOrderMutation.mutate(); }}
                      disabled={cancelOrderMutation.isPending}
                      className="w-full px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50">
                      {cancelOrderMutation.isPending ? "Cancelling…" : "Cancel Order"}
                    </button>
                  )}
                </div>
              </div>
            </Card>

            {/* ── REVIEW SECTION (buyer, after delivery) ── */}
            {isBuyer && isDelivered && (
              <Card className="border-agri-green/5 overflow-hidden">
                <div className="p-5 border-b border-agri-green/5 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-900/10">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                    <h2 className="text-lg font-black text-agri-green-dark">Rate Your Experience</h2>
                  </div>
                  <p className="text-xs text-agri-brown mt-1">
                    Your review helps other buyers and improves the farmer&apos;s trust score.
                  </p>
                </div>
                <div className="p-6">
                  {reviewSubmitted ? (
                    <div className="flex flex-col items-center gap-3 py-4 text-center">
                      <CheckCircle className="w-10 h-10 text-agri-green" />
                      <p className="font-black text-agri-green text-base">Review Submitted!</p>
                      <p className="text-xs text-agri-brown">Thank you for helping the community.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitReview} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-agri-green uppercase">
                          Rating for {order.farmerName}
                        </label>
                        <StarRating value={reviewRating} onChange={setReviewRating} size={8} />
                        {reviewRating > 0 && (
                          <p className="text-[10px] text-agri-brown font-semibold">
                            {["","Poor","Fair","Good","Very Good","Excellent"][reviewRating]}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-agri-green uppercase">Comment (optional)</label>
                        <textarea rows={3} value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="How was the quality? Was delivery on time?"
                          className="w-full px-4 py-3 rounded-2xl border text-sm bg-white/60 dark:bg-black/30 border-agri-green/10 focus:outline-none focus:ring-2 focus:ring-agri-green/20 resize-none" />
                      </div>
                      <Button type="submit" variant="primary" disabled={reviewLoading || reviewRating === 0}
                        className="w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
                        <Star className="w-4 h-4" />
                        {reviewLoading ? "Submitting…" : "Submit Review"}
                      </Button>
                    </form>
                  )}
                </div>
              </Card>
            )}

            {/* Sourced Crop Items Card */}
            <Card className="border-agri-green/5">
              <div className="p-5 border-b border-agri-green/5 bg-gradient-to-r from-agri-green/5 to-transparent">
                <h2 className="text-lg font-black text-agri-green-dark">Sourced Crop Items</h2>
              </div>
              <div className="p-6 space-y-4">
                {order.items && order.items.length > 0 ? (
                  <div className="space-y-4">
                    <div className="divide-y divide-agri-green/5">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="py-3 flex items-center justify-between text-xs sm:text-sm">
                          <div>
                            <span className="font-extrabold text-agri-green-dark dark:text-agri-green-light">
                              {item.product?.name || order.productName || "Crop"}
                            </span>
                            <span className="text-agri-brown ml-2 font-semibold">
                              ({item.quantity} {order.unit || "kg"} @ ₹{item.unitPrice})
                            </span>
                          </div>
                          <span className="font-black text-agri-green">
                            ₹{(item.total || item.quantity * item.unitPrice).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="h-px bg-agri-green/5" />
                    
                    <div className="space-y-2.5 text-xs font-semibold text-agri-brown">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>₹{order.subtotal?.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST / Cess (5%)</span>
                        <span>₹{order.tax?.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-sm sm:text-base font-black text-agri-green-dark dark:text-white pt-2 border-t border-dashed border-agri-green/10">
                        <span>Total Sourced Commitment</span>
                        <span className="text-agri-green">₹{(order.total || order.totalAmount)?.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs sm:text-sm font-semibold">
                      <span>{order.productName} ({order.quantity} {order.unit || "kg"} @ ₹{order.unitPrice || order.product?.price})</span>
                      <span className="font-black text-agri-green">₹{order.totalAmount?.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm font-black border-t border-agri-green/5 pt-3">
                      <span>Total</span>
                      <span className="text-agri-green">₹{order.totalAmount?.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Logistics */}
            <Card className="border-agri-green/5">
              <div className="p-5 border-b border-agri-green/5 bg-gradient-to-r from-agri-green/5 to-transparent">
                <h2 className="text-lg font-black text-agri-green-dark">Logistics & Escrow</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-agri-brown font-bold mb-2 uppercase">Delivery Address</p>
                  <div className="flex gap-2">
                    <MapPin className="w-4 h-4 text-agri-green shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold">
                      {order.shippingAddress && order.shippingAddress.street
                        ? `${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`
                        : order.deliveryAddress}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-agri-brown font-bold mb-2 uppercase">Escrow / Gross Commitment</p>
                  <div className="flex gap-2">
                    <UserCheck className="w-4 h-4 text-agri-green shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold">
                      ₹{(order.total || order.totalAmount)?.toLocaleString("en-IN")}{" "}
                      {isDelivered
                        ? "— released to grower."
                        : order.paymentMethod === "COD"
                        ? "— payable on delivery."
                        : "— locked until delivery confirmation."}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-agri-brown font-bold mb-2 uppercase">Payment Details</p>
                  <div className="space-y-1 text-sm font-semibold">
                    <p>Method: <span className="text-agri-green">{order.paymentMethod || "ONLINE"}</span></p>
                    <p>Status: <span className={order.paymentStatus === "Paid" ? "text-green-600 font-bold" : "text-amber-600 font-bold"}>{order.paymentStatus || "Pending"}</span></p>
                    {order.transactionId && (
                      <p className="text-[10px] text-agri-brown font-normal truncate max-w-[200px]" title={order.transactionId}>
                        Ref: {order.transactionId}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ── RIGHT: Chat ── */}
          <div className="lg:col-span-5">
            <Card className="border-agri-green/5 flex flex-col h-[560px] justify-between overflow-hidden relative">

              {/* Chat header */}
              <div className="p-4 border-b border-agri-green/5 bg-gradient-to-r from-agri-green/5 to-agri-green/2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-agri-green/40 to-agri-green/20 flex items-center justify-center font-bold text-base text-agri-green">
                    {otherName?.charAt(0) || "U"}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-agri-green-dark dark:text-agri-green-light">{otherName}</h4>
                    <p className="text-[10px] text-agri-brown font-semibold">
                      {chatLocked ? "Chat closed" : onlineStatus}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {chatLocked ? (
                    <span className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold">
                      <Lock className="w-3.5 h-3.5" /> Locked
                    </span>
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  )}

                  {/* Clear chat button — always available */}
                  {chatMessages.length > 0 && (
                    <button onClick={handleClearChat}
                      title="Clear chat"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Locked overlay */}
              {chatLocked && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 dark:bg-zinc-900/70 backdrop-blur-[2px] pointer-events-none">
                  <Lock className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm font-bold text-gray-500">
                    {isDelivered ? "Chat closed — order delivered" : "Chat closed — order cancelled"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Messages are read-only</p>
                </div>
              )}

              <ChatContainer
                messages={chatMessages || []}
                currentUserId={user?.id || "anonymous"}
                isTyping={false}
                otherPersonName={otherName}
              />

              {/* Input — hidden when locked */}
              {!chatLocked && (
                <form onSubmit={handleSendMessage} className="border-t border-agri-green/5 bg-white dark:bg-zinc-950">
                  {imagePreview && (
                    <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                      <div className="relative">
                        <img src={imagePreview} alt="Preview" className="h-16 w-16 object-cover rounded-xl border-2 border-agri-green/30" />
                        <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-bold">×</button>
                      </div>
                      <span className="text-xs text-agri-brown">{imageFile?.name}</span>
                    </div>
                  )}
                  <div className="p-3 flex items-center gap-2">
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    <button type="button" onClick={() => imageInputRef.current?.click()}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-agri-green/10 text-agri-green hover:bg-agri-green/20 transition flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </button>
                    <input type="text" value={typedMessage} onChange={(e) => setTypedMessage(e.target.value)}
                      placeholder="Type a message…"
                      className="flex-1 px-4 py-2.5 rounded-full border text-sm bg-white dark:bg-black/20 border-agri-green/10 focus:outline-none focus:ring-2 focus:ring-agri-green/30 transition placeholder-gray-400"
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }} />
                    <Button type="submit" disabled={isSending || (!typedMessage.trim() && !imageFile)}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-agri-green text-white hover:bg-agri-green-dark shadow-md transition disabled:opacity-50 flex-shrink-0">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}