"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import RawImage from "../../../components/ui/RawImage";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Landmark,
  Heart,
  Clock,
  MapPin,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Package,
  TrendingUp,
  Wallet,
  Eye,
  XCircle,
  CheckCircle2,
  Truck,
  BoxIcon,
  ClipboardList,
  Trophy,
} from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import { useNotificationStore } from "../../../store/notificationStore";
import { useSocketStore } from "../../../store/socketStore";
import { apiService } from "../../../lib/api";
import Header from "../../../components/shared/Header";
import Sidebar from "../../../components/shared/Sidebar";
import Button from "../../../components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import { toast } from "sonner";

const NearbyFarmsMap = dynamic(
  () => import("../../../components/map/NearbyFarmsMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full bg-gray-100 dark:bg-zinc-900 rounded-3xl animate-pulse flex items-center justify-center text-xs text-agri-brown font-bold">
        Loading Map...
      </div>
    ),
  }
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ✅ FIX: Short readable order ID instead of full MongoDB ObjectId
const shortId = (id = "") => {
  const s = String(id);
  return s.length > 8 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s;
};

const STATUS_FLOW = ["PENDING", "ACCEPTED", "PACKED", "DISPATCHED", "DELIVERED"];

const STEP_LABELS = {
  PENDING: "Order Placed",
  ACCEPTED: "Approved",
  PACKED: "Packed",
  DISPATCHED: "In Transit",
  DELIVERED: "Delivered",
};

const STEP_ICONS = {
  PENDING: ClipboardList,
  ACCEPTED: CheckCircle2,
  PACKED: BoxIcon,
  DISPATCHED: Truck,
  DELIVERED: ShieldCheck,
};

const statusBadgeVariant = (status) => {
  if (status === "DELIVERED") return "green";
  if (status === "CANCELLED") return "red";
  if (status === "DISPATCHED") return "yellow";
  return "gray";
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="p-5 border-agri-green/5 hover:border-agri-green/15 hover:shadow-md hover:shadow-agri-green/5 transition-all duration-200">
        <div className="flex items-start justify-between">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          {sub && (
            <span className="text-[10px] font-bold text-agri-green bg-agri-green/10 px-2 py-0.5 rounded-full">
              {sub}
            </span>
          )}
        </div>
        <p className="text-2xl font-black text-agri-green-dark dark:text-white mt-3">{value}</p>
        <p className="text-xs text-agri-brown dark:text-gray-400 font-semibold mt-0.5">{label}</p>
      </Card>
    </motion.div>
  );
}

