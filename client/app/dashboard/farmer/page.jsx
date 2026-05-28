"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  ArrowRight
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

export default function FarmerDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  // Route security
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    } else if (user && user.role !== "FARMER") {
      router.push("/dashboard/buyer");
    }
  }, [isAuthenticated, user, router]);

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
                desc: "+14% from last month",
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
                value: analytics?.summary?.activeProducts || 0,
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
                <RevenueChart data={analytics?.revenueTrend || []} />
              </CardContent>
            </Card>

            {/* Weather Crop Advisory Card */}
            <div className="lg:col-span-1">
              <WeatherWidget />
            </div>
          </div>

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
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
