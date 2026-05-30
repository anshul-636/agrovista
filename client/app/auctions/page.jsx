"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Landmark,
  Clock,
  PlusCircle,
  AlertCircle,
  ArrowRight,
  MapPin,
  Trophy,
  Lock,
  TimerReset,
} from "lucide-react";
import Header from "../../components/shared/Header";
import { Card } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { apiService } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import Link from "next/link";
import RawImage from "../../components/ui/RawImage";

const getAuctionPhase = (auction) => {
  if (!auction) return "upcoming";

  const now = new Date();
  const startTime = new Date(auction.startTime);
  const endTime = new Date(auction.endTime);

  if (auction.status === "ENDED" || auction.status === "CLOSED" || now >= endTime) return "past";
  if (auction.status === "LIVE" || (now >= startTime && now < endTime)) return "live";
  return "upcoming";
};

function CountdownTimer({ endTime }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(endTime) - new Date();
      if (difference <= 0) {
        setTimeLeft("Expired");
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
  }, [endTime]);

  return (
    <span className="font-extrabold text-red-500 flex items-center gap-1">
      <Clock className="w-3.5 h-3.5" /> {timeLeft}
    </span>
  );
}

function AuctionCard({ auction, phase }) {
  const isLive = phase === "live";
  const isUpcoming = phase === "upcoming";
  const isPast = phase === "past";

  return (
    <Card hoverEffect className="border-agri-green/5 p-6 flex flex-col justify-between h-[450px]">
      <div className="space-y-4">
        <div className="relative h-48 w-full rounded-2xl overflow-hidden bg-agri-green/10">
          <RawImage
            src={auction.image || auction.images?.[0] || "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=600"}
            alt={auction.productName || auction.product?.name || "Auction lot"}
            width={800}
            height={320}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {isLive && (
            <div className="absolute top-3 left-3 bg-red-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              LIVE BIDDING
            </div>
          )}

          {isUpcoming && (
            <div className="absolute top-3 left-3 bg-amber-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow">
              <Lock className="w-3 h-3" />
              UPCOMING
            </div>
          )}

          {isPast && (
            <div className="absolute top-3 left-3 bg-gray-900/90 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow">
              RESULT
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-1 text-agri-brown font-bold min-w-0">
              <MapPin className="w-3.5 h-3.5 text-agri-green shrink-0" />
              <span className="truncate">{auction.farmerLocation}</span>
            </div>
            {isLive ? (
              <CountdownTimer endTime={auction.endTime} />
            ) : isUpcoming ? (
              <span className="text-amber-600 font-extrabold text-[10px] uppercase">Starts soon</span>
            ) : (
              <span className="text-gray-500 font-extrabold text-[10px] uppercase">Closed</span>
            )}
          </div>

          <Link href={`/auctions/${auction.id}`}>
            <h4 className="text-base font-extrabold text-agri-green-dark dark:text-agri-green-light hover:underline truncate">
              {auction.productName}
            </h4>
          </Link>
          <p className="text-[10px] text-agri-brown">Farmer: {auction.farmerName}</p>
        </div>
      </div>

      <div className="border-t border-agri-green/5 pt-3 mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-4 bg-agri-green/5 dark:bg-white/5 p-3 rounded-xl text-xs font-semibold">
          <div>
            <span className="text-[9px] text-agri-brown font-bold uppercase">
              {isPast ? "Final Price" : isUpcoming ? "Starting Price" : "Current Bid"}
            </span>
            <p className="text-base font-black text-agri-green">
              ₹{isPast ? (auction.currentBid || auction.startingPrice) : isUpcoming ? auction.startingPrice : auction.currentBid}/kg
            </p>
          </div>
          <div>
            <span className="text-[9px] text-agri-brown font-bold uppercase block text-right">Lot Size</span>
            <p className="text-sm font-extrabold text-agri-green-dark dark:text-agri-green-light text-right">
              {auction.lotSize} {auction.unit}
            </p>
          </div>
        </div>

        {isLive ? (
          <Link href={`/auctions/${auction.id}`} className="block w-full">
            <Button variant="outline" className="w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1">
              Enter Auction Room <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        ) : isUpcoming ? (
          <div className="w-full rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-700 font-semibold">
            Bidding opens at {new Date(auction.startTime).toLocaleString()}
          </div>
        ) : (
          <Link href={`/auctions/${auction.id}`} className="block w-full">
            <Button variant="outline" className="w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1">
              View Result <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}

export default function AuctionsListingPage() {
  const { user, isAuthenticated } = useAuthStore();

  const { data: auctionsRes, isLoading } = useQuery({
    queryKey: ["auctions"],
    queryFn: () => apiService.getAuctions(),
  });

  const auctions = auctionsRes?.data || [];
  const groupedAuctions = useMemo(() => {
    const live = [];
    const upcoming = [];
    const past = [];

    auctions.forEach((auction) => {
      const phase = getAuctionPhase(auction);
      if (phase === "live") live.push(auction);
      else if (phase === "upcoming") upcoming.push(auction);
      else past.push(auction);
    });

    return { live, upcoming, past };
  }, [auctions]);

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 text-current transition-colors pb-16">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
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

        <div className="p-4 bg-agri-green/5 border border-agri-green/10 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-agri-green shrink-0 mt-0.5" />
          <p className="text-xs text-agri-brown dark:text-gray-300 leading-relaxed">
            Live auctions can be entered and bid on. Upcoming auctions are visible but locked until their start time. Past auctions show results only.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card rounded-[2rem] p-5 h-80 animate-pulse bg-gray-200 dark:bg-zinc-800" />
            ))}
          </div>
        ) : auctions.length === 0 ? (
          <div className="text-center py-20 bg-white/40 dark:bg-black/10 rounded-3xl border border-agri-green/5">
            <Landmark className="w-12 h-12 text-agri-brown mx-auto mb-4" />
            <h3 className="text-lg font-bold text-agri-green-dark">No Auctions Available</h3>
            <p className="text-xs text-agri-brown mt-1.5">Check back later for live, upcoming, or past auction results.</p>
          </div>
        ) : (
          <div className="space-y-10">
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h2 className="text-lg font-black text-agri-green-dark dark:text-agri-green-light">Live Auctions</h2>
              </div>
              {groupedAuctions.live.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-agri-green/10 bg-white/50 dark:bg-black/10 p-8 text-sm text-agri-brown">
                  No live auctions right now.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {groupedAuctions.live.map((auction) => (
                    <AuctionCard key={auction.id} auction={auction} phase="live" />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <TimerReset className="w-4 h-4 text-amber-600" />
                <h2 className="text-lg font-black text-agri-green-dark dark:text-agri-green-light">Upcoming Bidding</h2>
              </div>
              {groupedAuctions.upcoming.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-agri-green/10 bg-white/50 dark:bg-black/10 p-8 text-sm text-agri-brown">
                  No upcoming auctions scheduled.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {groupedAuctions.upcoming.map((auction) => (
                    <AuctionCard key={auction.id} auction={auction} phase="upcoming" />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-agri-green" />
                <h2 className="text-lg font-black text-agri-green-dark dark:text-agri-green-light">Past Results</h2>
              </div>
              {groupedAuctions.past.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-agri-green/10 bg-white/50 dark:bg-black/10 p-8 text-sm text-agri-brown">
                  No finished auctions yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {groupedAuctions.past.map((auction) => (
                    <AuctionCard key={auction.id} auction={auction} phase="past" />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
