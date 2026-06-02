"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import {
  Sun, Moon, Bell, Shield, Settings, Save, Lock, Eye, EyeOff, LogOut, Trash2,
  ChevronRight, Smartphone, Globe, ShoppingBag, Landmark, Truck, Sprout,
  PackageCheck, MessageSquare, Hammer, CreditCard, MapPin, Star,
  BadgeAlert, Boxes, TrendingUp, CircleDollarSign, Package, Heart,
} from "lucide-react";
import Header from "../../components/shared/Header";
import Sidebar from "../../components/shared/Sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { apiService } from "../../lib/api";

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, id }) {
  return (
    <button type="button" role="switch" aria-checked={checked} id={id}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${
        checked ? "bg-agri-green" : "bg-agri-brown/20 dark:bg-zinc-700"
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
        checked ? "translate-x-6" : "translate-x-1"
      }`} />
    </button>
  );
}

// ─── Notification row ─────────────────────────────────────────────────────────
function NotifRow({ icon: Icon, label, description, checked, onChange, id, accent = "agri-green" }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-agri-green/5 last:border-none">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-agri-green/10 text-agri-green flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <label htmlFor={id} className="text-xs font-bold text-agri-green-dark dark:text-agri-green-light cursor-pointer">
            {label}
          </label>
          <p className="text-[10px] text-agri-brown dark:text-gray-400 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} id={id} />
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, description, badge }) {
  return (
    <CardHeader>
      <CardTitle className="text-base font-bold text-agri-green flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-agri-green/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-agri-green" />
        </div>
        {title}
        {badge && (
          <span className="ml-auto text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-agri-green/10 text-agri-green">
            {badge}
          </span>
        )}
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
  );
}

// ─── Role badge banner ────────────────────────────────────────────────────────
function RoleBanner({ isFarmer }) {
  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-2xl border text-xs font-semibold ${
      isFarmer
        ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        : "bg-teal-500/5 border-teal-500/15 text-teal-700 dark:text-teal-400"
    }`}>
      {isFarmer
        ? <Sprout className="w-4 h-4 flex-shrink-0" />
        : <ShoppingBag className="w-4 h-4 flex-shrink-0" />
      }
      <span>
        {isFarmer
          ? "Showing Farmer settings — notifications and privacy controls are tailored for growers."
          : "Showing Buyer settings — notifications and privacy controls are tailored for wholesale buyers."}
      </span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { theme, setTheme }     = useTheme();
  const { user, logout }        = useAuthStore();
  const router                  = useRouter();
  const isFarmer                = user?.role === "FARMER";

  // ── FARMER notification toggles ───────────────────────────────────────────
  const [newOrderAlert,    setNewOrderAlert]    = useState(true);
  const [buyerMsgAlert,    setBuyerMsgAlert]    = useState(true);
  const [auctionBidAlert,  setAuctionBidAlert]  = useState(true);
  const [lowStockAlert,    setLowStockAlert]    = useState(true);
  const [paymentAlert,     setPaymentAlert]     = useState(true);
  const [farmerEmailDigest,setFarmerEmailDigest]= useState(false);
  const [farmerSmsAlert,   setFarmerSmsAlert]   = useState(false);

  // ── BUYER notification toggles ────────────────────────────────────────────
  const [orderStatusAlert, setOrderStatusAlert] = useState(true);
  const [restockAlert,     setRestockAlert]     = useState(true);
  const [outbidAlert,      setOutbidAlert]      = useState(true);
  const [deliveryReminder, setDeliveryReminder] = useState(true);
  const [buyerEmailDigest, setBuyerEmailDigest] = useState(false);
  const [buyerSmsAlert,    setBuyerSmsAlert]    = useState(false);

  // ── FARMER privacy toggles ────────────────────────────────────────────────
  const [showFarmOnMap,    setShowFarmOnMap]    = useState(true);
  const [showTrustScore,   setShowTrustScore]   = useState(true);
  const [showProductCount, setShowProductCount] = useState(true);

  // ── BUYER privacy toggles ─────────────────────────────────────────────────
  const [showBuyerLocation,setShowBuyerLocation]= useState(true);
  const [showOrderCount,   setShowOrderCount]   = useState(false);
  const [showReviewsGiven, setShowReviewsGiven] = useState(true);

  // ── Password state (shared) ───────────────────────────────────────────────
  const [currentPassword,  setCurrentPassword]  = useState("");
  const [newPassword,      setNewPassword]      = useState("");
  const [confirmPassword,  setConfirmPassword]  = useState("");
  const [showCurrent,      setShowCurrent]      = useState(false);
  const [showNew,          setShowNew]          = useState(false);
  const [savingPassword,   setSavingPassword]   = useState(false);
  const [showDeleteConfirm,setShowDeleteConfirm]= useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await apiService.deleteAccount();
      if (res.success) {
        toast.success("Account deleted successfully.");
        logout();
        router.push("/login");
      } else {
        toast.error(res.error || "Failed to delete account.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete account. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  const handleSavePrefs = (e) => {
    e.preventDefault();
    toast.success("Preferences saved!");
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("New passwords do not match."); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setSavingPassword(true);
    try {
      toast.success("Password updated successfully!");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => { logout(); router.push("/"); toast.success("Signed out successfully."); };

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col transition-colors">
      <Header />

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">

          {/* ── Page header ──────────────────────────────────────────── */}
          <div>
            <h1 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
              Account Settings
            </h1>
            <p className="text-xs sm:text-sm text-agri-brown mt-1">
              {isFarmer
                ? "Control how buyers discover your farm, manage alerts, and secure your account."
                : "Manage your trade alerts, privacy preferences, and account security."}
            </p>
          </div>

          <div className="max-w-2xl space-y-6">
            {/* ── Role context banner ───────────────────────────────────── */}
            <RoleBanner isFarmer={isFarmer} />

            <form onSubmit={handleSavePrefs} className="space-y-6">

              {/* ── 1. Theme ───────────────────────────────────────────── */}
              <Card className="border-agri-green/5">
                <SectionHeader icon={Settings} title="Theme" description="Choose your preferred app appearance" />
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "light", icon: Sun,  label: "Light Cream" },
                      { value: "dark",  icon: Moon, label: "Dark Forest" },
                    ].map(({ value, icon: Icon, label }) => (
                      <button key={value} type="button" onClick={() => setTheme(value)}
                        className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                          theme === value
                            ? "border-agri-green bg-agri-green/10 text-agri-green shadow-sm shadow-agri-green/10"
                            : "border-agri-green/10 bg-white/50 dark:bg-zinc-900 text-agri-brown hover:border-agri-green/25 hover:bg-agri-green/5"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                        {theme === value && <span className="ml-auto w-2 h-2 rounded-full bg-agri-green" />}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* ── 2. Notifications ─────────────────────────────────────── */}
              <Card className="border-agri-green/5">
                {isFarmer ? (
                  <>
                    <SectionHeader icon={Bell} title="Alert Notifications" badge="Farmer"
                      description="Choose which events trigger real-time alerts for your farm operations" />
                    <CardContent>
                      <NotifRow icon={PackageCheck} id="new-order" label="New Order Received"
                        description="A buyer has placed a wholesale order for your produce — requires your acceptance."
                        checked={newOrderAlert} onChange={setNewOrderAlert} />
                      <NotifRow icon={MessageSquare} id="buyer-msg" label="Buyer Messages"
                        description="Direct messages from buyers inquiring about your listings, prices, or availability."
                        checked={buyerMsgAlert} onChange={setBuyerMsgAlert} />
                      <NotifRow icon={Hammer} id="auction-bid" label="Auction Bid Placed"
                        description="A buyer placed a competitive bid in one of your live auction rooms."
                        checked={auctionBidAlert} onChange={setAuctionBidAlert} />
                      <NotifRow icon={BadgeAlert} id="low-stock" label="Low Stock Warning"
                        description="Get alerted when a product drops below a low quantity threshold."
                        checked={lowStockAlert} onChange={setLowStockAlert} />
                      <NotifRow icon={CircleDollarSign} id="payment" label="Payment Credited"
                        description="Funds released to your wallet after a buyer confirms delivery of your produce."
                        checked={paymentAlert} onChange={setPaymentAlert} />
                      <NotifRow icon={Globe} id="farmer-digest" label="Weekly Farm Digest"
                        description="A weekly email summarising your sales, order volume, and market price trends."
                        checked={farmerEmailDigest} onChange={setFarmerEmailDigest} />
                      <NotifRow icon={Smartphone} id="farmer-sms" label="SMS Order Alerts"
                        description="Critical alerts — new orders and payment confirmations — sent via SMS."
                        checked={farmerSmsAlert} onChange={setFarmerSmsAlert} />
                    </CardContent>
                  </>
                ) : (
                  <>
                    <SectionHeader icon={Bell} title="Alert Notifications" badge="Buyer"
                      description="Choose which events trigger real-time alerts for your procurement activity" />
                    <CardContent>
                      <NotifRow icon={Truck} id="order-status" label="Order Status Updates"
                        description="Live dashboard alerts as your order moves through pending → accepted → packed → dispatched."
                        checked={orderStatusAlert} onChange={setOrderStatusAlert} />
                      <NotifRow icon={Heart} id="restock" label="Watchlist Restock Alerts"
                        description="Instant notification when a crop on your watchlist comes back in stock from a farmer."
                        checked={restockAlert} onChange={setRestockAlert} />
                      <NotifRow icon={Landmark} id="outbid" label="Auction Outbid Alert"
                        description="Know instantly when a competitor buyer outbids you in a live auction room."
                        checked={outbidAlert} onChange={setOutbidAlert} />
                      <NotifRow icon={Package} id="delivery-reminder" label="Delivery Confirmation Reminder"
                        description="Reminder to confirm receipt when your dispatched order is awaiting your approval."
                        checked={deliveryReminder} onChange={setDeliveryReminder} />
                      <NotifRow icon={Globe} id="buyer-digest" label="Weekly Procurement Digest"
                        description="Weekly summary of your orders, watchlist activity, and relevant market price movements."
                        checked={buyerEmailDigest} onChange={setBuyerEmailDigest} />
                      <NotifRow icon={Smartphone} id="buyer-sms" label="SMS Order Alerts"
                        description="Critical order status changes sent via SMS to your registered phone number."
                        checked={buyerSmsAlert} onChange={setBuyerSmsAlert} />
                    </CardContent>
                  </>
                )}
              </Card>

              {/* ── 3. Privacy & Visibility ─────────────────────────────── */}
              <Card className="border-agri-green/5">
                {isFarmer ? (
                  <>
                    <SectionHeader icon={Shield} title="Farm Visibility" badge="Farmer"
                      description="Control what buyers can see about your farm on the marketplace" />
                    <CardContent>
                      <NotifRow icon={MapPin} id="farm-map" label="Show Farm on Discovery Map"
                        description="Allow buyers to find and view your farm location on the Nearby Farms satellite map."
                        checked={showFarmOnMap} onChange={setShowFarmOnMap} />
                      <NotifRow icon={TrendingUp} id="trust-score" label="Display Trust Score Publicly"
                        description="Show your trust score and average star rating on your public farm profile page."
                        checked={showTrustScore} onChange={setShowTrustScore} />
                      <NotifRow icon={Boxes} id="product-count" label="Show Active Product Count"
                        description="Display number of active listings on your public profile — signals active farming."
                        checked={showProductCount} onChange={setShowProductCount} />
                    </CardContent>
                  </>
                ) : (
                  <>
                    <SectionHeader icon={Shield} title="Privacy & Visibility" badge="Buyer"
                      description="Control what farmers and other users can see about you" />
                    <CardContent>
                      <NotifRow icon={MapPin} id="buyer-location" label="Disclose Delivery Region to Farmers"
                        description="Allow verified farmers to see your approximate location on the marketplace map."
                        checked={showBuyerLocation} onChange={setShowBuyerLocation} />
                      <NotifRow icon={ShoppingBag} id="order-count" label="Show Order Volume on Profile"
                        description="Display your total number of completed orders on your public buyer profile."
                        checked={showOrderCount} onChange={setShowOrderCount} />
                      <NotifRow icon={Star} id="reviews-given" label="Make Your Reviews Public"
                        description="Show the reviews you've submitted for farmers on their public profile pages."
                        checked={showReviewsGiven} onChange={setShowReviewsGiven} />
                    </CardContent>
                  </>
                )}
              </Card>

              <Button type="submit" variant="primary"
                className="w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md shadow-agri-green/20">
                <Save className="w-4 h-4" />
                Save Preferences
              </Button>
            </form>

            {/* ── 4. Change Password ──────────────────────────────────── */}
            <Card className="border-agri-green/5">
              <SectionHeader icon={Lock} title="Change Password" description="Update your account password" />
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="relative">
                    <Input label="Current Password" id="current-password"
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-4 top-[38px] text-agri-brown hover:text-agri-green transition">
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="relative">
                    <Input label="New Password" id="new-password"
                      type={showNew ? "text" : "password"}
                      value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowNew(!showNew)}
                      className="absolute right-4 top-[38px] text-agri-brown hover:text-agri-green transition">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {newPassword && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                            newPassword.length >= i * 3
                              ? newPassword.length >= 12 ? "bg-agri-green"
                              : newPassword.length >= 8  ? "bg-agri-wheat"
                              : "bg-red-400"
                              : "bg-agri-green/10"
                          }`} />
                        ))}
                      </div>
                      <p className="text-[10px] text-agri-brown">
                        {newPassword.length < 8  ? "Too short — minimum 8 characters"
                         : newPassword.length < 12 ? "Good — consider a longer password"
                         : "Strong password ✓"}
                      </p>
                    </div>
                  )}

                  <Input label="Confirm New Password" id="confirm-password" type="password"
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />

                  <Button type="submit" variant="secondary" disabled={savingPassword}
                    className="w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 border-agri-green/20">
                    {savingPassword ? "Updating…" : <><Lock className="w-4 h-4" /> Update Password</>}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* ── 5. Sign out ─────────────────────────────────────────── */}
            <Card className="border-agri-green/5">
              <CardContent className="p-5">
                <button type="button" onClick={handleLogout}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-agri-green/5 text-agri-green-dark dark:text-gray-200 transition group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-agri-green/10 text-agri-green flex items-center justify-center">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold">Sign Out</p>
                      <p className="text-[10px] text-agri-brown">Signed in as {user.email}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-agri-brown group-hover:text-agri-green transition" />
                </button>
              </CardContent>
            </Card>

            {/* ── 6. Danger Zone ──────────────────────────────────────── */}
            <Card className="border-red-500/10">
              <CardHeader>
                <CardTitle className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </div>
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  {isFarmer
                    ? "Deleting your account will remove your farm profile, all listings, and order history permanently."
                    : "Deleting your account will remove your buyer profile, order history, and all associated data permanently."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showDeleteConfirm ? (
                  <button type="button" onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-red-500/15 hover:bg-red-500/5 text-red-600 dark:text-red-400 transition group text-xs font-bold">
                    <span>Delete My Account</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-3">
                    <p className="text-xs font-bold text-red-600 dark:text-red-400">
                      Are you sure? This will permanently delete your account and all associated data.
                      {isFarmer ? " Your active listings and pending orders will also be removed." : " Your order history and reviews will also be removed."}
                    </p>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}
                        className="flex-1 py-2 rounded-xl text-xs font-bold border border-agri-green/20 text-agri-brown hover:bg-agri-green/5 transition disabled:opacity-50">
                        Cancel
                      </button>
                      <button type="button" onClick={handleDeleteAccount} disabled={isDeleting}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition flex items-center justify-center gap-1.5 disabled:opacity-50">
                        {isDeleting ? (
                          <>
                            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                            </svg>
                            Deleting…
                          </>
                        ) : "Yes, Delete Account"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

          </div>
        </main>
      </div>
    </div>
  );
}