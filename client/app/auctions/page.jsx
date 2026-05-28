"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Landmark, Clock, PlusCircle, AlertCircle, ArrowRight, MapPin } from "lucide-react";
import Header from "../../components/shared/Header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { apiService } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import Link from "next/link";

// Countdown Timer Component
function CountdownTimer({ endTime, onExpire }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(endTime) - new Date();
      if (difference <= 0) {
        setTimeLeft("Expired");
        if (onExpire) onExpire();
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);
      setTimeLeft(parts.join(" "));
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  return (
    <span className="font-extrabold text-red-500 flex items-center gap-1">
      <Clock className="w-3.5 h-3.5" /> {timeLeft}
    </span>
  );
}

export default function AuctionsListingPage() {
  const { user, isAuthenticated } = useAuthStore();

  // Fetch auctions
  const { data: auctionsRes, isLoading } = useQuery({
    queryKey: ["auctions"],
    queryFn: () => apiService.getAuctions(),
  });

  const auctions = auctionsRes?.data || [];

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 text-current transition-colors pb-16">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
              Live Bidding Arena
            </h1>
            <p className="text-xs sm:text-sm text-agri-brown mt-1">
              Participate in high-margin crop auctions in real-time.
            </p>
          </div>

          {isAuthenticated && user?.role === "FARMER" && (
            <Link href="/auctions/create">
              <Button variant="primary" className="flex items-center gap-1.5 py-2.5 rounded-xl text-xs">
                <PlusCircle className="w-4.5 h-4.5" />
                <span>Launch New Auction</span>
              </Button>
            </Link>
          )}
        </div>

        {/* Informative Alert */}
        <div className="p-4 bg-agri-green/5 border border-agri-green/10 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-agri-green shrink-0 mt-0.5" />
          <p className="text-xs text-agri-brown dark:text-gray-300 leading-relaxed">
            Every auction operates under **escrow trade assurance**. Bids represent committed contracts. Auction closes immediately when timers expire, auto-determining the highest buyer bid as the lot winner.
          </p>
        </div>

        {/* Auctions Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card rounded-[2rem] p-5 h-80 animate-pulse bg-gray-200 dark:bg-zinc-800" />
            ))}
          </div>
        ) : auctions.length === 0 ? (
          <div className="text-center py-20 bg-white/40 dark:bg-black/10 rounded-3xl border border-agri-green/5">
            <Landmark className="w-12 h-12 text-agri-brown mx-auto mb-4" />
            <h3 className="text-lg font-bold text-agri-green-dark">No Active Auctions</h3>
            <p className="text-xs text-agri-brown mt-1.5">Check back later for newly scheduled crop auctions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {auctions.map((auc) => (
              <Card key={auc.id} hoverEffect className="border-agri-green/5 p-6 flex flex-col justify-between h-[450px]">
                <div className="space-y-4">
                  {/* Image & Status banner */}
                  <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-agri-green/10">
                    <img 
                      src={auc.images?.[0] || auc.image || "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=600"} 
                      alt={auc.productName} 
                      className="absolute inset-0 w-full h-full object-cover" 
                    />
                    <div className="absolute top-3 left-3 bg-red-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                      LIVE BIDDING
                    </div>
                  </div>

                  {/* Lot Metadata */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-agri-brown font-bold">
                        <MapPin className="w-3.5 h-3.5 text-agri-green" />
                        <span>{auc.farmerLocation}</span>
                      </div>
                      <CountdownTimer endTime={auc.endTime} />
                    </div>
                    <Link href={`/auctions/${auc.id}`}>
                      <h4 className="text-base font-extrabold text-agri-green-dark dark:text-agri-green-light hover:underline truncate">
                        {auc.productName}
                      </h4>
                    </Link>
                    <p className="text-[10px] text-agri-brown">Farmer: {auc.farmerName}</p>
                  </div>
                </div>

                {/* Bidding detail blocks */}
                <div className="border-t border-agri-green/5 pt-3 mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4 bg-agri-green/5 dark:bg-white/5 p-3 rounded-xl text-xs font-semibold">
                    <div>
                      <span className="text-[9px] text-agri-brown font-bold uppercase">Current Bid</span>
                      <p className="text-base font-black text-agri-green">₹{auc.currentBid}/kg</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-agri-brown font-bold uppercase block text-right">Lot Size</span>
                      <p className="text-sm font-extrabold text-agri-green-dark dark:text-agri-green-light text-right">
                        {auc.lotSize} {auc.unit}
                      </p>
                    </div>
                  </div>

                  <Link href={`/auctions/${auc.id}`} className="block w-full">
                    <Button variant="outline" className="w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1">
                      Enter Auction Room <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
