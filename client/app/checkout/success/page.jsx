"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, ArrowRight, ClipboardList, ShieldCheck } from "lucide-react";
import Header from "../../../components/shared/Header";
import Button from "../../../components/ui/Button";
import { Card, CardContent } from "../../../components/ui/Card";

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col" />}>
      <SuccessPageContent />
    </Suspense>
  );
}

function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams ? searchParams.get("orderId") : "";
  const paymentId = searchParams ? searchParams.get("paymentId") : "";
  const method = searchParams ? searchParams.get("method") : "";

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 text-current transition-colors pb-16 flex flex-col justify-between">
      <Header />

      <main className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 flex items-center justify-center w-full">
        <Card className="border-agri-green/5 p-8 text-center space-y-6 shadow-xl glass-card rounded-[2.5rem]">
          <div className="w-16 h-16 bg-agri-green/10 rounded-full flex items-center justify-center mx-auto text-agri-green">
            <CheckCircle className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-agri-green-dark dark:text-agri-green-light">
              Deal Committed!
            </h1>
            <p className="text-xs sm:text-sm text-agri-brown">
              {method === "COD"
                ? "Your Cash on Delivery order is successfully logged and transit preparation has commenced."
                : "Your direct trade escrow transaction was validated and authorized successfully."}
            </p>
          </div>

          <div className="bg-white/40 dark:bg-black/20 p-5 rounded-2xl border border-agri-green/10 text-xs text-left space-y-2.5 font-semibold text-agri-brown">
            <div className="flex justify-between">
              <span>Order Reference ID</span>
              <span className="font-extrabold text-agri-green-dark dark:text-agri-green-light">
                #{orderId ? orderId.slice(-10).toUpperCase() : "N/A"}
              </span>
            </div>
            {paymentId && (
              <div className="flex justify-between">
                <span>Transaction Reference</span>
                <span className="font-extrabold text-agri-green-dark dark:text-agri-green-light truncate max-w-[200px]">
                  {paymentId}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Fulfillment Protocol</span>
              <span className="font-extrabold text-agri-green">
                {method === "COD" ? "Cash On Delivery (Transporter Pay)" : "Razorpay Direct Escrow"}
              </span>
            </div>
            <div className="flex justify-between border-t border-agri-green/5 pt-2.5">
              <span>Contract Status</span>
              <span className="font-extrabold text-green-600 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Activated
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={() => router.push(`/orders/${orderId}`)}
              variant="primary"
              className="flex-1 py-3 rounded-2xl flex items-center justify-center gap-1.5 font-bold shadow-md shadow-agri-green/10"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Track shipment</span>
            </Button>
            <Button
              onClick={() => router.push("/products")}
              variant="outline"
              className="flex-1 py-3 rounded-2xl flex items-center justify-center gap-1.5 font-bold"
            >
              <span>Keep shopping</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
