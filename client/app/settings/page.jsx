"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
import { useAuthStore } from "../../store/authStore";
import { Sun, Moon, Bell, Shield, Eye, Settings, HelpCircle, Save } from "lucide-react";
import Header from "../../components/shared/Header";
import Sidebar from "../../components/shared/Sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { toast } from "sonner";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  
  // Settings checkbox states
  const [restockAlerts, setRestockAlerts] = useState(true);
  const [auctionAlerts, setAuctionAlerts] = useState(true);
  const [transitAlerts, setTransitAlerts] = useState(true);
  const [showLocation, setShowLocation] = useState(true);

  if (!user) return null;

  const handleSaveSettings = (e) => {
    e.preventDefault();
    toast.success("Preferences saved successfully!");
  };

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col text-current transition-colors">
      <Header />

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
              Account Settings
            </h1>
            <p className="text-xs sm:text-sm text-agri-brown mt-1">
              Customize portal theme preferences, alerts notifications, and privacy terms.
            </p>
          </div>

          <div className="max-w-3xl space-y-6">
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* 1. Theme Configuration Card */}
              <Card className="border-agri-green/5">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-agri-green flex items-center gap-2">
                    <Settings className="w-5 h-5 text-agri-green" /> Theme Settings
                  </CardTitle>
                  <CardDescription>Select app theme profile</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition ${
                        theme === "light"
                          ? "border-agri-green bg-agri-green/10 text-agri-green"
                          : "border-agri-green/15 bg-white/50 text-agri-brown hover:bg-white"
                      }`}
                    >
                      <Sun className="w-4.5 h-4.5" />
                      <span>Light Cream Theme</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition ${
                        theme === "dark"
                          ? "border-agri-green bg-agri-green/10 text-agri-green"
                          : "border-agri-green/15 bg-white/50 text-agri-brown hover:bg-white"
                      }`}
                    >
                      <Moon className="w-4.5 h-4.5" />
                      <span>Dark Forest Theme</span>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Notification alerts */}
              <Card className="border-agri-green/5">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-agri-green flex items-center gap-2">
                    <Bell className="w-5 h-5 text-agri-green" /> Alert Notifications
                  </CardTitle>
                  <CardDescription>Select which updates to receive via websocket toasts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer text-xs font-semibold text-agri-brown">
                    <input
                      type="checkbox"
                      checked={restockAlerts}
                      onChange={(e) => setRestockAlerts(e.target.checked)}
                      className="rounded border-agri-green/20 text-agri-green focus:ring-agri-green w-4.5 h-4.5 mt-0.5"
                    />
                    <div>
                      <p className="text-agri-green-dark dark:text-agri-green-light font-bold">Smart Watchlist Alerts</p>
                      <p className="text-[10px] text-agri-brown-light mt-0.5">Receive alert sound/toast when watched crops are restocked by farmers.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer text-xs font-semibold text-agri-brown">
                    <input
                      type="checkbox"
                      checked={auctionAlerts}
                      onChange={(e) => setAuctionAlerts(e.target.checked)}
                      className="rounded border-agri-green/20 text-agri-green focus:ring-agri-green w-4.5 h-4.5 mt-0.5"
                    />
                    <div>
                      <p className="text-agri-green-dark dark:text-agri-green-light font-bold">Bidding Competition Alerts</p>
                      <p className="text-[10px] text-agri-brown-light mt-0.5">Receive alert sound/toast when your bid in an active room is exceeded by competitor buyers.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer text-xs font-semibold text-agri-brown">
                    <input
                      type="checkbox"
                      checked={transitAlerts}
                      onChange={(e) => setTransitAlerts(e.target.checked)}
                      className="rounded border-agri-green/20 text-agri-green focus:ring-agri-green w-4.5 h-4.5 mt-0.5"
                    />
                    <div>
                      <p className="text-agri-green-dark dark:text-agri-green-light font-bold">Transit Status Progress</p>
                      <p className="text-[10px] text-agri-brown-light mt-0.5">Receive immediate dashboard updates when order statuses transition from approved to delivered.</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* 3. Privacy preferences */}
              <Card className="border-agri-green/5">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-agri-green flex items-center gap-2">
                    <Shield className="w-5 h-5 text-agri-green" /> Trust & Privacy
                  </CardTitle>
                  <CardDescription>Configure public statistics filters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer text-xs font-semibold text-agri-brown">
                    <input
                      type="checkbox"
                      checked={showLocation}
                      onChange={(e) => setShowLocation(e.target.checked)}
                      className="rounded border-agri-green/20 text-agri-green w-4.5 h-4.5 mt-0.5"
                    />
                    <div>
                      <p className="text-agri-green-dark dark:text-agri-green-light font-bold">Disclose Location Coordinates</p>
                      <p className="text-[10px] text-agri-brown-light mt-0.5">Let commercial buyers discover your farm on the satellite crop locator map.</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-1.5"
              >
                <Save className="w-4.5 h-4.5" />
                <span>Save preferences</span>
              </Button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
