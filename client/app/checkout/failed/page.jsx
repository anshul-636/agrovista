"use client";

import React, { Suspense, useState, useEffect } from "react";
import Script from "next/script";
import { useSearchParams, useRouter } from "next/navigation";
import { XCircle, RefreshCw, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import Header from "../../../components/shared/Header";
import Button from "../../../components/ui/Button";
import { Card, CardContent } from "../../../components/ui/Card";
import { apiService } from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import { toast } from "sonner";

export default function FailedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col" />}>
      <FailedPageContent />
    </Suspense>
  );
}

function FailedPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams ? searchParams.get("orderId") : "";
  const { user } = useAuthStore();

  const [isRetrying, setIsRetrying] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Check if Razorpay script is loaded
    if (window.Razorpay) {
      setScriptLoaded(true);
    }
  }, []);

  const handleRetryPayment = async () => {
    if (!orderId) {
      toast.error("Invalid Order Reference. Cannot retry payment.");
      return;
    }
    
    setIsRetrying(true);
    toast.loading("Re-initiating payment gateway intent...");

    try {
      const response = await apiService.createPayment({ orderId });
      toast.dismiss();

      if (!response.success) {
        throw new Error(response.message || "Failed to create payment intent");
      }

      const { order, rzpOrder, keyId } = response.data;

      const options = {
        key: keyId,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: "AgroVista Direct",
        description: "Retry Sourcing Escrow",
        order_id: rzpOrder.id,
        handler: async function (response) {
          try {
            toast.loading("Verifying payment transaction...");
            const verifyRes = await apiService.verifyPayment({
              orderId: order._id || order.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            toast.dismiss();
            if (verifyRes.success) {
              toast.success("Payment verified! Order placed.");
              router.push(`/checkout/success?orderId=${order._id || order.id}&paymentId=${response.razorpay_payment_id}`);
            } else {
              toast.error("Signature verification failed.");
            }
          } catch (err) {
            toast.dismiss();
            toast.error("Signature verification failed: " + (err?.response?.data?.message || err.message));
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email
        },
        theme: {
          color: "#2E7D32"
        },
        modal: {
          ondismiss: function () {
            setIsRetrying(false);
            toast.info("Payment window dismissed.");
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.dismiss();
      toast.error(err?.response?.data?.message || err?.message || "Failed to launch payment window.");
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 text-current transition-colors pb-16 flex flex-col justify-between">
      <Header />
      
      {/* Load Razorpay script dynamically */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setScriptLoaded(true)}
        onError={() => toast.error("Failed to load Razorpay payment SDK.")}
      />

      <main className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 flex items-center justify-center w-full">
        <Card className="border-agri-green/5 p-8 text-center space-y-6 shadow-xl glass-card rounded-[2.5rem]">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
            <XCircle className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-500">
              Transaction Failed
            </h1>
            <p className="text-xs sm:text-sm text-agri-brown">
              We couldn&apos;t authorize or verify your direct trade transaction. Your order remains pending and no funds have been debited.
            </p>
          </div>

          {orderId && (
            <div className="bg-white/40 dark:bg-black/20 p-5 rounded-2xl border border-agri-green/10 text-xs text-left space-y-2.5 font-semibold text-agri-brown">
              <div className="flex justify-between">
                <span>Order Reference ID</span>
                <span className="font-extrabold text-agri-green-dark dark:text-agri-green-light">
                  #{orderId.slice(-10).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between border-t border-agri-green/5 pt-2.5">
                <span>Payment Status</span>
                <span className="font-extrabold text-red-500 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Failed / Pending
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handleRetryPayment}
              disabled={isRetrying || !scriptLoaded}
              variant="primary"
              className="py-3 rounded-2xl flex items-center justify-center gap-1.5 font-bold shadow-md shadow-agri-green/10"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
              <span>Retry Payment</span>
            </Button>
            
            <div className="flex gap-3">
              <Button
                onClick={() => router.push("/cart")}
                variant="outline"
                className="flex-1 py-3 rounded-2xl font-bold text-xs"
              >
                Modify Cart
              </Button>
              <Button
                onClick={() => router.push("/orders")}
                variant="outline"
                className="flex-1 py-3 rounded-2xl font-bold text-xs"
              >
                View My Orders
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
