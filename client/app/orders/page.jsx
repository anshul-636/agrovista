"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ArrowLeft, Clock, MapPin, Truck, HelpCircle, FileText, ArrowRight, ShieldCheck } from "lucide-react";
import Header from "../../components/shared/Header";
import Sidebar from "../../components/shared/Sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { apiService } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { getSocket } from "../../lib/socket";
import { toast } from "sonner";

export default function OrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  // Route security
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // ─── SOCKET SETUP ───────────────────────────────────────────────────────────
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
  // ────────────────────────────────────────────────────────────────────────────

  // Fetch orders based on role
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

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col text-current transition-colors">
      <Header />

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
          {/* Header */}
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

          {/* Orders catalog list */}
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
              <p className="text-xs text-agri-brown mt-1.5">No orders recorded in your history files.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="border-agri-green/5 hover:border-agri-green/20 transition duration-300">
                  <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                    {/* Left details */}
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <img
                        src={order.image}
                        alt=""
                        className="w-20 h-20 object-cover rounded-2xl border border-agri-green/5 shrink-0"
                      />
                      <div className="space-y-1 truncate">
                        <span className="text-[9px] font-black bg-agri-green/10 text-agri-green px-2 py-0.5 rounded-full uppercase">
                          Order #{order.id}
                        </span>
                        <h4 className="text-sm font-extrabold text-agri-green-dark dark:text-agri-green-light truncate">
                          {order.productName}
                        </h4>
                        <p className="text-[10px] text-agri-brown font-semibold">
                          {user.role === "FARMER" ? `Buyer: ${order.buyerName}` : `Grower: ${order.farmerName}`}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-agri-brown font-bold uppercase mt-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Placed {new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right details / actions */}
                    <div className="flex flex-row sm:flex-col justify-between sm:items-end w-full sm:w-auto gap-4 border-t sm:border-t-0 border-agri-green/5 pt-4 sm:pt-0">
                      <div className="space-y-1">
                        <p className="text-[9px] text-agri-brown font-bold uppercase sm:text-right">Settled Amount</p>
                        <p className="text-base font-black text-agri-green">
                          ₹{order.totalAmount.toLocaleString()}{" "}
                          <span className="text-[10px] text-agri-brown font-semibold">({order.quantity}kg)</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
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
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="ghost" size="sm" className="font-extrabold flex items-center gap-0.5 text-xs text-agri-green hover:underline">
                            Track <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                        {user.role === "BUYER" && order.status === "DISPATCHED" && (
                          <Button
                            size="sm"
                            onClick={() => confirmPurchaseMutation.mutate(order.id)}
                            disabled={confirmPurchaseMutation.isPending}
                            className="font-extrabold flex items-center gap-0.5 text-xs bg-agri-green text-white hover:bg-agri-green-hover"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            {confirmPurchaseMutation.isPending ? "Confirming..." : "Confirm Purchase"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
