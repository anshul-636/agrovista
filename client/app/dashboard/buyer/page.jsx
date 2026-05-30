"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import dynamic from "next/dynamic";
import Image from 'next/image'
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Landmark,
  Heart,
  MessageSquare,
  Clock,
  MapPin,
  CheckCircle,
  Map,
  Truck,
  TrendingUp,
  Star,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import { useNotificationStore } from "../../../store/notificationStore";
import { apiService } from "../../../lib/api";
import Header from "../../../components/shared/Header";
import Sidebar from "../../../components/shared/Sidebar";
import Button from "../../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import { toast } from "sonner";

// Dynamic import of Leaflet Map to avoid SSR hydration crash
const NearbyFarmsMap = dynamic(
  () => import("../../../components/map/NearbyFarmsMap"),
  { ssr: false, loading: () => <div className="h-64 w-full bg-gray-100 dark:bg-zinc-900 rounded-3xl animate-pulse flex items-center justify-center text-xs text-agri-brown font-bold">Loading Satellite Map...</div> }
);

function BuyerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const { notifications } = useNotificationStore();
  const [activeTab, setActiveTab] = useState("overview");
  const locationLabel = user?.location?.trim() || "Your location";

  // Sync tab from query param
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  // Route security
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    } else if (user && user.role !== "BUYER") {
      router.push("/dashboard/farmer");
    }
  }, [isAuthenticated, user, router]);

  // Fetch products
  const { data: productsRes, isLoading: productsLoading } = useQuery({
    queryKey: ["buyerProducts"],
    queryFn: () => apiService.getProducts()
  });

  // Fetch buyer orders
  const { data: ordersRes, isLoading: ordersLoading } = useQuery({
    queryKey: ["buyerOrders"],
    queryFn: () => apiService.getOrders("BUYER"),
    enabled: !!user && user.role === "BUYER"
  });

  // Fetch auctions
  const { data: auctionsRes } = useQuery({
    queryKey: ["buyerAuctions"],
    queryFn: () => apiService.getAuctions(),
    enabled: !!user && user.role === "BUYER"
  });


  const products = Array.isArray(productsRes?.data) ? productsRes.data : [];
  const orders = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
  const auctions = Array.isArray(auctionsRes?.data) ? auctionsRes.data : [];

  const confirmPurchaseMutation = useMutation({
    mutationFn: (orderId) => apiService.verifyOrderDelivery(orderId),
    onSuccess: (res) => {
      if (res.success && res.data) {
        queryClient.invalidateQueries(["buyerOrders"]);
        queryClient.invalidateQueries(["orders", "BUYER"]);
        queryClient.invalidateQueries(["order", res.data.id]);
        toast.success("Purchase confirmed. Funds released to the farmer.");
      } else {
        toast.error(res.error || "Unable to confirm purchase");
      }
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message || "Unable to confirm purchase");
    }
  });

  if (!isAuthenticated || !user || user.role !== "BUYER") {
    return null;
  }

  // Watchlist simulation
  const watchlist = products.filter(p => p.isOrganic).slice(0, 3);
  
  // Recommendations
  const recommendations = products.slice(1, 4);

  // Active tracking order (first in transit or pending)
  const trackingOrder = orders.find(o => o.status !== "DELIVERED") || orders[0];

  const getTimelineSteps = (status) => {
    const stages = ["PENDING", "ACCEPTED", "PACKED", "DISPATCHED", "DELIVERED"];
    const currentIndex = stages.indexOf(status);
    return stages.map((stage, i) => ({
      name: stage,
      title: stage === "PENDING" ? "Order Placed" : stage === "ACCEPTED" ? "Approved" : stage === "PACKED" ? "Packed" : stage === "DISPATCHED" ? "In Transit" : "Delivered",
      completed: i <= currentIndex,
      active: i === currentIndex
    }));
  };

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col text-current transition-colors">
      <Header />

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
                Buyer Portal
              </h1>
              <p className="text-xs sm:text-sm text-agri-brown mt-1">
                Welcome back, <span className="font-extrabold">{user.name}</span>. Explore direct wholesale listings.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={() => router.push("/products")}
                className="flex items-center gap-1.5 py-2.5 rounded-xl text-xs"
              >
                <ShoppingBag className="w-4.5 h-4.5" />
                <span>Browse Marketplace</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push("/auctions")}
                className="flex items-center gap-1.5 py-2.5 rounded-xl text-xs border-agri-green/20"
              >
                <Landmark className="w-4.5 h-4.5" />
                <span>Join Auctions</span>
              </Button>
            </div>
          </div>

          {/* Quick tab controls */}
          <div className="flex gap-2 border-b border-agri-green/5 pb-2">
            {["overview", "watchlist", "map"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-xl transition ${
                  activeTab === tab
                    ? "bg-agri-green/10 text-agri-green"
                    : "text-agri-brown hover:bg-agri-green/5"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* 1. ORDER TRACKING SECTION */}
                {trackingOrder && (
                  <Card className="border-agri-green/5 p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-black uppercase text-agri-green">Live Shipment Tracker</span>
                        <h3 className="text-lg font-black text-agri-green-dark dark:text-agri-green-light mt-1">
                          Order #{trackingOrder.id} — {trackingOrder.productName}
                        </h3>
                      </div>
                      <Badge variant={trackingOrder.status === "DELIVERED" ? "green" : "yellow"}>
                        {trackingOrder.status}
                      </Badge>
                    </div>

                    {/* Animated Timeline */}
                    <div className="relative flex justify-between items-center w-full max-w-2xl mx-auto py-6">
                      <div className="absolute left-0 right-0 h-1 bg-agri-green/10 -z-10" />
                      {getTimelineSteps(trackingOrder.status).map((step, i) => (
                        <div key={i} className="flex flex-col items-center relative gap-2">
                          <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: step.active ? 1.2 : 1 }}
                            className={`w-6 h-6 rounded-full flex items-center justify-center border-2 text-[10px] font-extrabold ${
                              step.completed
                                ? "bg-agri-green border-agri-green text-white"
                                : "bg-white dark:bg-zinc-900 border-agri-green/20 text-agri-brown"
                            }`}
                          >
                            {step.completed ? "✓" : i + 1}
                          </motion.div>
                          <span className="text-[9px] font-bold text-agri-brown whitespace-nowrap absolute top-8">
                            {step.title}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-agri-green/5 text-xs text-agri-brown">
                      <p>Lot Quantity: <span className="font-extrabold text-agri-green-dark dark:text-agri-green-light">{trackingOrder.quantity} kg</span></p>
                      <button
                        onClick={() => router.push(`/orders/${trackingOrder.id}`)}
                        className="font-extrabold text-agri-green hover:underline flex items-center gap-0.5"
                      >
                        Open Logistics Details & Chat <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      {trackingOrder.status === "DISPATCHED" && (
                        <Button
                          variant="primary"
                          onClick={() => confirmPurchaseMutation.mutate(trackingOrder.id)}
                          disabled={confirmPurchaseMutation.isPending}
                          className="text-[10px] font-extrabold py-1.5 px-3 rounded-lg ml-auto"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {confirmPurchaseMutation.isPending ? "Confirming..." : "Confirm Purchase"}
                        </Button>
                      )}
                    </div>
                  </Card>
                )}

                {/* 2. RECENT PURCHASES & ACTIVE BIDS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Orders */}
                  <Card className="border-agri-green/5">
                    <CardHeader>
                      <CardTitle className="text-base font-bold text-agri-green">Order History</CardTitle>
                      <CardDescription>Recent bulk trades</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {orders.length === 0 ? (
                        <p className="text-xs text-center text-agri-brown py-8">No order transactions found.</p>
                      ) : (
                        orders.slice(0, 3).map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between p-3.5 bg-agri-green/5 dark:bg-white/5 rounded-2xl border border-agri-green/5"
                          >
                            <div className="space-y-1">
                              <p className="text-xs font-extrabold text-agri-green-dark dark:text-agri-green-light">
                                #{order.id} — {order.productName}
                              </p>
                              <p className="text-[10px] text-agri-brown font-bold">Qty: {order.quantity}kg • Total: ₹{order.totalAmount}</p>
                            </div>
                            <Badge variant={order.status === "DELIVERED" ? "green" : "yellow"}>
                              {order.status}
                            </Badge>
                            {order.status === "DISPATCHED" && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => confirmPurchaseMutation.mutate(order.id)}
                                disabled={confirmPurchaseMutation.isPending}
                                className="text-[10px] font-extrabold py-1.5 px-3 rounded-lg"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Confirm Purchase
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* Active Bids */}
                  <Card className="border-agri-green/5">
                    <CardHeader>
                      <CardTitle className="text-base font-bold text-agri-green">Active Bidding Lots</CardTitle>
                      <CardDescription>Auctions you bid on</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {auctions.slice(0, 3).map((auc) => (
                        <div
                          key={auc.id}
                          className="flex items-center justify-between p-3.5 bg-agri-green/5 dark:bg-white/5 rounded-2xl border border-agri-green/5"
                        >
                          <div className="space-y-1">
                            <p className="text-xs font-extrabold text-agri-green-dark dark:text-agri-green-light">
                              {auc.productName}
                            </p>
                            <p className="text-[10px] text-agri-brown font-bold">Current Lot Price: ₹{auc.currentBid}/kg</p>
                          </div>
                          <Link href={`/auctions/${auc.id}`}>
                            <Button variant="outline" className="py-1 px-3 text-[10px] rounded-lg font-bold">
                              Join Room
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* 3. RECOMMENDATIONS & TRENDING PRODUCTS */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-agri-green-dark dark:text-agri-green-light">
                    Recommended For You
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {recommendations.map((prod) => (
                      <Card key={prod.id} hoverEffect className="border-agri-green/5 p-4 space-y-3">
                            <Image
                              src={prod.images[0]}
                              alt={prod.name}
                              width={400}
                              height={144}
                              className="w-full h-36 object-cover rounded-2xl"
                            />
                        <div>
                          <Badge variant="green" size="sm">{prod.category}</Badge>
                          <h4 className="text-sm font-extrabold mt-2 text-agri-green-dark dark:text-agri-green-light truncate">
                            {prod.name}
                          </h4>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-agri-brown">
                            <MapPin className="w-3 h-3 text-agri-brown" />
                            <span>{prod.farmerLocation}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-agri-green/5 pt-3">
                          <div>
                            <span className="text-[9px] text-agri-brown uppercase font-bold">Price</span>
                            <p className="text-sm font-black text-agri-green">₹{prod.price}/kg</p>
                          </div>
                          <Link href={`/products/${prod.id}`}>
                            <Button variant="ghost" className="text-[10px] font-bold py-1.5 px-3 rounded-lg">
                              Buy Now
                            </Button>
                          </Link>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "watchlist" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="p-4 bg-agri-green/5 border border-agri-green/10 rounded-2xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-agri-green" />
                  <p className="text-xs text-agri-brown">
                    You will receive instant real-time sound/bell indicators whenever watched items are restocked or have new live bidding auctions launched.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {watchlist.map((prod) => (
                    <Card key={prod.id} className="border-agri-green/5 p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge variant="green" size="sm">Watching</Badge>
                          <h4 className="text-base font-extrabold mt-1 text-agri-green-dark dark:text-agri-green-light">{prod.name}</h4>
                          <p className="text-[10px] text-agri-brown">{prod.farmerName} • {prod.farmerLocation}</p>
                        </div>
                        <Heart className="w-5 h-5 text-red-500 fill-current animate-pulse" />
                      </div>

                      <div className="bg-white/50 dark:bg-black/30 p-3 rounded-xl border border-agri-green/5 flex justify-between text-xs font-semibold">
                        <span>Current Stock:</span>
                        <span className="text-red-500">{prod.quantity} {prod.unit} (Out of Stock)</span>
                      </div>

                      <Link href={`/products/${prod.id}`}>
                        <Button variant="outline" className="w-full text-xs font-bold py-2.5 rounded-xl">
                          View Details
                        </Button>
                      </Link>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "map" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-agri-green-dark dark:text-agri-green-light">
                    Verified Crop Farms Near {locationLabel}
                  </h3>
                  <p className="text-xs text-agri-brown">
                    Click on markers to see farm names, farmer profiles, crop inventories, and platform trust score badges.
                  </p>
                </div>

                <div className="h-[450px] w-full rounded-3xl overflow-hidden shadow-lg border border-agri-green/5 z-10 relative">
                  <NearbyFarmsMap location={user?.location || ""} fallbackLabel={locationLabel} centerCoords={user?.latitude && user?.longitude ? [user.latitude, user.longitude] : null} />
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
    <Suspense fallback={
      <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col text-current items-center justify-center font-bold text-xs text-agri-brown">
        Loading Buyer Workspace...
      </div>
    }>
      <BuyerDashboardContent />
    </Suspense>
  );
}
