"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PlusCircle,
  Tractor,
  Pencil,
  Trash2,
  Eye,
  ShieldCheck,
  PackageOpen,
} from "lucide-react";
import Header from "../../../components/shared/Header";
import Sidebar from "../../../components/shared/Sidebar";
import Button from "../../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import { apiService } from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import { useSocketStore } from "../../../store/socketStore";
import { toast } from "sonner";
import RawImage from "../../../components/ui/RawImage";


export default function MyListingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const { socket } = useSocketStore();

  // Guard: farmers only
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    } else if (user && user.role !== "FARMER") {
      router.push("/dashboard/buyer");
    }
  }, [isAuthenticated, user, router]);

  // Fetch this farmer's own products via /products/farmer/mine
  const { data: res, isLoading } = useQuery({
    queryKey: ["farmerProducts"],
    queryFn: () => apiService.getMyProducts(),
    enabled: !!user && user.role === "FARMER",
  });

  const products = Array.isArray(res?.data) ? res.data : [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (productId) => apiService.deleteProduct(productId),
    onSuccess: (_, productId) => {
      toast.success("Product removed from marketplace.");
      queryClient.invalidateQueries(["farmerProducts"]);
      queryClient.invalidateQueries(["products"]);
      queryClient.invalidateQueries(["farmerAnalytics"]);
      if (socket && typeof socket.emit === "function") {
        socket.emit("product:deleted", { productId });
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete product.");
    },
  });

  const handleDelete = (productId, productName) => {
    const ok = window.confirm(`Remove "${productName}" from the marketplace? This cannot be undone.`);
    if (!ok) return;
    deleteMutation.mutate(productId);
  };

  if (!isAuthenticated || !user || user.role !== "FARMER") return null;

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col text-current transition-colors">
      <Header />

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
                My Listings
              </h1>
              <p className="text-xs sm:text-sm text-agri-brown mt-1">
                Manage your active crop listings on the AgroVista marketplace.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => router.push("/products/create")}
              className="flex items-center gap-1.5 py-2.5 rounded-xl text-xs self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              List New Crop
            </Button>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card rounded-3xl p-4 space-y-4 animate-pulse">
                  <div className="h-40 w-full bg-gray-200 dark:bg-zinc-800 rounded-2xl" />
                  <div className="h-4 w-2/3 bg-gray-200 dark:bg-zinc-800 rounded" />
                  <div className="h-4 w-1/2 bg-gray-200 dark:bg-zinc-800 rounded" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <Card className="border-agri-green/5">
              <CardContent className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-agri-green/5 flex items-center justify-center">
                  <PackageOpen className="w-8 h-8 text-agri-brown/40" />
                </div>
                <div>
                  <p className="font-extrabold text-agri-green-dark dark:text-agri-green-light">
                    No active listings yet
                  </p>
                  <p className="text-xs text-agri-brown mt-1">
                    Start by listing your first crop on the marketplace.
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => router.push("/products/create")}
                  className="flex items-center gap-1.5 py-2.5 rounded-xl text-xs mt-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  List New Crop
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((prod) => {
                const productId = prod.id || prod._id;
                return (
                  <Card key={productId} hoverEffect className="border-agri-green/5 flex flex-col">
                    {/* Product Image */}
                    <div className="relative h-44 w-full rounded-t-2xl overflow-hidden bg-agri-green/5">
                      {prod.images?.[0] ? (
                        <RawImage
                          src={prod.images[0]}
                          alt={prod.name}
                          width={600}
                          height={240}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-agri-green/20">
                          <svg
                            className="w-10 h-10 text-agri-green/30"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <p className="text-[10px] text-agri-green/40 font-semibold mt-1.5">
                            No image provided
                          </p>
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap">
                        {prod.isOrganic && (
                          <Badge variant="green" size="sm">
                            Organic
                          </Badge>
                        )}
                      </div>
                      {prod.farmerVerified && (
                        <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-black text-agri-wheat flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified</span>
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="p-4 flex flex-col flex-1 gap-3">
                      <div>
                        <h4 className="font-extrabold text-agri-green-dark dark:text-agri-green-light truncate">
                          {prod.name}
                        </h4>
                        <p className="text-[10px] text-agri-brown mt-0.5">
                          {prod.category} &middot; Harvest:{" "}
                          {prod.harvestDate
                            ? new Date(prod.harvestDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </p>
                      </div>

                      <div className="flex justify-between text-xs mt-auto pt-2 border-t border-agri-green/5">
                        <div>
                          <p className="text-[9px] text-agri-brown font-bold uppercase">Price</p>
                          <p className="font-black text-agri-green">
                            ₹{prod.price}{" "}
                            <span className="text-[10px] font-semibold">/ {prod.unit}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-agri-brown font-bold uppercase">Available</p>
                          <p className="font-bold text-agri-green-dark dark:text-agri-green-light">
                            {prod.quantity} {prod.unit}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="ghost"
                          onClick={() => router.push(`/products/${productId}`)}
                          className="flex-1 flex items-center justify-center gap-1 text-[10px] py-2 rounded-xl"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => router.push(`/products/edit?id=${productId}`)}
                          className="flex-1 flex items-center justify-center gap-1 text-[10px] py-2 rounded-xl"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                        <button
                          onClick={() => handleDelete(productId, prod.name)}
                          disabled={deleteMutation.isLoading}
                          className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 transition disabled:opacity-60"
                          title="Remove listing"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
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