// ─── Shipment Timeline ────────────────────────────────────────────────────────
function ShipmentTimeline({ status }) {
  const currentIndex = STATUS_FLOW.indexOf(status);
  return (
    <div className="relative flex justify-between items-start w-full max-w-2xl mx-auto pt-2 pb-8">
      {/* connector line */}
      <div className="absolute top-[18px] left-0 right-0 h-0.5 bg-agri-green/10 z-0" />
      <div
        className="absolute top-[18px] left-0 h-0.5 bg-agri-green z-0 transition-all duration-700"
        style={{ width: `${Math.max(0, (currentIndex / (STATUS_FLOW.length - 1)) * 100)}%` }}
      />

      {STATUS_FLOW.map((stage, i) => {
        const StepIcon = STEP_ICONS[stage];
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={stage} className="flex flex-col items-center gap-2 z-10">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: active ? 1.2 : 1 }}
              className={`w-9 h-9 rounded-2xl flex items-center justify-center border-2 transition-all
                ${done
                  ? "bg-agri-green border-agri-green text-white shadow-md shadow-agri-green/30"
                  : active
                  ? "bg-agri-green border-agri-green text-white shadow-lg shadow-agri-green/40 ring-4 ring-agri-green/20"
                  : "bg-white dark:bg-zinc-900 border-agri-green/20 text-agri-brown/40"
                }`}
            >
              <StepIcon className="w-4 h-4" />
            </motion.div>
            <span
              className={`text-[10px] font-bold whitespace-nowrap ${
                active
                  ? "text-agri-green dark:text-agri-green-light"
                  : done
                  ? "text-agri-brown dark:text-gray-400"
                  : "text-agri-brown/40"
              }`}
            >
              {STEP_LABELS[stage]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function BuyerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const { initSocket, joinRoom, socket } = useSocketStore();
  const [activeTab, setActiveTab] = useState("overview");
  const locationLabel = user?.location?.trim() || "Your location";

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
    else if (user && user.role !== "BUYER") router.push("/dashboard/farmer");
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    initSocket();
    const buyerId = user.id || user._id;
    if (buyerId) joinRoom("user", buyerId);
  }, [isAuthenticated, user, initSocket, joinRoom]);

  useEffect(() => {
    if (!socket || typeof socket.on !== "function") return;
    const refresh = () => {
      queryClient.invalidateQueries(["buyerOrders"]);
      queryClient.invalidateQueries(["orders", "BUYER"]);
      queryClient.invalidateQueries(["buyerAuctions"]);
    };
    socket.on("order:updated", refresh);
    socket.on("order:new", refresh);
    socket.on("auction:ended", refresh);
    socket.on("auction:updated", refresh);
    return () => {
      socket.off("order:updated", refresh);
      socket.off("order:new", refresh);
      socket.off("auction:ended", refresh);
      socket.off("auction:updated", refresh);
    };
  }, [socket, queryClient]);

  const { data: productsRes } = useQuery({
    queryKey: ["buyerProducts"],
    queryFn: () => apiService.getProducts(),
  });

  const { data: ordersRes, isLoading: ordersLoading } = useQuery({
    queryKey: ["buyerOrders"],
    queryFn: () => apiService.getOrders("BUYER"),
    enabled: !!user && user.role === "BUYER",
    refetchInterval: 15000, // poll every 15s so status always stays fresh
  });

  const { data: auctionsRes } = useQuery({
    queryKey: ["buyerAuctions"],
    queryFn: () => apiService.getAuctions(),
    enabled: !!user && user.role === "BUYER",
    refetchInterval: 20000, // poll every 20s for auction status changes
  });

  const products = Array.isArray(productsRes?.data) ? productsRes.data : [];
  const orders = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
  const auctions = Array.isArray(auctionsRes?.data) ? auctionsRes.data : [];

  // Auctions that have ENDED and the current user is the winner —
  // filter to ones that don't already have a corresponding order that is paid or placed.
  const wonAuctions = auctions.filter((auc) => {
    if (auc.status !== "ENDED") return false;
    const winnerId = typeof auc.winner === "object"
      ? (auc.winner?._id || auc.winner?.id)
      : auc.winner;
    const uid = user?._id || user?.id;
    if (!winnerId || !uid || String(winnerId) !== String(uid)) return false;

    // Exclude if buyer already has a completed/paid order for this auction
    const aucId = String(auc.id || auc._id);
    const alreadyOrdered = orders.some((o) => {
      const orderAucId = String(o.auctionId || "");
      if (!orderAucId || orderAucId !== aucId) return false;
      // Hide "Pay Now" once payment is done or COD order is placed
      return o.paymentStatus === "Paid" || o.paymentMethod === "COD";
    });
    return !alreadyOrdered;
  });

  const confirmPurchaseMutation = useMutation({
    mutationFn: (orderId) => apiService.verifyOrderDelivery(orderId),
    onSuccess: (res) => {
      if (res.success && res.data) {
        queryClient.invalidateQueries(["buyerOrders"]);
        queryClient.invalidateQueries(["orders", "BUYER"]);
        toast.success("Purchase confirmed. Funds released to the farmer.");
      } else {
        toast.error(res.error || "Unable to confirm purchase");
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Unable to confirm purchase");
    },
  });

  if (!isAuthenticated || !user || user.role !== "BUYER") return null;

  // ─── Derived data ──────────────────────────────────────────────────────────

  // ✅ FIX: Prioritize active orders for tracking — skip cancelled
  const activeOrders = orders.filter((o) => o.status !== "CANCELLED" && o.status !== "DELIVERED");
  const trackingOrder = activeOrders[0] || orders.filter((o) => o.status === "DELIVERED")[0] || null;

  // ✅ FIX: Real KPI numbers
  const totalSpent = orders
    .filter((o) => o.status === "DELIVERED")
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const activeOrdersCount = activeOrders.length;
  const deliveredCount = orders.filter((o) => o.status === "DELIVERED").length;
  const watchlist = products.filter((p) => p.isOrganic).slice(0, 3);
  const recommendations = products.slice(0, 3);

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col text-current transition-colors">
      <Header />

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">

          {/* ── Page header ─────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
                Buyer Portal
              </h1>
              <p className="text-xs sm:text-sm text-agri-brown mt-1">
                Welcome back,{" "}
                <span className="font-extrabold text-agri-green-dark dark:text-agri-green-light">
                  {user.name}
                </span>
                . Explore direct wholesale listings.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={() => router.push("/products")}
                className="flex items-center gap-1.5 py-2.5 rounded-xl text-xs shadow-md shadow-agri-green/20"
              >
                <ShoppingBag className="w-4 h-4" />
                Browse Marketplace
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push("/auctions")}
                className="flex items-center gap-1.5 py-2.5 rounded-xl text-xs border-agri-green/20"
              >
                <Landmark className="w-4 h-4" />
                Join Auctions
              </Button>
            </div>
          </div>

          {/* ── Tabs ────────────────────────────────────────────────────── */}
          <div className="flex gap-1 border-b border-agri-green/5 pb-2">
            {["overview", "watchlist", "map"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-xl transition ${
                  activeTab === tab
                    ? "bg-agri-green/10 text-agri-green dark:text-agri-green-light"
                    : "text-agri-brown hover:bg-agri-green/5"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ════════════════════════════════════════════════════════════
                OVERVIEW TAB
            ════════════════════════════════════════════════════════════ */}
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* ✅ FIX: KPI cards row — shows real numbers at a glance */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard
                    icon={Package}
                    label="Total Orders"
                    value={orders.length}
                    sub={activeOrdersCount > 0 ? `${activeOrdersCount} active` : undefined}
                    color="bg-agri-green/10 text-agri-green"
                  />
                  <KpiCard
                    icon={CheckCircle2}
                    label="Delivered"
                    value={deliveredCount}
                    color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  />
                  <KpiCard
                    icon={Landmark}
                    label="Live Auctions"
                    value={auctions.length}
                    sub={auctions.length > 0 ? "bidding open" : undefined}
                    color="bg-agri-wheat/15 text-agri-wheat-dark"
                  />
                  <KpiCard
                    icon={Wallet}
                    label="Total Spent"
                    value={`₹${totalSpent.toLocaleString()}`}
                    color="bg-agri-brown/10 text-agri-brown"
                  />
                </div>

                {/* ✅ FIX: Shipment tracker — only for active, non-cancelled orders */}
                {trackingOrder ? (
                  <Card className="border-agri-green/5 p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-agri-green">
                          Live Shipment Tracker
                        </span>
                        {/* ✅ FIX: Short ID, not full ObjectId */}
                        <h3 className="text-base font-black text-agri-green-dark dark:text-agri-green-light mt-0.5">
                          Order #{shortId(trackingOrder.id)} —{" "}
                          {trackingOrder.productName}
                        </h3>
                      </div>
                      <Badge variant={statusBadgeVariant(trackingOrder.status)}>
                        {trackingOrder.status}
                      </Badge>
                    </div>

                    {/* ✅ FIX: Show cancelled state properly, not a broken stepper */}
                    {trackingOrder.status === "CANCELLED" ? (
                      <div className="flex items-center gap-3 py-6 px-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                        <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-red-600 dark:text-red-400">
                            This order was cancelled
                          </p>
                          <p className="text-xs text-agri-brown mt-0.5">
                            No further action required. Browse the marketplace to place a new order.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <ShipmentTimeline status={trackingOrder.status} />
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-agri-green/5 pt-4 text-xs text-agri-brown">
                      <p>
                        Lot Quantity:{" "}
                        <span className="font-extrabold text-agri-green-dark dark:text-agri-green-light">
                          {trackingOrder.quantity} kg
                        </span>
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => router.push(`/orders/${trackingOrder.id}`)}
                          className="font-extrabold text-agri-green hover:underline flex items-center gap-0.5"
                        >
                          Logistics Details & Chat{" "}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        {trackingOrder.status === "DISPATCHED" && (
                          <Button
                            variant="primary"
                            onClick={() =>
                              confirmPurchaseMutation.mutate(trackingOrder.id)
                            }
                            disabled={confirmPurchaseMutation.isPending}
                            className="text-[10px] font-extrabold py-1.5 px-3 rounded-lg flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {confirmPurchaseMutation.isPending
                              ? "Confirming…"
                              : "Confirm Receipt"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ) : !ordersLoading && (
                  <Card className="border-dashed border-agri-green/15 p-10 text-center">
                    <Truck className="w-10 h-10 text-agri-green/25 mx-auto mb-3" />
                    <p className="text-sm font-bold text-agri-green-dark dark:text-white">
                      No active shipments
                    </p>
                    <p className="text-xs text-agri-brown mt-1">
                      Your order tracking will appear here once you place an order.
                    </p>
                    <Link href="/products">
                      <Button
                        variant="primary"
                        className="mt-4 text-xs py-2 px-5 rounded-xl"
                      >
                        Browse Products
                      </Button>
                    </Link>
                  </Card>
                )}

                {/* ── Order History + Active Bids ── */}
                {/* ── Won Auctions Pending Checkout ── */}
                {wonAuctions.length > 0 && (
                  <div className="mb-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span className="font-black text-amber-700 dark:text-amber-400 text-sm">
                        Auction Win{wonAuctions.length > 1 ? "s" : ""} Pending Payment
                      </span>
                    </div>
                    {wonAuctions.map((auc) => {
                      const params = new URLSearchParams({
                        auctionId: String(auc.id || auc._id),
                        name: auc.productName || "",
                        bid: String(auc.currentBid || 0),
                        qty: String(auc.quantity || auc.lotSize || 1),
                        unit: auc.unit || "kg",
                        img: encodeURIComponent(auc.image || "")
                      });
                      return (
                        <div
                          key={auc.id || auc._id}
                          className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700"
                        >
                          {auc.image && (
                            <img
                              src={auc.image}
                              alt={auc.productName}
                              className="w-12 h-12 rounded-xl object-cover shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-amber-800 dark:text-amber-300 truncate">{auc.productName}</p>
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                              Won at ₹{auc.currentBid?.toLocaleString()}/unit · {auc.quantity || auc.lotSize} {auc.unit}
                            </p>
                          </div>
                          <button
                            onClick={() => router.push("/auctions/checkout?" + params.toString())}
                            className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition shadow"
                          >
                            Pay Now →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Order History */}
                  <Card className="border-agri-green/5">
                    <CardHeader>
                      <CardTitle className="text-base font-bold text-agri-green">
                        Order History
                      </CardTitle>
                      <CardDescription>Your recent bulk trades</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {orders.length === 0 ? (
                        <div className="text-center py-8 space-y-2">
                          <ClipboardList className="w-8 h-8 text-agri-green/20 mx-auto" />
                          <p className="text-xs text-agri-brown font-semibold">
                            No orders yet
                          </p>
                          <Link href="/products">
                            <button className="text-xs text-agri-green font-bold hover:underline">
                              Place your first order →
                            </button>
                          </Link>
                        </div>
                      ) : (
                        orders.slice(0, 4).map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between p-3.5 bg-agri-green/5 dark:bg-white/5 rounded-2xl border border-agri-green/5 gap-3"
                          >
                            <div className="space-y-0.5 min-w-0">
                              {/* ✅ FIX: Short readable order ID */}
                              <p className="text-xs font-extrabold text-agri-green-dark dark:text-agri-green-light truncate">
                                #{shortId(order.id)} — {order.productName}
                              </p>
                              <p className="text-[10px] text-agri-brown font-bold">
                                {order.quantity} kg • ₹{Number(order.totalAmount || 0).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant={statusBadgeVariant(order.status)} size="sm">
                                {order.status}
                              </Badge>
                              {order.status === "DISPATCHED" && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() =>
                                    confirmPurchaseMutation.mutate(order.id)
                                  }
                                  disabled={confirmPurchaseMutation.isPending}
                                  className="text-[10px] py-1 px-2.5 rounded-lg flex items-center gap-1"
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  Confirm
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {orders.length > 4 && (
                        <Link href="/orders">
                          <button className="w-full text-xs text-agri-green font-bold py-2 hover:underline">
                            View all {orders.length} orders →
                          </button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>

                  {/* Active Bidding Lots */}
                  <Card className="border-agri-green/5">
                    <CardHeader>
                      <CardTitle className="text-base font-bold text-agri-green">
                        Active Bidding Lots
                      </CardTitle>
                      <CardDescription>Live auctions you can join</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {auctions.length === 0 ? (
                        <div className="text-center py-8 space-y-2">
                          <Landmark className="w-8 h-8 text-agri-green/20 mx-auto" />
                          <p className="text-xs text-agri-brown font-semibold">
                            No live auctions right now
                          </p>
                          <Link href="/auctions">
                            <button className="text-xs text-agri-green font-bold hover:underline">
                              Check auction schedule →
                            </button>
                          </Link>
                        </div>
                      ) : (
                        auctions.slice(0, 4).map((auc) => (
                          <div
                            key={auc.id}
                            className="flex items-center justify-between p-3.5 bg-agri-green/5 dark:bg-white/5 rounded-2xl border border-agri-green/5 gap-3"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-xs font-extrabold text-agri-green-dark dark:text-agri-green-light truncate">
                                {auc.productName}
                              </p>
                              <p className="text-[10px] text-agri-brown font-bold">
                                Current bid: ₹{auc.currentBid ?? auc.startingPrice ?? 0}/kg
                              </p>
                            </div>
                            <Link href={`/auctions/${auc.id}`}>
                              <Button
                                variant="outline"
                                className="py-1.5 px-3 text-[10px] rounded-lg font-bold flex-shrink-0 hover:bg-agri-green hover:text-white hover:border-agri-green transition-all"
                              >
                                Bid Now
                              </Button>
                            </Link>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* ── Recommendations ── */}
                {recommendations.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-agri-green-dark dark:text-agri-green-light">
                        Recommended For You
                      </h3>
                      <Link href="/products">
                        <button className="text-xs text-agri-green font-bold hover:underline flex items-center gap-1">
                          View all <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {recommendations.map((prod) => (
                        <Card
                          key={prod.id}
                          hoverEffect
                          className="border-agri-green/5 p-4 space-y-3"
                        >
                          <RawImage
                            src={prod.images?.[0]}
                            alt={prod.name}
                            width={400}
                            height={144}
                            className="w-full h-36 object-cover rounded-2xl"
                          />
                          <div>
                            <Badge variant="green" size="sm">
                              {prod.category}
                            </Badge>
                            <h4 className="text-sm font-extrabold mt-2 text-agri-green-dark dark:text-agri-green-light truncate">
                              {prod.name}
                            </h4>
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-agri-brown">
                              <MapPin className="w-3 h-3" />
                              <span>{prod.farmerLocation}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-agri-green/5 pt-3">
                            <div>
                              <span className="text-[9px] text-agri-brown uppercase font-bold">Price</span>
                              <p className="text-sm font-black text-agri-green">
                                ₹{prod.price}/kg
                              </p>
                            </div>
                            <Link href={`/products/${prod.id}`}>
                              <Button
                                variant="ghost"
                                className="text-[10px] font-bold py-1.5 px-3 rounded-lg hover:bg-agri-green hover:text-white transition-all"
                              >
                                Buy Now
                              </Button>
                            </Link>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════
                WATCHLIST TAB
            ════════════════════════════════════════════════════════════ */}
            {activeTab === "watchlist" && (
              <motion.div
                key="watchlist"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="p-4 bg-agri-green/5 border border-agri-green/10 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-agri-green mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-agri-brown leading-relaxed">
                    You'll receive instant notifications whenever watched items are restocked or have new live auctions launched.
                  </p>
                </div>

                {watchlist.length === 0 ? (
                  <Card className="border-dashed border-agri-green/15 p-12 text-center">
                    <Heart className="w-10 h-10 text-agri-green/20 mx-auto mb-3" />
                    <p className="text-sm font-bold text-agri-green-dark dark:text-white">
                      Your watchlist is empty
                    </p>
                    <p className="text-xs text-agri-brown mt-1">
                      Browse products and add items to track them here.
                    </p>
                    <Link href="/products">
                      <Button variant="primary" className="mt-4 text-xs py-2 px-5 rounded-xl">
                        Browse Products
                      </Button>
                    </Link>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {watchlist.map((prod) => (
                      <Card key={prod.id} className="border-agri-green/5 p-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge variant="green" size="sm">Watching</Badge>
                            <h4 className="text-base font-extrabold mt-1 text-agri-green-dark dark:text-agri-green-light">
                              {prod.name}
                            </h4>
                            <p className="text-[10px] text-agri-brown">
                              {prod.farmerName} • {prod.farmerLocation}
                            </p>
                          </div>
                          <Heart className="w-5 h-5 text-red-500 fill-current" />
                        </div>
                        <div className="bg-white/50 dark:bg-black/30 p-3 rounded-xl border border-agri-green/5 flex justify-between text-xs font-semibold">
                          <span className="text-agri-brown">Stock</span>
                          <span className={prod.quantity > 0 ? "text-agri-green" : "text-red-500"}>
                            {prod.quantity > 0 ? `${prod.quantity} ${prod.unit}` : "Out of Stock"}
                          </span>
                        </div>
                        <Link href={`/products/${prod.id}`}>
                          <Button variant="outline" className="w-full text-xs font-bold py-2.5 rounded-xl">
                            View Details
                          </Button>
                        </Link>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════
                MAP TAB
            ════════════════════════════════════════════════════════════ */}
            {activeTab === "map" && (
              <motion.div
                key="map"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-agri-green-dark dark:text-agri-green-light">
                    Verified Farms Near {locationLabel}
                  </h3>
                  <p className="text-xs text-agri-brown">
                    Click markers to see farm profiles, crop inventory, and trust scores.
                  </p>
                </div>
                <div className="h-[450px] w-full rounded-3xl overflow-hidden shadow-lg border border-agri-green/5 relative z-10">
                  <NearbyFarmsMap
                    location={user?.location || ""}
                    fallbackLabel={locationLabel}
                    centerCoords={
                      user?.latitude && user?.longitude
                        ? [user.latitude, user.longitude]
                        : null
                    }
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function BuyerDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex items-center justify-center text-xs text-agri-brown font-bold">
          Loading Buyer Workspace…
        </div>
      }
    >
      <BuyerDashboardContent />
    </Suspense>
  );
}
