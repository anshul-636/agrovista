"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, ArrowRight, ShieldCheck, Star, MessageSquare, Lock, CheckCircle
} from "lucide-react";
import Header from "../../components/shared/Header";
import Sidebar from "../../components/shared/Sidebar";
import { Card, CardContent } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { apiService } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { getSocket } from "../../lib/socket";
import { toast } from "sonner";

// ── Inline star-rating widget ─────────────────────────────────────────────────
function StarRating({ value, onChange, size = 6 }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-${size} h-${size} transition-colors ${
              n <= (hovered || value)
                ? "text-amber-400 fill-amber-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ── Review modal ──────────────────────────────────────────────────────────────
function ReviewModal({ order, onClose, onSubmitted }) {
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { toast.error("Please select a star rating."); return; }
    setLoading(true);
    try {
      const farmerId = order.farmerId || order.farmer?._id || order.farmer;
      await apiService.submitReview(farmerId, { rating, comment });
      toast.success("Review submitted! Thank you.");
      onSubmitted(order.id);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit review.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black text-agri-green-dark dark:text-agri-green-light">
              Rate Your Experience
            </h3>
            <p className="text-xs text-agri-brown mt-0.5">
              Order #{order.id} · {order.productName} · Grower: {order.farmerName}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-agri-green uppercase">Star Rating</label>
            <StarRating value={rating} onChange={setRating} size={8} />
            {rating > 0 && (
              <p className="text-[10px] text-agri-brown font-semibold">
                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-agri-green uppercase">Comment (optional)</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this farmer…"
              className="w-full px-4 py-3 rounded-2xl border text-sm bg-white/60 dark:bg-black/30 border-agri-green/10 focus:outline-none focus:ring-2 focus:ring-agri-green/20 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}
              className="flex-1 py-3 rounded-2xl font-bold text-sm">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading || rating === 0}
              className="flex-1 py-3 rounded-2xl font-bold text-sm">
              {loading ? "Submitting…" : "Submit Review"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  // Track which orders have already been reviewed this session
  const [reviewedIds, setReviewedIds] = useState([]);
  // Which order the review modal is open for
  const [reviewingOrder, setReviewingOrder] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  // Socket: live order updates
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => {
      queryClient.invalidateQueries(["orders", user?.role]);
      queryClient.invalidateQueries(["buyerOrders"]);
      queryClient.invalidateQueries(["farmerOrders"]);
    };
    socket.on("order:updated", refresh);
    socket.on("order:new", refresh);
    return () => {
      socket.off("order:updated", refresh);
      socket.off("order:new", refresh);
    };
  }, [user, queryClient]);

  const { data: ordersRes, isLoading } = useQuery({
    queryKey: ["orders", user?.role],
    queryFn: () => apiService.getOrders(user?.role),
    enabled: !!user,
  });

  const orders = ordersRes?.data || [];

  const confirmPurchaseMutation = useMutation({
    mutationFn: (orderId) => apiService.verifyOrderDelivery(orderId),
    onSuccess: (res) => {
      if (res.success && res.data) {
        queryClient.invalidateQueries(["orders", user?.role]);
        queryClient.invalidateQueries(["buyerOrders"]);
        toast.success("Delivery confirmed! Funds released to the farmer.");
      } else {
        toast.error(res.error || "Unable to confirm delivery");
      }
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Unable to confirm delivery"),
  });

  if (!isAuthenticated || !user) return null;

  const statusVariant = (s) =>
    s === "DELIVERED"  ? "green"  :
    s === "DISPATCHED" ? "yellow" :
    s === "CANCELLED"  ? "red"    : "outline";

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col text-current transition-colors">
      <Header />

      {/* Review modal */}
      {reviewingOrder && (
        <ReviewModal
          order={reviewingOrder}
          onClose={() => setReviewingOrder(null)}
          onSubmitted={(id) => setReviewedIds((prev) => [...prev, id])}
        />
      )}

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
          <div>
            <h1 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
              {user.role === "FARMER" ? "Incoming Orders" : "My Purchase Orders"}
            </h1>
            <p className="text-xs sm:text-sm text-agri-brown mt-1">
              {user.role === "FARMER"
                ? "Approve, pack, and coordinate transit for wholesale orders."
                : "Track shipments, inspect timelines, and chat directly with verified farmers."}
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 w-full bg-gray-200 dark:bg-zinc-800 rounded-3xl" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 bg-white/45 dark:bg-black/10 rounded-3xl border border-agri-green/5">
              <FileText className="w-12 h-12 text-agri-brown mx-auto mb-4" />
              <h3 className="text-lg font-bold text-agri-green-dark">No Trades Logged</h3>
              <p className="text-xs text-agri-brown mt-1.5">No orders recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const isDelivered  = order.status === "DELIVERED";
                const isCancelled  = order.status === "CANCELLED";
                const isBuyer      = user.role === "BUYER";
                const alreadyReviewed = reviewedIds.includes(order.id);
                const closedForInteraction = isDelivered || isCancelled;

                return (
                  <Card key={order.id}
                    className={`border-agri-green/5 transition duration-300 ${
                      closedForInteraction
                        ? "opacity-90 hover:opacity-100"
                        : "hover:border-agri-green/20"
                    }`}>
                    <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">

                      {/* Left: image + details */}
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <img src={order.image} alt=""
                          className="w-16 h-16 object-cover rounded-2xl border border-agri-green/5 shrink-0" />
                        <div className="space-y-0.5 truncate">
                          <span className="text-[9px] font-black bg-agri-green/10 text-agri-green px-2 py-0.5 rounded-full uppercase">
                            Order #{order.id.slice(-8).toUpperCase()}
                          </span>
                          <h4 className="text-sm font-extrabold text-agri-green-dark dark:text-agri-green-light truncate">
                            {order.productName}
                          </h4>
                          <p className="text-[10px] text-agri-brown font-semibold">
                            {user.role === "FARMER" ? `Buyer: ${order.buyerName}` : `Grower: ${order.farmerName}`}
                          </p>
                          <p className="text-[10px] text-agri-brown">
                            Placed {new Date(order.createdAt).toLocaleDateString("en-IN")}
                          </p>
                        </div>
                      </div>

                      {/* Right: amount + actions */}
                      <div className="flex flex-row sm:flex-col justify-between sm:items-end w-full sm:w-auto gap-3 border-t sm:border-t-0 border-agri-green/5 pt-3 sm:pt-0">
                        <div>
                          <p className="text-[9px] text-agri-brown font-bold uppercase sm:text-right">Settled Amount</p>
                          <p className="text-base font-black text-agri-green">
                            ₹{order.totalAmount.toLocaleString("en-IN")}
                            <span className="text-[10px] text-agri-brown font-semibold ml-1">({order.quantity}kg)</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <Badge variant={statusVariant(order.status)}>{order.status}</Badge>

                          {/* ── DELIVERED: show review + locked state ── */}
                          {isDelivered && isBuyer ? (
                            <>
                              {alreadyReviewed ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-agri-green bg-agri-green/10 px-2 py-1 rounded-xl">
                                  <CheckCircle className="w-3.5 h-3.5" /> Reviewed
                                </span>
                              ) : (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => setReviewingOrder(order)}
                                  className="flex items-center gap-1 text-[10px] font-bold py-1.5 px-3 rounded-xl"
                                >
                                  <Star className="w-3.5 h-3.5" /> Leave Review
                                </Button>
                              )}
                              <span className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold">
                                <Lock className="w-3 h-3" /> Chat & Track closed
                              </span>
                            </>
                          ) : isCancelled ? (
                            <span className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold">
                              <Lock className="w-3 h-3" /> Order cancelled
                            </span>
                          ) : (
                            <>
                              {/* Active order — show Track */}
                              <Link href={`/orders/${order.id}`}>
                                <Button variant="ghost" size="sm"
                                  className="font-extrabold flex items-center gap-0.5 text-xs text-agri-green hover:underline">
                                  Track <ArrowRight className="w-4 h-4" />
                                </Button>
                              </Link>

                              {/* Confirm delivery button for buyer */}
                              {isBuyer && order.status === "DISPATCHED" && (
                                <Button
                                  size="sm"
                                  onClick={() => confirmPurchaseMutation.mutate(order.id)}
                                  disabled={confirmPurchaseMutation.isPending}
                                  className="font-extrabold flex items-center gap-1 text-[10px] bg-agri-green text-white hover:bg-agri-green-hover rounded-xl py-1.5 px-3"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  {confirmPurchaseMutation.isPending ? "Confirming…" : "Confirm Delivery"}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
