"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag, Landmark, ShieldCheck } from "lucide-react";
import Header from "../../components/shared/Header";
import Button from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { useCartStore } from "../../store/cartStore";
import { useAuthStore } from "../../store/authStore";
import { toast } from "sonner";
import RawImage from "../../components/ui/RawImage";

export default function CartPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuthStore();
  const { items, updateQuantity, removeItem, clearCart, getTotals } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      toast.error("Please log in to view your cart.");
      router.push("/login");
    }
  }, [mounted, isAuthenticated, authLoading, router]);

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col">
        <Header />
        <div className="max-w-7xl mx-auto p-8 w-full space-y-6 animate-pulse flex-1">
          <div className="h-8 w-48 bg-gray-200 dark:bg-zinc-800 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl" />
            <div className="lg:col-span-4 h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user?.role !== "BUYER") {
    return (
      <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col">
        <Header />
        <div className="max-w-md mx-auto my-auto text-center p-8 space-y-4">
          <h2 className="text-xl font-bold text-red-500">Access Restricted</h2>
          <p className="text-xs text-agri-brown">Only buyer accounts can access the shopping cart.</p>
          <Button onClick={() => router.push("/products")}>Go to Marketplace</Button>
        </div>
      </div>
    );
  }

  const { subtotal, shippingFee, tax, total } = getTotals();

  const handleQtyChange = (productId, newQty, availableStock) => {
    if (newQty <= 0) {
      removeItem(productId);
      toast.info("Item removed from cart");
      return;
    }
    if (newQty > availableStock) {
      toast.error(`Only ${availableStock} units available in inventory`);
      return;
    }
    updateQuantity(productId, newQty);
  };

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 text-current transition-colors pb-16 flex flex-col">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 flex-1 w-full">
        {/* Back Link */}
        <button
          onClick={() => router.push("/products")}
          className="inline-flex items-center gap-2 text-xs font-bold text-agri-brown hover:text-agri-green transition"
        >
          <ArrowLeft className="w-4 h-4" /> Continue Sourcing
        </button>

        {/* Title */}
        <div>
          <h1 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
            Your Sourcing Cart
          </h1>
          <p className="text-xs sm:text-sm text-agri-brown mt-1">
            Review your selected crops and adjust bulk volumes before proceeding.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-white/45 dark:bg-black/10 rounded-[2rem] border border-agri-green/5 shadow-sm space-y-4 max-w-2xl mx-auto">
            <ShoppingBag className="w-12 h-12 text-agri-brown mx-auto mb-2 animate-bounce" />
            <h3 className="text-lg font-bold text-agri-green-dark">Your Cart is Empty</h3>
            <p className="text-xs text-agri-brown max-w-sm mx-auto">
              You haven&apos;t added any fresh crop listings to your cart yet. Explore the marketplace to find high-quality harvests.
            </p>
            <Button onClick={() => router.push("/products")} variant="primary" className="py-2.5 px-6 rounded-xl font-bold">
              Browse Crops
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Cart Items List */}
            <div className="lg:col-span-8 space-y-4">
              {items.map((item) => {
                const prod = item.product;
                const prodId = prod.id || prod._id;
                const imgUrl = prod.images?.[0] || "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=600";
                const farmerName = prod.farmerName || prod.farmer?.name || "Verified Grower";

                return (
                  <Card key={prodId} className="border-agri-green/5 overflow-hidden hover:border-agri-green/10 transition-all duration-300">
                    <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      {/* Left: Image & Info */}
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="w-20 h-20 relative rounded-2xl overflow-hidden bg-agri-green/5 shrink-0 border border-agri-green/5">
                          <RawImage
                            src={imgUrl}
                            alt={prod.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <h4 className="font-extrabold text-sm sm:text-base text-agri-green-dark dark:text-agri-green-light truncate">
                            {prod.name}
                          </h4>
                          <p className="text-[10px] text-agri-brown font-semibold uppercase tracking-wider">
                            Grower: {farmerName}
                          </p>
                          <p className="text-xs text-agri-green font-bold">
                            ₹{prod.price} <span className="text-[10px] font-normal text-agri-brown">/ {prod.unit || "kg"}</span>
                          </p>
                        </div>
                      </div>

                      {/* Right: Quantity selector & Total */}
                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 border-agri-green/5 pt-3 sm:pt-0">
                        {/* Qty Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(prodId, item.quantity - 5, prod.quantity)}
                            className="p-2 bg-agri-green/5 rounded-xl hover:bg-agri-green/10 border border-agri-green/10 text-agri-green transition"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleQtyChange(prodId, Number(e.target.value), prod.quantity)}
                            className="w-16 text-center py-1.5 rounded-xl border text-xs bg-white dark:bg-black/20 border-agri-green/15 font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => handleQtyChange(prodId, item.quantity + 5, prod.quantity)}
                            className="p-2 bg-agri-green/5 rounded-xl hover:bg-agri-green/10 border border-agri-green/10 text-agri-green transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Amount */}
                        <div className="text-right min-w-[80px]">
                          <p className="text-[9px] text-agri-brown font-bold uppercase">Subtotal</p>
                          <p className="text-sm font-black text-agri-green-dark dark:text-agri-green-light">
                            ₹{(prod.price * item.quantity).toLocaleString("en-IN")}
                          </p>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => {
                            removeItem(prodId);
                            toast.success(`${prod.name} removed from cart`);
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition"
                          title="Remove item"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    clearCart();
                    toast.success("Cart cleared");
                  }}
                  className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Clear All Items
                </button>
              </div>
            </div>

            {/* Right: Cart Summary Card */}
            <div className="lg:col-span-4 sticky top-24">
              <Card className="border-agri-green/5 p-6 space-y-6">
                <h3 className="text-lg font-black text-agri-green-dark dark:text-agri-green-light">
                  Order Summary
                </h3>

                <div className="space-y-3 text-xs font-semibold text-agri-brown border-b border-agri-green/5 pb-4">
                  <div className="flex justify-between">
                    <span>Base Value ({items.reduce((acc, item) => acc + item.quantity, 0)} units)</span>
                    <span>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Logistics & Handling</span>
                    <span className="text-green-600 font-extrabold uppercase">Free Delivery</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (5%)</span>
                    <span>₹{tax.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="flex justify-between text-base font-black text-agri-green-dark dark:text-white pt-1">
                  <span>Estimated Total</span>
                  <span className="text-lg text-agri-green">₹{total.toLocaleString("en-IN")}</span>
                </div>

                <div className="space-y-3 pt-2">
                  <Link href="/checkout">
                    <Button variant="primary" className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-md">
                      <ShieldCheck className="w-4.5 h-4.5" />
                      <span>Proceed to Checkout</span>
                    </Button>
                  </Link>

                  <div className="flex items-center gap-2 justify-center text-[10px] text-agri-brown font-bold uppercase pt-1">
                    <Landmark className="w-3.5 h-3.5 text-agri-green" />
                    <span>Secure Escrow Payments Enabled</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
