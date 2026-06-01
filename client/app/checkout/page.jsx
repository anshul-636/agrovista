"use client";

import React, { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { ArrowLeft, Landmark, CreditCard, ShieldCheck, MapPin, Truck, Check } from "lucide-react";
import Header from "../../components/shared/Header";
import Button from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import { useCartStore } from "../../store/cartStore";
import { useAuthStore } from "../../store/authStore";
import { apiService } from "../../lib/api";
import { toast } from "sonner";
import RawImage from "../../components/ui/RawImage";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuthStore();
  const { items, clearCart, getTotals } = useCartStore();

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1); // 1: Shipping Address, 2: Payment Method, 3: Review
  
  // Shipping details state
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("ONLINE"); // ONLINE (Razorpay) or COD
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      toast.error("Please log in to proceed with checkout.");
      router.push("/login");
    }
  }, [mounted, isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (mounted && !authLoading && items.length === 0) {
      toast.info("Your cart is empty. Add crops before checking out.");
      router.push("/products");
    }
  }, [mounted, authLoading, items, router]);

  if (!mounted || authLoading || items.length === 0) {
    return (
      <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col">
        <Header />
        <div className="max-w-7xl mx-auto p-8 w-full space-y-6 animate-pulse flex-1">
          <div className="h-8 w-48 bg-gray-200 dark:bg-zinc-800 rounded" />
          <div className="h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  const { subtotal, shippingFee, tax, total } = getTotals();

  const validateAddress = () => {
    if (!street || !city || !state || !pincode || !phone) {
      toast.error("Please fill in all shipping details");
      return false;
    }
    if (phone.length < 10) {
      toast.error("Please enter a valid phone number");
      return false;
    }
    if (pincode.length < 6) {
      toast.error("Please enter a valid pincode");
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!validateAddress()) return;
    }
    setStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setStep((prev) => prev - 1);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!validateAddress()) return;

    setIsSubmitting(true);
    const orderData = {
      items: items.map((item) => ({
        productId: item.product.id || item.product._id,
        quantity: item.quantity
      })),
      paymentMethod,
      shippingAddress: { street, city, state, pincode, phone },
      deliveryNotes: deliveryNotes || undefined
    };

    try {
      const response = await apiService.createCheckoutOrder(orderData);
      
      if (!response.success) {
        throw new Error(response.message || "Failed to create checkout order");
      }

      const { order, rzpOrder, keyId } = response.data || {};

      if (paymentMethod === "COD") {
        clearCart();
        toast.success("Order placed successfully via Cash on Delivery!");
        router.push(`/checkout/success?orderId=${order._id || order.id}&method=COD`);
      } else {
        // ONLINE Payment via Razorpay
        if (!scriptLoaded && !window.Razorpay) {
          toast.error("Payment SDK is loading, please try again in a few seconds.");
          setIsSubmitting(false);
          return;
        }

        const options = {
          key: keyId,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          name: "AgroVista Direct",
          description: "Crop Escrow Checkout",
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
                clearCart();
                toast.success("Escrow payment verified! Order placed successfully.");
                router.push(`/checkout/success?orderId=${order._id || order.id}&paymentId=${response.razorpay_payment_id}`);
              } else {
                toast.error("Payment verification failed. Please contact support.");
                router.push(`/checkout/failed?orderId=${order._id || order.id}`);
              }
            } catch (err) {
              toast.dismiss();
              toast.error("Signature verification failed: " + (err?.response?.data?.message || err.message));
              router.push(`/checkout/failed?orderId=${order._id || order.id}`);
            }
          },
          prefill: {
            name: user.name,
            email: user.email,
            contact: phone
          },
          notes: {
            address: `${street}, ${city}, ${state} - ${pincode}`
          },
          theme: {
            color: "#2E7D32"
          },
          modal: {
            ondismiss: function () {
              setIsSubmitting(false);
              toast.info("Payment window closed. Order remains pending.");
              router.push(`/checkout/failed?orderId=${order._id || order.id}`);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Order placement failed.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 text-current transition-colors pb-16 flex flex-col">
      <Header />
      
      {/* Load Razorpay script dynamically */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setScriptLoaded(true)}
        onError={() => toast.error("Failed to load Razorpay payment SDK.")}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 flex-1 w-full">
        {/* Back Link */}
        <button
          onClick={() => {
            if (step > 1) handlePrevStep();
            else router.push("/cart");
          }}
          className="inline-flex items-center gap-2 text-xs font-bold text-agri-brown hover:text-agri-green transition"
        >
          <ArrowLeft className="w-4 h-4" /> {step > 1 ? "Previous step" : "Return to Cart"}
        </button>

        {/* Wizard Steps indicator */}
        <div className="flex items-center justify-center max-w-lg mx-auto py-2">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition ${
                    step >= s
                      ? "bg-agri-green text-white shadow-md shadow-agri-green/10"
                      : "bg-white/40 dark:bg-zinc-900 text-gray-400 border border-agri-green/10"
                  }`}
                >
                  {step > s ? <Check className="w-4.5 h-4.5" /> : s}
                </div>
                <span
                  className={`ml-2 text-xs font-bold ${
                    step >= s ? "text-agri-green-dark dark:text-agri-green-light" : "text-gray-400"
                  }`}
                >
                  {s === 1 ? "Address" : s === 2 ? "Payment" : "Review"}
                </span>
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-0.5 mx-4 min-w-[30px] rounded-full transition ${
                    step > s ? "bg-agri-green" : "bg-agri-green/10"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left panel: Wizard forms */}
          <div className="lg:col-span-8">
            <Card className="border-agri-green/5 p-6 sm:p-8 space-y-6">
              
              {/* STEP 1: Shipping Address */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-black text-agri-green-dark dark:text-agri-green-light">
                      Shipping Details
                    </h2>
                    <p className="text-xs text-agri-brown mt-0.5">
                      Specify the destination hub/warehouse address for crop consignment.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Input
                        label="Street / Landmark Address"
                        placeholder="e.g. 102, Green Valley warehouse near APMC market"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        required
                      />
                    </div>
                    <Input
                      label="City / Town"
                      placeholder="e.g. Nashik"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                    <Input
                      label="State"
                      placeholder="e.g. Maharashtra"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                    />
                    <Input
                      label="Pincode (Postal Code)"
                      placeholder="e.g. 422001"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      required
                    />
                    <Input
                      label="Contact Phone Number"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-agri-green uppercase">Delivery Instructions (Optional)</label>
                    <textarea
                      rows={3}
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="Provide gates codes, timing restrictions, or forklift availability details..."
                      className="w-full px-4 py-3 rounded-2xl border text-sm bg-white/60 dark:bg-black/30 border-agri-green/10 focus:outline-none focus:ring-2 focus:ring-agri-green/20 resize-none"
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button onClick={handleNextStep} variant="primary" className="px-6 rounded-xl font-bold py-2.5">
                      Continue to Payment
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2: Payment Method */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-black text-agri-green-dark dark:text-agri-green-light">
                      Choose Settlement Method
                    </h2>
                    <p className="text-xs text-agri-brown mt-0.5">
                      Select how you want to transact funds for this direct trade contract.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Razorpay Online Option */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("ONLINE")}
                      className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition ${
                        paymentMethod === "ONLINE"
                          ? "border-agri-green bg-agri-green/5 ring-1 ring-agri-green"
                          : "border-agri-green/10 bg-white/40 hover:bg-white"
                      }`}
                    >
                      <div className="p-2.5 bg-agri-green/10 rounded-xl text-agri-green shrink-0">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-agri-green-dark dark:text-agri-green-light">
                          Online Payment (UPI, Cards, NetBanking)
                        </h4>
                        <p className="text-[11px] text-agri-brown mt-1 leading-relaxed">
                          Secure instant escrow reservation via **Razorpay**. Funds locked until delivery confirmation.
                        </p>
                        <span className="inline-block mt-2.5 text-[9px] font-black uppercase tracking-wider bg-agri-green text-white px-2 py-0.5 rounded-full">
                          Default (Recommended)
                        </span>
                      </div>
                    </button>

                    {/* Cash on Delivery Option */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("COD")}
                      className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition ${
                        paymentMethod === "COD"
                          ? "border-agri-green bg-agri-green/5 ring-1 ring-agri-green"
                          : "border-agri-green/10 bg-white/40 hover:bg-white"
                      }`}
                    >
                      <div className="p-2.5 bg-agri-green/10 rounded-xl text-agri-green shrink-0">
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-agri-green-dark dark:text-agri-green-light">
                          Cash on Delivery (COD)
                        </h4>
                        <p className="text-[11px] text-agri-brown mt-1 leading-relaxed">
                          Pay directly to the transporter or farmer upon grading and receiving the crop lot at your destination.
                        </p>
                        <span className="inline-block mt-2.5 text-[9px] font-black uppercase tracking-wider bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                          COD Available
                        </span>
                      </div>
                    </button>
                  </div>

                  <div className="pt-4 flex justify-between">
                    <Button onClick={handlePrevStep} variant="outline" className="px-6 rounded-xl font-bold py-2.5">
                      Back
                    </Button>
                    <Button onClick={handleNextStep} variant="primary" className="px-6 rounded-xl font-bold py-2.5">
                      Proceed to Review
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: Order Review */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-black text-agri-green-dark dark:text-agri-green-light">
                      Contract Review
                    </h2>
                    <p className="text-xs text-agri-brown mt-0.5">
                      Inspect the shipping address and order details before launching transaction.
                    </p>
                  </div>

                  {/* Summary grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-agri-green/5 p-5 rounded-2xl border border-agri-green/10 text-xs">
                    <div>
                      <p className="text-[10px] text-agri-brown uppercase font-bold mb-1.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-agri-green" /> Shipping Hub Address
                      </p>
                      <p className="font-extrabold text-agri-green-dark dark:text-agri-green-light">{street}</p>
                      <p className="text-agri-brown">{city}, {state} - {pincode}</p>
                      <p className="text-agri-brown mt-1">Phone: {phone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-agri-brown uppercase font-bold mb-1.5 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-agri-green" /> Payment Method
                      </p>
                      <p className="font-extrabold text-agri-green-dark dark:text-agri-green-light">
                        {paymentMethod === "ONLINE" ? "Razorpay Secure Escrow" : "Cash on Delivery (COD)"}
                      </p>
                      <p className="text-agri-brown leading-relaxed mt-1">
                        {paymentMethod === "ONLINE"
                          ? "Funds are securely reserved and will only be disbursed when you confirm delivery."
                          : "Transact cash/UPI directly with logistics providers upon receipt."}
                      </p>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="space-y-2">
                    <p className="text-[10px] text-agri-brown uppercase font-bold mb-1">Trade Items</p>
                    <div className="divide-y divide-agri-green/5">
                      {items.map((item) => (
                        <div key={item.product.id || item.product._id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-agri-green-dark dark:text-agri-green-light">{item.product.name}</span>
                            <span className="text-agri-brown ml-1">x {item.quantity} kg</span>
                          </div>
                          <span className="font-extrabold text-agri-green">₹{(item.product.price * item.quantity).toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between">
                    <Button onClick={handlePrevStep} variant="outline" className="px-6 rounded-xl font-bold py-2.5" disabled={isSubmitting}>
                      Back
                    </Button>
                    <Button
                      onClick={handlePlaceOrder}
                      variant="primary"
                      className="px-8 rounded-xl font-bold py-2.5 flex items-center gap-1.5 shadow-md shadow-agri-green/10"
                      disabled={isSubmitting}
                    >
                      <ShieldCheck className="w-4.5 h-4.5" />
                      <span>{isSubmitting ? "Locking Deal..." : "Confirm & Commit Sourcing"}</span>
                    </Button>
                  </div>
                </div>
              )}

            </Card>
          </div>

          {/* Right panel: Cost summary breakdown */}
          <div className="lg:col-span-4 sticky top-24">
            <Card className="border-agri-green/5 p-6 space-y-5">
              <h3 className="text-sm font-black text-agri-green uppercase">
                Order Total Breakdown
              </h3>
              
              <div className="space-y-2.5 text-xs text-agri-brown font-semibold">
                <div className="flex justify-between">
                  <span>Crops Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transport Freight</span>
                  <span className="text-green-600 font-extrabold">Free Shipping</span>
                </div>
                <div className="flex justify-between">
                  <span>Market Cess / Tax (5%)</span>
                  <span>₹{tax.toLocaleString("en-IN")}</span>
                </div>
                <div className="h-px bg-agri-green/5 my-2" />
                <div className="flex justify-between text-base font-black text-agri-green-dark dark:text-white">
                  <span>Gross Commitment</span>
                  <span className="text-agri-green">₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
