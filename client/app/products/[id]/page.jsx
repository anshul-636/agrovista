"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, ShieldCheck, Heart, ArrowLeft, Star, ShoppingBag, Plus, Minus, UserCheck } from "lucide-react";
import Header from "../../../components/shared/Header";
import Button from "../../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import Input from "../../../components/ui/Input";
import { apiService } from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import { toast } from "sonner";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const currentUserId = user?.id || user?._id || null;
  const currentUserRole = String(user?.role || "").toUpperCase();
  const [quantity, setQuantity] = useState(10);
  const [address, setAddress] = useState("");
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isWatching, setIsWatching] = useState(false);

  // Fetch product detail
  const { data: detailRes, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => apiService.getProductById(id),
  });

  let product = detailRes?.data || null;
  if (product) {
    product = {
      ...product,
      id: product.id || product._id,
      farmerName: product.farmerName || product.farmer?.name || "Unknown",
      farmerLocation: product.farmerLocation || product.farmer?.location || product.location || "India",
      farmerTrustScore: product.farmerTrustScore || product.farmer?.trustScore || 90,
      reviews: product.reviews || [],
      images: product.images && product.images.length > 0 ? product.images : ["https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=600"],
    };
  }
  const isOwnProduct = !!(product && currentUserId && (String(product.farmerId) === String(currentUserId) || String(product.farmer?._id) === String(currentUserId)));

  // Order mutation
  const createOrderMutation = useMutation({
    mutationFn: (orderData) => apiService.createOrder(orderData),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Order placed successfully!");
        queryClient.invalidateQueries(["buyerOrders"]);
        router.push(`/dashboard/buyer`);
      } else {
        toast.error("Failed to place order.");
      }
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message || "Failed to place order.");
    }
  });

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Please log in to purchase.");
      router.push("/login");
      return;
    }
    if (currentUserRole !== "BUYER") {
      toast.error("Only buyers can purchase products.");
      return;
    }
    if (isOwnProduct) {
      toast.error("You cannot order your own product.");
      return;
    }
    if (quantity <= 0) {
      toast.error("Please specify a valid quantity.");
      return;
    }
    if (quantity > product.quantity) {
      toast.error(`Only ${product.quantity} ${product.unit} available.`);
      return;
    }
    if (!address) {
      toast.error("Please fill in a delivery address.");
      return;
    }

    createOrderMutation.mutate({
      productId: product.id,
      quantity,
      deliveryAddress: address
    });
  };

  const toggleWatchlist = () => {
    setIsWatching(!isWatching);
    if (!isWatching) {
      toast.success(`${product?.name || "Crop"} added to watchlist alerts!`, { icon: "❤️" });
    } else {
      toast.info("Removed from watchlist.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col">
        <Header />
        <div className="max-w-7xl mx-auto p-8 w-full space-y-6 animate-pulse">
          <div className="h-10 w-24 bg-gray-200 dark:bg-zinc-800 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl" />
            <div className="lg:col-span-5 h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col">
        <Header />
        <div className="max-w-md mx-auto my-auto text-center p-8 space-y-4">
          <h2 className="text-xl font-bold text-red-500">Product Not Found</h2>
          <Button onClick={() => router.push("/products")}>Go Back Marketplace</Button>
        </div>
      </div>
    );
  }

  const totalPrice = product.price * quantity;

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 text-current pb-20 transition-colors">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Back Link */}
        <button
          onClick={() => router.push("/products")}
          className="inline-flex items-center gap-2 text-xs font-bold text-agri-brown hover:text-agri-green transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </button>

        {/* Core Product Presentation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Images and Details */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              {/* Active Image */}
              <div className="relative h-96 w-full rounded-[2rem] overflow-hidden border border-agri-green/5 bg-agri-green/5 shadow-md">
                <img
                  src={product.images[activeImageIdx]}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {product.isOrganic && (
                  <div className="absolute top-4 left-4">
                    <Badge variant="green" size="lg">Organic certified</Badge>
                  </div>
                )}
                <button
                  onClick={toggleWatchlist}
                  className="absolute top-4 right-4 p-3 rounded-full bg-white/80 dark:bg-zinc-900/80 hover:bg-white transition text-red-500 shadow"
                >
                  <Heart className={`w-5 h-5 ${isWatching ? "fill-current" : ""}`} />
                </button>
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`h-20 w-24 rounded-xl overflow-hidden border-2 transition ${
                        activeImageIdx === idx ? "border-agri-green" : "border-transparent"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description & Metadata */}
            <Card className="border-agri-green/5 p-6 sm:p-8 space-y-6">
              <div>
                <span className="text-[10px] font-black uppercase text-agri-green">{product.category} Listing</span>
                <h1 className="text-2xl sm:text-3xl font-black text-agri-green-dark dark:text-agri-green-light mt-1.5 leading-tight">
                  {product.name}
                </h1>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-agri-brown font-semibold">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-agri-green" />
                    <span>{product.farmerLocation}</span>
                  </div>
                  <div className="w-1.5 h-1.5 bg-agri-green/20 rounded-full" />
                  <div>Harvest Date: <span className="font-extrabold text-agri-green-dark dark:text-agri-green-light">{product.harvestDate}</span></div>
                </div>
              </div>

              <div className="h-px bg-agri-green/5" />

              <div className="space-y-3">
                <h3 className="text-sm font-black text-agri-green uppercase">Crop Description</h3>
                <p className="text-xs sm:text-sm text-agri-brown dark:text-gray-300 leading-relaxed">
                  {product.description}
                </p>
              </div>

              <div className="h-px bg-agri-green/5" />

              {/* Farmer details */}
              <div className="flex items-center gap-4 p-4 bg-agri-green/5 rounded-2xl border border-agri-green/10">
                <div className="p-3 bg-agri-green/10 rounded-xl text-agri-green">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-agri-green-dark dark:text-agri-green-light">
                    Grower: {product.farmerName}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-agri-brown font-bold uppercase mt-0.5">
                    <Star className="w-3.5 h-3.5 text-agri-wheat fill-current" />
                    <span>{product.farmerTrustScore}% platform Trust Score</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Reviews Board */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-agri-green-dark dark:text-agri-green-light">
                Verified Buyer Reviews
              </h3>
              {product.reviews.length === 0 ? (
                <p className="text-xs text-agri-brown italic pl-2">No buyer ratings yet. Buy now to leave the first review!</p>
              ) : (
                <div className="space-y-3">
                  {product.reviews.map((rev) => (
                    <Card key={rev.id} className="border-agri-green/5 p-4 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-agri-green-dark dark:text-agri-green-light">{rev.reviewer}</span>
                        <span className="text-[10px] text-agri-brown font-semibold">{rev.createdAt}</span>
                      </div>
                      <div className="flex gap-0.5 text-agri-wheat">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                      <p className="text-xs text-agri-brown dark:text-gray-300 italic">&ldquo;{rev.comment}&rdquo;</p>
                    </Card>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right: Purchase Order Form */}
          <div className="lg:col-span-5 sticky top-24">
            <Card className="border-agri-green/5 p-6 space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] text-agri-brown uppercase font-bold">Wholesale Price</span>
                <p className="text-3xl font-black text-agri-green">
                  ₹{product.price} <span className="text-xs font-semibold text-agri-brown">/ {product.unit}</span>
                </p>
              </div>

              <div className="p-4 bg-agri-green/5 rounded-2xl border border-agri-green/10 flex items-center justify-between text-xs font-semibold text-agri-brown">
                <span>Available Inventory:</span>
                <span className="font-extrabold text-agri-green-dark dark:text-agri-green-light">{product.quantity} {product.unit}</span>
              </div>

              {currentUserRole !== "BUYER" || isOwnProduct ? (
                <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                  <p className="font-bold">Ordering is unavailable on this account.</p>
                  <p className="text-xs leading-relaxed">
                    {currentUserRole !== "BUYER"
                      ? "Only buyer accounts can place orders. Switch to a buyer account to purchase this product."
                      : "You cannot place an order for your own listing."}
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePlaceOrder} className="space-y-4">
                {/* Quantity Select widget */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-agri-green-dark dark:text-agri-green-light">
                    Select order Quantity ({product.unit})
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 5))}
                      className="p-3 bg-agri-green/5 rounded-2xl hover:bg-agri-green/10 border border-agri-green/15 text-agri-green transition"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.min(product.quantity, Math.max(1, Number(e.target.value))))}
                      className="flex-1 text-center py-2.5 rounded-2xl border text-sm bg-white dark:bg-black/20 border-agri-green/10 font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(product.quantity, quantity + 5))}
                      className="p-3 bg-agri-green/5 rounded-2xl hover:bg-agri-green/10 border border-agri-green/15 text-agri-green transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Input
                  label="Delivery Address"
                  id="address"
                  placeholder="Street, City, pincode"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />

                {/* Pricing Summary */}
                <div className="space-y-2 text-xs font-semibold text-agri-brown border-t border-agri-green/5 pt-4">
                  <div className="flex justify-between">
                    <span>Base Cost ({quantity} kg × ₹{product.price})</span>
                    <span>₹{totalPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Logistics Charge</span>
                    <span className="text-green-600 font-extrabold">Free Shipping</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-agri-green-dark dark:text-white border-t border-dashed border-agri-green/10 pt-3">
                    <span>Total Amount</span>
                    <span>₹{totalPrice}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 mt-4"
                  disabled={createOrderMutation.isLoading}
                >
                  <ShoppingBag className="w-4.5 h-4.5" />
                  <span>{createOrderMutation.isLoading ? "Submitting Order..." : "Confirm Purchase"}</span>
                </Button>
              </form>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
