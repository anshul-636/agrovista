"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  TrendingUp,
  FileText,
  ShoppingBag,
  Landmark,
  PlusCircle,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Zap,
  ArrowRight,
  Trash2,
  Star,
  MessageSquare,
} from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import { apiService } from "../../../lib/api";
import Header from "../../../components/shared/Header";
import Sidebar from "../../../components/shared/Sidebar";
import Button from "../../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import WeatherWidget from "../../../components/dashboard/WeatherWidget";
import RevenueChart from "../../../components/dashboard/RevenueChart";
import TopProducts from "../../../components/dashboard/TopProducts";
import CategoryDonut from "../../../components/dashboard/CategoryDonut";
import { toast } from "sonner";
import { useSocketStore } from "../../../store/socketStore";

const NearbyFarmsMap = dynamic(() => import("../../../components/map/NearbyFarmsMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] w-full bg-gray-100 dark:bg-zinc-900 rounded-3xl animate-pulse flex items-center justify-center text-xs text-agri-brown font-bold">
      Loading Farm Map...
    </div>
  ),
});

export default function FarmerDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const { initSocket, joinRoom, socket } = useSocketStore();
  const locationLabel = user?.location?.trim() || "Your location";

  // Route security
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    } else if (user && user.role !== "FARMER") {
      router.push("/dashboard/buyer");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== "FARMER") return;

    initSocket();
    const farmerId = user.id || user._id;
    if (farmerId) {
      joinRoom("user", farmerId);
    }
  }, [isAuthenticated, user, initSocket, joinRoom]);

  useEffect(() => {
    if (!socket || typeof socket.on !== "function") return;

    const handleOrdersChanged = () => {
      queryClient.invalidateQueries(["farmerOrders"]);
      queryClient.invalidateQueries(["farmerAnalytics"]);
    };

    socket.on("order:new", handleOrdersChanged);
    socket.on("order:updated", handleOrdersChanged);

    return () => {
      socket.off("order:new", handleOrdersChanged);
      socket.off("order:updated", handleOrdersChanged);
    };
  }, [socket, queryClient]);

  // Fetch farmer analytics
  const { data: analyticsRes, isLoading: analyticsLoading } = useQuery({
    queryKey: ["farmerAnalytics"],
    queryFn: () => apiService.getFarmerAnalytics(),
    enabled: !!user && user.role === "FARMER"
  });

  // Fetch incoming orders
  const { data: ordersRes, isLoading: ordersLoading } = useQuery({
    queryKey: ["farmerOrders"],
    queryFn: () => apiService.getOrders("FARMER"),
    enabled: !!user && user.role === "FARMER"
  });

  // Fetch auctions
  const { data: auctionsRes, isLoading: auctionsLoading } = useQuery({
    queryKey: ["farmerAuctions"],
    queryFn: () => apiService.getAuctions(),
    enabled: !!user && user.role === "FARMER"
  });

  // Fetch farmer products (My Listings)
  const { data: farmerProductsRes, isLoading: farmerProductsLoading } = useQuery({
    queryKey: ["farmerProducts"],
    queryFn: () => apiService.getProducts({ farmer: 'mine' }),
    enabled: !!user && user.role === "FARMER"
  });

  // Fetch reviews this farmer has received from buyers
  const { data: reviewsRes } = useQuery({
    queryKey: ["farmerReviews", user?.id],
    queryFn: () => apiService.getFarmerReviews(user?.id || user?._id),
    enabled: !!user && user.role === "FARMER",
  });

  // Order status mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }) => apiService.updateOrderStatus(orderId, status),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`Order status updated to ${res.data.status}!`);
        queryClient.invalidateQueries(["farmerOrders"]);
        queryClient.invalidateQueries(["farmerAnalytics"]);
      } else {
        toast.error("Failed to update status.");
      }
    }
  });

  // Delete product mutation (used in My Listings)
  const queryClientLocal = queryClient;
  const deleteProductMutation = useMutation({
    mutationFn: (productId) => apiService.deleteProduct(productId),
    onSuccess: (res, vars) => {
      toast.success('Product removed from marketplace')
      queryClientLocal.invalidateQueries(['farmerProducts'])
      queryClientLocal.invalidateQueries(['products'])
      queryClientLocal.invalidateQueries(['farmerAnalytics'])
      // emit socket event
      if (socket && typeof socket.emit === 'function') {
        socket.emit('product:deleted', { productId: vars })
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete product')
    }
  })

  const deleteAuctionMutation = useMutation({
    mutationFn: (auctionId) => apiService.deleteAuction(auctionId),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Auction deleted successfully')
        queryClientLocal.invalidateQueries(['farmerAuctions'])
        queryClientLocal.invalidateQueries(['auctions'])
        queryClientLocal.invalidateQueries(['farmerAnalytics'])
      } else {
        toast.error(res.error || 'Failed to delete auction')
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete auction')
    }
  })

  const handleOrderAction = (orderId, action) => {
    const status = action === "ACCEPT" ? "ACCEPTED" : "CANCELLED";
    updateStatusMutation.mutate({ orderId, status });
  };

  if (!isAuthenticated || !user || user.role !== "FARMER") {
    return null;
  }

  const analytics = analyticsRes?.data || {
    revenueTrend: [],
    topProducts: [],
    categoryData: [],
    summary: { thisMonthRevenue: 0, completionRate: 100, avgOrderValue: 0, activeProducts: 0, liveAuctions: 0 }
  };
  const orders = ordersRes?.data || [];
  const auctions = auctionsRes?.data?.filter(a => a.farmerId === user.id) || [];
  const farmerProducts = Array.isArray(farmerProductsRes?.data) ? farmerProductsRes.data : [];

  // Build a real month-over-month label from the analytics data the server computed.
  // Possible shapes: "+18% vs last month", "-5% vs last month", "same as last month", "first month of data"
  const growth = analytics?.summary?.revenueGrowth ?? null
  const revenueGrowthLabel = (() => {
    if (growth === null) return "vs last month"
    if (growth === 0) return "same as last month"
    if (growth === 100 && (analytics?.summary?.prevMonthRevenue ?? 0) === 0) return "first month of data"
    return `${growth > 0 ? "+" : ""}${growth}% vs last month`
  })()

  // Reviews + per-review order cross-reference
  const reviewsList = Array.isArray(reviewsRes?.data?.reviews)
    ? reviewsRes.data.reviews
    : Array.isArray(reviewsRes?.data)
    ? reviewsRes.data
    : [];
  const reviewSummary = reviewsRes?.data?.avgRating
    ? { avgRating: reviewsRes.data.avgRating, total: reviewsRes.data.total }
    : { avgRating: 0, total: reviewsList.length };

  // Match each review's giver (buyer) to the delivered order they came from
  const reviewsWithOrders = reviewsList.map((review) => {
    const giverId = review.giver?._id || review.giver?.id || review.giver;
    const matchedOrder = orders.find(
      (o) => o.status === "DELIVERED" &&
        (o.buyer === giverId || o.buyerId === giverId || o.buyer?._id === giverId)
    );
    return { ...review, matchedOrder };
  });

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col text-current transition-colors">
      <Header />

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />

        {/* Dashboard Main Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
          {/* Dashboard Header greeting */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
                Farmer Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-agri-brown mt-1">
                Welcome back, <span className="font-extrabold">{user.name}</span>. Sowing data, reaping value.
              </p>
            </div>
            {/* Quick Actions Panel */}
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={() => router.push("/products/create")}
                className="flex items-center gap-1.5 py-2.5 rounded-xl text-xs"
              >
                <PlusCircle className="w-4.5 h-4.5" />
                <span>List New Crop</span>
              </Button>
              <Button
                variant="accent"
                onClick={() => router.push("/auctions/create")}
                className="flex items-center gap-1.5 py-2.5 rounded-xl text-xs"
              >
                <Landmark className="w-4.5 h-4.5" />
                <span>Create Auction</span>
              </Button>
            </div>
          </div>

          {/* 1. STATS ROW: KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                title: "Monthly Earnings",
                value: `₹${(analytics?.summary?.thisMonthRevenue || 0).toLocaleString()}`,
                desc: revenueGrowthLabel,
                icon: TrendingUp,
                color: "text-agri-green bg-agri-green/10"
              },
              {
                title: "Total Orders",
                value: orders.length,
                desc: `${orders.filter(o => o.status === "DELIVERED").length} completed`,
                icon: FileText,
                color: "text-blue-600 bg-blue-50 dark:bg-blue-900/10"
              },
              {
                title: "Active Products",
                value: analytics?.summary?.activeProducts ?? analytics?.totalProducts ?? 0,
                desc: "Listed on marketplace",
                icon: ShoppingBag,
                color: "text-agri-brown bg-agri-brown/10"
              },
              {
                title: "Live Auctions",
                value: auctions.length,
                desc: "Bidding currently active",
                icon: Landmark,
                color: "text-agri-wheat-dark bg-agri-wheat/10"
              }
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <Card key={idx} hoverEffect className="border-agri-green/5 p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-agri-brown">{stat.title}</span>
                    <div className={`p-2 rounded-xl ${stat.color}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-agri-green-dark dark:text-white leading-none">
                      {stat.value}
                    </h3>
                    <p className="text-[10px] text-agri-brown mt-1.5 font-semibold">{stat.desc}</p>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* 2. CHARTS & ANALYTICS BLOCK */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Trend Chart */}
            <Card className="lg:col-span-2 border-agri-green/5">
              <CardHeader className="border-none pb-0">
                <CardTitle className="text-base font-bold text-agri-green">Revenue Overview</CardTitle>
                <CardDescription>7-Day Daily Sales Performance</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueChart data={analytics?.revenueTrend || analytics?.revenueByDay || []} />
              </CardContent>
            </Card>

            {/* Weather Crop Advisory Card */}
            <div className="lg:col-span-1">
              <WeatherWidget />
            </div>
          </div>

          <Card className="border-agri-green/5 overflow-hidden">
            <CardHeader className="border-none pb-0">
              <CardTitle className="text-base font-bold text-agri-green">Your Farm Location</CardTitle>
              <CardDescription>Centered on {locationLabel}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[360px] w-full rounded-3xl overflow-hidden border border-agri-green/5">
                <NearbyFarmsMap location={user?.location || ""} fallbackLabel={locationLabel} centerCoords={user?.latitude && user?.longitude ? [user.latitude, user.longitude] : null} />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Products Bar Chart */}
            <Card className="border-agri-green/5 lg:col-span-1">
              <CardHeader className="border-none pb-0">
                <CardTitle className="text-base font-bold text-agri-green">Top Crops</CardTitle>
                <CardDescription>Revenue by crop listing</CardDescription>
              </CardHeader>
              <CardContent>
                <TopProducts data={analytics?.topProducts || []} />
              </CardContent>
            </Card>

            {/* Category Revenue Donut Chart */}
            <Card className="border-agri-green/5 lg:col-span-1">
              <CardHeader className="border-none pb-0">
                <CardTitle className="text-base font-bold text-agri-green">Revenue Breakdown</CardTitle>
                <CardDescription>Crop Category Allocation</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryDonut data={analytics?.categoryData || []} />
              </CardContent>
            </Card>

            {/* Farmer Trust Score Aggregation Card */}
            <Card className="border-agri-green/5 lg:col-span-1 bg-gradient-to-br from-white/70 to-agri-wheat/5 dark:from-[#121F16]/50 dark:to-agri-wheat/5 flex flex-col justify-between">
              <CardHeader className="border-none">
                <CardTitle className="text-sm font-bold text-agri-green-dark dark:text-agri-green-light">Verified Trust Metrics</CardTitle>
                <CardDescription>Platform security aggregates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-black text-agri-green">94<span className="text-xs text-agri-brown font-bold">/100</span></p>
                    <p className="text-[10px] text-agri-brown font-bold uppercase mt-1">Farmer Trust Score</p>
                  </div>
                  <ShieldCheck className="w-12 h-12 text-agri-green animate-pulse-slow" />
                </div>
                <div className="space-y-2.5 text-xs text-agri-brown dark:text-gray-300">
                  <div className="flex justify-between font-semibold">
                    <span>Order Completion Rate</span>
                    <span className="text-agri-green-dark dark:text-agri-green-light font-extrabold">{analytics?.summary?.completionRate || 0}%</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Average Customer Rating</span>
                    <span className="text-agri-green-dark dark:text-agri-green-light font-extrabold">4.8 / 5.0</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Average Dispatch Response</span>
                    <span className="text-agri-green-dark dark:text-agri-green-light font-extrabold">&lt; 4 hours</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          
            {/* My Listings compact */}
            <Card className="lg:col-span-2 border-agri-green/5">
              <CardHeader className="flex items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-base font-bold text-agri-green">My Listings</CardTitle>
                  <CardDescription>Manage your active product listings</CardDescription>
                </div>
                <Button variant="outline" onClick={() => router.push('/products?farmer=mine')} className="py-1 px-3 text-[10px] rounded-lg font-bold">Manage All</Button>
              </CardHeader>
              <CardContent>
                {farmerProducts.length === 0 ? (
                  <p className="text-xs text-center p-8 text-agri-brown font-semibold">No active listings.</p>
                ) : (
                  <div className="space-y-3">
                    {farmerProducts.slice(0,4).map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-agri-green/5 rounded-2xl border border-agri-green/5">
                        <div>
                          <div className="font-extrabold text-agri-green-dark truncate max-w-[240px]">{p.name}</div>
                          <div className="text-[10px] text-agri-brown">₹{p.price} / {p.unit} • {p.quantity} {p.unit}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" onClick={() => router.push(`/products/${p.id}`)} className="text-[10px]">View</Button>
                          <button
                            onClick={() => {
                              const ok = window.confirm('Remove this product from marketplace?')
                              if (!ok) return
                              deleteProductMutation.mutate(p.id)
                            }}
                            className="py-1 px-3 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                          >Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 3. RECENT ORDERS & LIVE AUCTIONS LIST */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Incoming Orders table */}
            <Card className="lg:col-span-2 border-agri-green/5">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-base font-bold text-agri-green">Incoming Orders</CardTitle>
                  <CardDescription>Accept bulk buyer requests</CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push("/orders")}
                  className="py-1 px-3 text-[10px] rounded-lg font-bold"
                >
                  Manage All
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-agri-green/5 text-agri-green-dark font-extrabold border-b border-agri-green/5">
                        <th className="p-4">Order ID</th>
                        <th className="p-4">Crop</th>
                        <th className="p-4">Buyer</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-agri-brown font-semibold">
                            No incoming orders found.
                          </td>
                        </tr>
                      ) : (
                        orders.slice(0, 4).map((order) => (
                          <tr key={order.id} className="border-b border-agri-green/5 hover:bg-agri-green/5 transition">
                            <td className="p-4 font-extrabold text-agri-green-dark dark:text-agri-green-light">
                              #{order.id}
                            </td>
                            <td className="p-4 font-bold">{order.productName} ({order.quantity}kg)</td>
                            <td className="p-4 font-medium">{order.buyerName}</td>
                            <td className="p-4 font-black">₹{order.totalAmount.toLocaleString()}</td>
                            <td className="p-4">
                              <Badge
                                variant={
                                  order.status === "DELIVERED"
                                    ? "green"
                                    : order.status === "DISPATCHED"
                                    ? "yellow"
                                    : order.status === "PENDING"
                                    ? "outline"
                                    : "brown"
                                }
                              >
                                {order.status}
                              </Badge>
                            </td>
                            <td className="p-4 flex items-center justify-center gap-2">
                              {order.status === "PENDING" ? (
                                <>
                                  <button
                                    onClick={() => handleOrderAction(order.id, "ACCEPT")}
                                    className="p-1 rounded-full text-agri-green hover:bg-agri-green/10 transition"
                                    title="Accept Order"
                                  >
                                    <CheckCircle className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleOrderAction(order.id, "REJECT")}
                                    className="p-1 rounded-full text-red-500 hover:bg-red-50 transition"
                                    title="Reject Order"
                                  >
                                    <XCircle className="w-5 h-5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => router.push(`/orders/${order.id}`)}
                                  className="text-[10px] font-extrabold text-agri-green hover:underline flex items-center gap-0.5"
                                >
                                  Track <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* My Auctions monitor */}
            <Card className="border-agri-green/5 lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-base font-bold text-agri-green">Live Bidding Lots</CardTitle>
                  <CardDescription>Current high bids</CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push("/auctions")}
                  className="py-1 px-3 text-[10px] rounded-lg font-bold"
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {auctions.length === 0 ? (
                  <p className="text-xs text-center p-8 text-agri-brown font-semibold">
                    No active auctions hosted.
                  </p>
                ) : (
                  auctions.map((auc) => (
                    <div
                      key={auc.id}
                      className="p-3 bg-agri-green/5 dark:bg-white/5 rounded-2xl border border-agri-green/5 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-extrabold text-agri-green-dark dark:text-agri-green-light truncate max-w-[150px]">
                          {auc.productName}
                        </p>
                        <p className="text-[10px] text-agri-brown font-bold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Ends soon</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-agri-brown uppercase font-bold">High Bid</p>
                        <p className="text-sm font-black text-agri-green">₹{auc.currentBid}/kg</p>
                      </div>
                      <button
                        onClick={() => {
                          const ok = window.confirm('Delete this auction? This will remove the room and bid history.')
                          if (!ok) return
                          deleteAuctionMutation.mutate(auc.id)
                        }}
                        className="ml-3 p-2 rounded-full text-red-600 hover:bg-red-50 transition"
                        title="Delete Auction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
          {/* ── BUYER REVIEWS SECTION ────────────────────────────────────────── */}
          <Card className="border-agri-green/5">
            <CardHeader className="flex flex-row items-start justify-between pb-4">
              <div>
                <CardTitle className="text-base font-bold text-agri-green flex items-center gap-2">
                  <Star className="w-4 h-4 fill-agri-wheat text-agri-wheat" />
                  Buyer Reviews
                </CardTitle>
                <CardDescription>
                  What buyers said after receiving their orders
                </CardDescription>
              </div>
              {/* Summary pill */}
              {reviewsWithOrders.length > 0 && (
                <div className="flex items-center gap-2 bg-agri-green/5 border border-agri-green/10 rounded-2xl px-3 py-2 flex-shrink-0">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(reviewSummary.avgRating) ? "fill-agri-wheat text-agri-wheat" : "text-agri-brown/20"}`} />
                    ))}
                  </div>
                  <span className="text-xs font-black text-agri-green-dark dark:text-agri-green-light">
                    {reviewSummary.avgRating > 0 ? reviewSummary.avgRating.toFixed(1) : "—"}
                  </span>
                  <span className="text-[10px] text-agri-brown font-semibold">
                    ({reviewSummary.total} review{reviewSummary.total !== 1 ? "s" : ""})
                  </span>
                </div>
              )}
            </CardHeader>

            <CardContent>
              {reviewsWithOrders.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-agri-wheat/10 flex items-center justify-center mx-auto">
                    <MessageSquare className="w-6 h-6 text-agri-wheat/50" />
                  </div>
                  <p className="text-xs font-bold text-agri-brown">No reviews yet</p>
                  <p className="text-[10px] text-agri-brown/60">
                    Reviews appear here after buyers confirm delivery of their orders.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewsWithOrders.slice(0, 5).map((review, i) => {
                    const buyerName = review.giver?.name || "Buyer";
                    const buyerInitial = buyerName.charAt(0).toUpperCase();
                    const date = review.createdAt
                      ? new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : null;

                    return (
                      <div key={review._id || review.id || i}
                        className="flex gap-4 p-4 bg-white/50 dark:bg-white/5 rounded-2xl border border-agri-green/5 hover:border-agri-green/15 transition-all">

                        {/* Buyer avatar */}
                        <div className="w-10 h-10 rounded-2xl bg-agri-green/10 text-agri-green font-black text-sm flex items-center justify-center flex-shrink-0">
                          {review.giver?.avatar ? (
                            <img src={review.giver.avatar} alt={buyerName}
                              className="w-full h-full rounded-2xl object-cover" />
                          ) : buyerInitial}
                        </div>

                        {/* Review content */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <p className="text-xs font-extrabold text-agri-green-dark dark:text-agri-green-light">
                                {buyerName}
                              </p>
                              {/* Stars */}
                              <div className="flex items-center gap-0.5 mt-0.5">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} className={`w-3 h-3 ${s <= review.rating ? "fill-agri-wheat text-agri-wheat" : "text-agri-brown/20"}`} />
                                ))}
                                <span className="text-[10px] font-bold text-agri-brown ml-1">
                                  {review.rating}/5
                                </span>
                              </div>
                            </div>

                            {/* Order link + date */}
                            <div className="text-right flex-shrink-0">
                              {review.matchedOrder && (
                                <button
                                  onClick={() => router.push(`/orders/${review.matchedOrder.id}`)}
                                  className="text-[10px] font-bold text-agri-green hover:underline flex items-center gap-1 justify-end"
                                >
                                  Order #{(review.matchedOrder.id || "").slice(-6).toUpperCase()}
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </button>
                              )}
                              {date && (
                                <p className="text-[9px] text-agri-brown/50 mt-0.5">{date}</p>
                              )}
                            </div>
                          </div>

                          {/* Product from matched order */}
                          {review.matchedOrder?.productName && (
                            <div className="flex items-center gap-1.5 text-[10px] text-agri-brown font-semibold">
                              <ShoppingBag className="w-3 h-3 text-agri-green flex-shrink-0" />
                              <span className="truncate">{review.matchedOrder.productName} · {review.matchedOrder.quantity} kg</span>
                            </div>
                          )}

                          {/* Comment */}
                          {review.comment ? (
                            <p className="text-xs text-agri-brown dark:text-gray-300 leading-relaxed bg-agri-green/5 px-3 py-2 rounded-xl border-l-2 border-agri-green/20">
                              "{review.comment}"
                            </p>
                          ) : (
                            <p className="text-[10px] text-agri-brown/40 italic">No written comment left.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {reviewsWithOrders.length > 5 && (
                    <p className="text-center text-xs text-agri-brown/60 font-semibold pt-1">
                      Showing 5 of {reviewsWithOrders.length} reviews
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        </main>
      </div>
    </div>
  );
}