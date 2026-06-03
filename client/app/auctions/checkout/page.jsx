"use client";

import React, { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Trophy,
  Truck,
  CreditCard,
  Landmark,
  ShieldCheck,
  MapPin,
  Package,
  CheckCircle2,
  Loader2
} from "lucide-react";
import Header from "../../../components/shared/Header";
import Button from "../../../components/ui/Button";
import { Card, CardContent } from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import { useAuthStore } from "../../../store/authStore";
import { apiService } from "../../../lib/api";
import { toast } from "sonner";

export default function AuctionCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auctionId = searchParams.get("auctionId");
  const auctionName = searchParams.get("name") || "Auction Product";
  const finalBid = searchParams.get("bid");
  const quantity = searchParams.get("qty");
  const unit = searchParams.get("unit") || "kg";
  const image = searchParams.get("img");

  const { user, isAuthenticated, loading: authLoading } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1); // 1: Delivery, 2: Payment Method, 3: Review
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Delivery address
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("ONLINE");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      toast.error("Please log in to continue.");
      router.push("/login");
    }
  }, [mounted, isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (mounted && !authLoading && !auctionId) {
      toast.error("No auction specified.");
      router.push("/auctions");
    }
  }, [mounted, authLoading, auctionId, router]);

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col">
        <Header />
        <div className="max-w-4xl mx-auto p-8 w-full space-y-6 animate-pulse flex-1">
          <div className="h-8 w-48 bg-gray-200 dark:bg-zinc-800 rounded" />
          <div className="h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  const totalAmount = finalBid && quantity
    ? (parseFloat(finalBid) * parseFloat(quantity)).toFixed(2)
    : finalBid;

  const validateAddress = () => {
    if (!street || !city || !state || !pincode || !phone) {
      toast.error("Please fill in all delivery details.");
      return false;
    }
    if (phone.length < 10) {
      toast.error("Please enter a valid phone number.");
      return false;
    }
    if (pincode.length < 6) {
      toast.error("Please enter a valid pincode.");
      return false;
    }
    return true;
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!validateAddress()) return;

    setIsSubmitting(true);

    const orderPayload = {
      paymentMethod,
      deliveryAddress: { street, city, state, pincode, phone },
      deliveryNotes: deliveryNotes || undefined
    };

    try {
      // Step 1: Create the auction order
      const orderRes = await apiService.createAuctionOrder(auctionId, orderPayload);
      if (!orderRes.success) {
        throw new Error(orderRes.error || "Failed to create order.");
      }

      const order = orderRes.data?.order;

      if (paymentMethod === "COD") {
        toast.success("Order placed successfully via Cash on Delivery!");
        router.push(`/checkout/success?orderId=${order._id || order.id}&method=COD`);
        return;
      }

      // ONLINE — initiate Razorpay
      if (!scriptLoaded && !window.Razorpay) {
        toast.error("Payment SDK is loading, please try again in a moment.");
        setIsSubmitting(false);
        return;
      }

      const paymentRes = await apiService.createAuctionPaymentIntent(order._id || order.id);
      if (!paymentRes.success) {
        throw new Error(paymentRes.error || "Failed to initiate payment.");
      }

      const { rzpOrder, keyId } = paymentRes.data;

      const options = {
        key: keyId,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: "AgroVista — Auction Payment",
        description: `${auctionName} (${quantity} ${unit})`,
        order_id: rzpOrder.id,
        image: image || undefined,
        handler: async function (response) {
          try {
            toast.loading("Verifying payment…");
            const verifyRes = await apiService.verifyAuctionPayment(order._id || order.id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            toast.dismiss();
            if (verifyRes.success) {
              toast.success("Payment verified! Your auction order is confirmed.");
              router.push(`/checkout/success?orderId=${order._id || order.id}&paymentId=${response.razorpay_payment_id}`);
            } else {
              toast.error("Payment verification failed. Contact support.");
            }
          } catch (err) {
            toast.dismiss();
            toast.error(err.message || "Verification failed.");
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: phone
        },
        theme: { color: "#2E7D32" },
        modal: {
          ondismiss: () => {
            toast.info("Payment cancelled. You can retry from your orders page.");
            setIsSubmitting(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      setIsSubmitting(false);
    } catch (err) {
      toast.error(err.message || "Something went wrong.");
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, label: "Delivery", icon: MapPin },
    { id: 2, label: "Payment", icon: CreditCard },
    { id: 3, label: "Review", icon: Package }
  ];

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setScriptLoaded(true)}
      />
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {/* Back */}
        <button
          onClick={() => router.push(`/auctions/${auctionId}`)}
          className="flex items-center gap-2 text-sm text-agri-brown hover:text-agri-green font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Auction
        </button>

        {/* Winner Banner */}
        <div className="flex items-center gap-4 p-5 rounded-3xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10 border border-amber-200 dark:border-amber-700">
          <Trophy className="w-10 h-10 text-amber-500 shrink-0" />
          <div>
            <p className="font-black text-amber-800 dark:text-amber-300 text-lg">You Won! 🎉</p>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Complete the checkout below to confirm your auction win and arrange delivery.
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {steps.map((s, i) => (
            <React.Fragment key={s.id}>
              <button
                onClick={() => step > s.id && setStep(s.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition ${
                  step === s.id
                    ? "bg-agri-green text-white shadow"
                    : step > s.id
                    ? "bg-agri-green/20 text-agri-green cursor-pointer"
                    : "bg-gray-100 dark:bg-zinc-800 text-agri-brown cursor-not-allowed"
                }`}
              >
                {step > s.id
                  ? <CheckCircle2 className="w-3.5 h-3.5" />
                  : <s.icon className="w-3.5 h-3.5" />}
                {s.label}
              </button>
              {i < steps.length - 1 && (
                <div className={`h-px w-8 sm:w-12 transition-colors ${step > s.id ? "bg-agri-green" : "bg-gray-200 dark:bg-zinc-700"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Main Form ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Step 1: Delivery Address */}
            {step === 1 && (
              <Card className="border-agri-green/10 p-6 space-y-5">
                <div className="flex items-center gap-2 font-black text-agri-green-dark dark:text-agri-green-light">
                  <MapPin className="w-5 h-5" /> Delivery Address
                </div>
                <div className="space-y-4">
                  <Input
                    label="Street / House No."
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="123, Main Street, Near Bus Stand"
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Kanpur"
                      required
                    />
                    <Input
                      label="State"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Uttar Pradesh"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Pincode"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="208001"
                      maxLength={6}
                      required
                    />
                    <Input
                      label="Phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      maxLength={10}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-agri-brown">
                      Delivery Notes <span className="font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="Landmark, preferred timing, or special instructions…"
                      rows={2}
                      className="w-full px-4 py-3 rounded-2xl border border-agri-green/10 text-sm bg-white dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-agri-green/20 resize-none"
                    />
                  </div>
                </div>
                <Button
                  variant="primary"
                  className="w-full rounded-2xl"
                  onClick={() => {
                    if (validateAddress()) setStep(2);
                  }}
                >
                  Continue to Payment →
                </Button>
              </Card>
            )}

            {/* Step 2: Payment Method */}
            {step === 2 && (
              <Card className="border-agri-green/10 p-6 space-y-5">
                <div className="flex items-center gap-2 font-black text-agri-green-dark dark:text-agri-green-light">
                  <CreditCard className="w-5 h-5" /> Choose Payment Method
                </div>
                <div className="space-y-3">
                  {[
                    {
                      id: "ONLINE",
                      label: "Online Payment",
                      sub: "Pay securely via UPI, Card, Net Banking (Razorpay)",
                      icon: CreditCard,
                      badge: "Recommended"
                    },
                    {
                      id: "COD",
                      label: "Cash on Delivery",
                      sub: "Pay when the product arrives at your door",
                      icon: Landmark,
                      badge: null
                    }
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition ${
                        paymentMethod === method.id
                          ? "border-agri-green bg-agri-green/5"
                          : "border-agri-green/10 hover:bg-agri-green/5"
                      }`}
                    >
                      <div className={`p-2 rounded-xl mt-0.5 ${paymentMethod === method.id ? "bg-agri-green text-white" : "bg-gray-100 dark:bg-zinc-800 text-agri-brown"}`}>
                        <method.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-agri-green-dark dark:text-agri-green-light">{method.label}</p>
                          {method.badge && (
                            <span className="text-[10px] font-black bg-agri-green text-white px-2 py-0.5 rounded-full">{method.badge}</span>
                          )}
                        </div>
                        <p className="text-xs text-agri-brown mt-0.5">{method.sub}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                        paymentMethod === method.id ? "border-agri-green" : "border-gray-300 dark:border-zinc-600"
                      }`}>
                        {paymentMethod === method.id && (
                          <div className="w-2.5 h-2.5 rounded-full bg-agri-green" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setStep(1)}>
                    ← Back
                  </Button>
                  <Button variant="primary" className="flex-1 rounded-2xl" onClick={() => setStep(3)}>
                    Review Order →
                  </Button>
                </div>
              </Card>
            )}

            {/* Step 3: Review & Confirm */}
            {step === 3 && (
              <Card className="border-agri-green/10 p-6 space-y-5">
                <div className="flex items-center gap-2 font-black text-agri-green-dark dark:text-agri-green-light">
                  <Package className="w-5 h-5" /> Review & Confirm
                </div>

                {/* Delivery summary */}
                <div className="rounded-2xl bg-agri-green/5 border border-agri-green/10 p-4 space-y-1">
                  <p className="text-xs font-black text-agri-brown uppercase tracking-wider">Delivery To</p>
                  <p className="text-sm font-bold text-agri-green-dark dark:text-agri-green-light">
                    {street}, {city}, {state} — {pincode}
                  </p>
                  <p className="text-xs text-agri-brown">📞 {phone}</p>
                  {deliveryNotes && <p className="text-xs text-agri-brown italic">Note: {deliveryNotes}</p>}
                </div>

                {/* Payment method summary */}
                <div className="rounded-2xl bg-agri-green/5 border border-agri-green/10 p-4 flex items-center gap-3">
                  {paymentMethod === "ONLINE"
                    ? <CreditCard className="w-5 h-5 text-agri-green shrink-0" />
                    : <Landmark className="w-5 h-5 text-agri-green shrink-0" />}
                  <div>
                    <p className="text-sm font-bold text-agri-green-dark dark:text-agri-green-light">
                      {paymentMethod === "ONLINE" ? "Online Payment (Razorpay)" : "Cash on Delivery"}
                    </p>
                    <p className="text-xs text-agri-brown">
                      {paymentMethod === "ONLINE"
                        ? "You'll be redirected to Razorpay to complete payment."
                        : "Pay the delivery agent when the product arrives."}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setStep(2)}>
                    ← Back
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1 rounded-2xl flex items-center justify-center gap-2"
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                      : paymentMethod === "ONLINE"
                        ? "Pay Now"
                        : "Confirm Order (COD)"
                    }
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* ── Order Summary sidebar ── */}
          <div className="space-y-4">
            <Card className="border-agri-green/10 p-5 space-y-4">
              <p className="font-black text-agri-green-dark dark:text-agri-green-light text-sm">Order Summary</p>

              {/* Product */}
              <div className="flex gap-3 items-start">
                {image ? (
                  <img
                    src={decodeURIComponent(image)}
                    alt={auctionName}
                    className="w-16 h-16 rounded-2xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-agri-green/10 flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6 text-agri-green" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-agri-green-dark dark:text-agri-green-light truncate">{auctionName}</p>
                  <p className="text-xs text-agri-brown">
                    {quantity} {unit} × ₹{parseFloat(finalBid || 0).toLocaleString()}/unit
                  </p>
                  <p className="text-[10px] font-black text-amber-600 mt-0.5 flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Auction Win
                  </p>
                </div>
              </div>

              <div className="border-t border-agri-green/10 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-agri-brown">
                  <span>Winning bid</span>
                  <span className="font-semibold">₹{parseFloat(finalBid || 0).toLocaleString()}/unit</span>
                </div>
                <div className="flex justify-between text-agri-brown">
                  <span>Quantity</span>
                  <span className="font-semibold">{quantity} {unit}</span>
                </div>
                <div className="flex justify-between text-agri-brown">
                  <span>Shipping</span>
                  <span className="font-semibold text-agri-green">Free</span>
                </div>
                <div className="flex justify-between font-black text-agri-green-dark dark:text-agri-green-light text-sm pt-1 border-t border-agri-green/10">
                  <span>Total</span>
                  <span>₹{parseFloat(totalAmount || 0).toLocaleString()}</span>
                </div>
              </div>
            </Card>

            {/* Trust strip */}
            <div className="p-4 rounded-2xl bg-agri-green/5 border border-agri-green/10 space-y-2">
              {[
                { icon: ShieldCheck, text: "Escrow-secured payment" },
                { icon: Truck, text: "Farmer ships after payment" },
                { icon: CheckCircle2, text: "You confirm delivery to release funds" }
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-xs text-agri-brown font-semibold">
                  <Icon className="w-3.5 h-3.5 text-agri-green shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
