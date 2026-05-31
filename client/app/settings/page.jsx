"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import {
  Sun,
  Moon,
  Bell,
  Shield,
  Settings,
  Save,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Trash2,
  ChevronRight,
  Smartphone,
  Globe,
  ShoppingBag,
  Landmark,
  Truck,
} from "lucide-react";
import Header from "../../components/shared/Header";
import Sidebar from "../../components/shared/Sidebar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { toast } from "sonner";
import { motion } from "framer-motion";

// ─── Styled toggle switch ─────────────────────────────────────────────────────
function Toggle({ checked, onChange, id }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${
        checked ? "bg-agri-green" : "bg-agri-brown/20 dark:bg-zinc-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ─── Notification row ─────────────────────────────────────────────────────────
function NotifRow({ icon: Icon, label, description, checked, onChange, id }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-agri-green/5 last:border-none">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-agri-green/10 text-agri-green flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <label
            htmlFor={id}
            className="text-xs font-bold text-agri-green-dark dark:text-agri-green-light cursor-pointer"
          >
            {label}
          </label>
          <p className="text-[10px] text-agri-brown dark:text-gray-400 mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} id={id} />
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, description }) {
  return (
    <CardHeader>
      <CardTitle className="text-base font-bold text-agri-green flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-agri-green/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-agri-green" />
        </div>
        {title}
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  // Notification toggles
  const [restockAlerts, setRestockAlerts] = useState(true);
  const [auctionAlerts, setAuctionAlerts] = useState(true);
  const [transitAlerts, setTransitAlerts] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState(false);

  // Privacy
  const [showLocation, setShowLocation] = useState(true);
  const [showOrderHistory, setShowOrderHistory] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Danger zone confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!user) return null;

  const handleSavePrefs = (e) => {
    e.preventDefault();
    toast.success("Preferences saved successfully!");
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSavingPassword(true);
    try {
      // await apiService.changePassword({ currentPassword, newPassword });
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
    toast.success("Signed out successfully.");
  };

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col transition-colors">
      <Header />

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">

          {/* ── Page header ─────────────────────────────────────────────── */}
          <div>
            <h1 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
              Account Settings
            </h1>
            <p className="text-xs sm:text-sm text-agri-brown mt-1">
              Customize your theme, alerts, privacy, and security preferences.
            </p>
          </div>

          <div className="max-w-2xl space-y-6">
            <form onSubmit={handleSavePrefs} className="space-y-6">

              {/* ── 1. Theme ─────────────────────────────────────────────── */}
              <Card className="border-agri-green/5">
                <SectionHeader icon={Settings} title="Theme" description="Choose your preferred app appearance" />
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "light", icon: Sun,  label: "Light Cream" },
                      { value: "dark",  icon: Moon, label: "Dark Forest" },
                    ].map(({ value, icon: Icon, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTheme(value)}
                        className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                          theme === value
                            ? "border-agri-green bg-agri-green/10 text-agri-green shadow-sm shadow-agri-green/10"
                            : "border-agri-green/10 bg-white/50 dark:bg-zinc-900 text-agri-brown hover:border-agri-green/25 hover:bg-agri-green/5"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                        {theme === value && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-agri-green" />
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* ── 2. Notifications ─────────────────────────────────────── */}
              <Card className="border-agri-green/5">
                <SectionHeader
                  icon={Bell}
                  title="Alert Notifications"
                  description="Choose which events trigger real-time alerts"
                />
                <CardContent>
                  <NotifRow
                    icon={ShoppingBag}
                    id="restock"
                    label="Smart Watchlist Alerts"
                    description="Get notified when a watched crop is restocked by a farmer."
                    checked={restockAlerts}
                    onChange={setRestockAlerts}
                  />
                  <NotifRow
                    icon={Landmark}
                    id="auction"
                    label="Bidding Competition Alerts"
                    description="Know instantly when a competitor buyer outbids you in a live room."
                    checked={auctionAlerts}
                    onChange={setAuctionAlerts}
                  />
                  <NotifRow
                    icon={Truck}
                    id="transit"
                    label="Transit Status Updates"
                    description="Live dashboard updates as your order moves from approved to delivered."
                    checked={transitAlerts}
                    onChange={setTransitAlerts}
                  />
                  <NotifRow
                    icon={Globe}
                    id="email"
                    label="Weekly Email Digest"
                    description="A weekly summary of your orders, bids, and market activity."
                    checked={emailDigest}
                    onChange={setEmailDigest}
                  />
                  <NotifRow
                    icon={Smartphone}
                    id="sms"
                    label="SMS Order Alerts"
                    description="Receive critical order status changes via SMS to your registered number."
                    checked={smsAlerts}
                    onChange={setSmsAlerts}
                  />
                </CardContent>
              </Card>

              {/* ── 3. Privacy ────────────────────────────────────────────── */}
              <Card className="border-agri-green/5">
                <SectionHeader
                  icon={Shield}
                  title="Trust & Privacy"
                  description="Control what other users can see about you"
                />
                <CardContent>
                  <NotifRow
                    icon={Globe}
                    id="location"
                    label="Disclose Location Coordinates"
                    description="Let farmers and other buyers discover your area on the satellite map."
                    checked={showLocation}
                    onChange={setShowLocation}
                  />
                  <NotifRow
                    icon={ShoppingBag}
                    id="orders"
                    label="Show Order History Count"
                    description="Display your total order count on your public buyer profile."
                    checked={showOrderHistory}
                    onChange={setShowOrderHistory}
                  />
                </CardContent>
              </Card>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md shadow-agri-green/20"
              >
                <Save className="w-4 h-4" />
                Save Preferences
              </Button>
            </form>

            {/* ── 4. Change Password ────────────────────────────────────── */}
            <Card className="border-agri-green/5">
              <SectionHeader
                icon={Lock}
                title="Change Password"
                description="Update your account password"
              />
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="relative">
                    <Input
                      label="Current Password"
                      id="current-password"
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-4 top-[38px] text-agri-brown hover:text-agri-green transition"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="relative">
                    <Input
                      label="New Password"
                      id="new-password"
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-4 top-[38px] text-agri-brown hover:text-agri-green transition"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password strength indicator */}
                  {newPassword && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              newPassword.length >= i * 3
                                ? newPassword.length >= 12
                                  ? "bg-agri-green"
                                  : newPassword.length >= 8
                                  ? "bg-agri-wheat"
                                  : "bg-red-400"
                                : "bg-agri-green/10"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-agri-brown">
                        {newPassword.length < 8
                          ? "Too short — minimum 8 characters"
                          : newPassword.length < 12
                          ? "Good — consider making it longer"
                          : "Strong password ✓"}
                      </p>
                    </div>
                  )}

                  <Input
                    label="Confirm New Password"
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />

                  <Button
                    type="submit"
                    variant="secondary"
                    className="w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 border-agri-green/20"
                    disabled={savingPassword}
                  >
                    {savingPassword ? "Updating…" : <><Lock className="w-4 h-4" /> Update Password</>}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* ── 5. Sign out ───────────────────────────────────────────── */}
            <Card className="border-agri-green/5">
              <CardContent className="p-5">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-agri-green/5 text-agri-green-dark dark:text-gray-200 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-agri-green/10 text-agri-green flex items-center justify-center">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold">Sign Out</p>
                      <p className="text-[10px] text-agri-brown">
                        Signed in as {user.email}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-agri-brown group-hover:text-agri-green transition" />
                </button>
              </CardContent>
            </Card>

            {/* ── 6. Danger zone ────────────────────────────────────────── */}
            <Card className="border-red-500/10">
              <CardHeader>
                <CardTitle className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </div>
                  Danger Zone
                </CardTitle>
                <CardDescription>These actions are permanent and cannot be undone</CardDescription>
              </CardHeader>
              <CardContent>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-red-500/15 hover:bg-red-500/5 text-red-600 dark:text-red-400 transition group text-xs font-bold"
                  >
                    <span>Delete My Account</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-3"
                  >
                    <p className="text-xs font-bold text-red-600 dark:text-red-400">
                      Are you sure? This will permanently delete your account, orders, and all associated data.
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold border border-agri-green/20 text-agri-brown hover:bg-agri-green/5 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => toast.error("Account deletion is disabled in this demo.")}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition"
                      >
                        Yes, Delete Account
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
