"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Trash2,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Users,
  Gavel,
  X,
  TriangleAlert,
  BadgeCheck,
  Zap,
} from "lucide-react";
import Header from "../../components/shared/Header";
import { Card } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { apiService } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import Link from "next/link";
import RawImage from "../../components/ui/RawImage";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ─── Phase helper ─────────────────────────────────────────────────────────────
const getAuctionPhase = (auction) => {
  if (!auction) return "upcoming";
  const now = new Date();
  const start = new Date(auction.startTime);
  const end = new Date(auction.endTime);
  if (auction.status === "ENDED" || auction.status === "CLOSED" || now >= end) return "past";
  if (auction.status === "LIVE" || (now >= start && now < end)) return "live";
  return "upcoming";
};

// ─── Countdown ────────────────────────────────────────────────────────────────
function Countdown({ endTime, urgent }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const calc = () => {
      const diff = new Date(endTime) - new Date();
      if (diff <= 0) { setTimeLeft("Expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft([h > 0 && `${h}h`, `${m}m`, `${s}s`].filter(Boolean).join(" "));
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return (
    <span className={`font-extrabold flex items-center gap-1 ${urgent ? "text-red-500 animate-pulse" : "text-red-500"}`}>
      <Clock className="w-3.5 h-3.5" /> {timeLeft}
    </span>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────
function DeleteModal({ auction, onConfirm, onCancel, isPending }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-zinc-900 rounded-3xl border border-agri-green/10 p-6 max-w-sm w-full shadow-2xl space-y-4"
      >
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
          <Trash2 className="w-7 h-7 text-red-500" />
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="text-base font-black text-agri-green-dark dark:text-white">
            Delete this auction?
          </h3>
          <p className="text-xs font-bold text-agri-green">
            {auction?.productName}
          </p>
          <p className="text-xs text-agri-brown leading-relaxed mt-1">
            This will permanently remove the auction and all associated bids. This action cannot be undone.
          </p>
        </div>

        <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-3 flex items-start gap-2">
          <TriangleAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
            Only upcoming auctions can be deleted. Live auctions cannot be cancelled once bidding has started.
          </p>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-2xl text-xs font-bold border border-agri-green/15 text-agri-brown hover:bg-agri-green/5 transition disabled:opacity-50"
          >
            Keep Auction
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-2xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {isPending ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Deleting…
              </>
            ) : (
              <><Trash2 className="w-3.5 h-3.5" /> Delete</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-2.5 bg-white/60 dark:bg-zinc-900/60 border border-agri-green/5 rounded-2xl px-4 py-3">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-lg font-black text-agri-green-dark dark:text-white leading-none">{value}</p>
        <p className="text-[10px] text-agri-brown font-bold mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Auction card ─────────────────────────────────────────────────────────────
function AuctionCard({ auction, phase, isFarmerOwner, onDeleteClick }) {
  const isLive = phase === "live";
  const isUpcoming = phase === "upcoming";
  const isPast = phase === "past";
  const urgent = isLive && (new Date(auction.endTime) - new Date()) < 1800000; // <30 min

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        hoverEffect
        className={`border-agri-green/5 p-5 flex flex-col justify-between h-[460px] relative overflow-hidden ${
          isLive ? "ring-1 ring-red-500/20" : ""
        }`}
      >
        {/* ✅ DELETE button — farmer owner on UPCOMING or PAST auctions */}
        {isFarmerOwner && (isUpcoming || isPast) && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onDeleteClick(auction); }}
            title="Delete this upcoming auction"
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-red-500 flex items-center justify-center transition-all duration-200 group shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 🔒 LIVE lock — farmer can see but NOT delete */}
        {isFarmerOwner && isLive && (
          <div
            title="Live auctions cannot be deleted"
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-xl bg-zinc-500/10 text-zinc-400 border border-zinc-500/10 flex items-center justify-center cursor-not-allowed"
          >
            <Lock className="w-3.5 h-3.5" />
          </div>
        )}

        <div className="space-y-4">
          {/* Image */}
          <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-agri-green/10">
            <RawImage
              src={auction.image || auction.images?.[0] || "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=600"}
              alt={auction.productName || "Auction lot"}
              width={800} height={320}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

            {isLive && (
              <div className="absolute top-2.5 left-2.5 bg-red-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                LIVE BIDDING
              </div>
            )}
            {isUpcoming && (
              <div className="absolute top-2.5 left-2.5 bg-amber-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow">
                <Lock className="w-3 h-3" /> UPCOMING
              </div>
            )}
            {isPast && (
              <div className="absolute top-2.5 left-2.5 bg-zinc-900/80 text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow">
                ENDED
              </div>
            )}

            {/* Bid count badge */}
            {auction.bidCount > 0 && (
              <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Users className="w-2.5 h-2.5" /> {auction.bidCount} bids
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="space-y-1 pr-2">
            <div className="flex items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-1 text-agri-brown font-semibold min-w-0">
                <MapPin className="w-3.5 h-3.5 text-agri-green shrink-0" />
                <span className="truncate">{auction.farmerLocation}</span>
              </div>
              {isLive ? (
                <Countdown endTime={auction.endTime} urgent={urgent} />
              ) : isUpcoming ? (
                <span className="text-amber-600 font-extrabold text-[10px] uppercase whitespace-nowrap">Starts soon</span>
              ) : (
                <span className="text-zinc-400 font-bold text-[10px] uppercase">Closed</span>
              )}
            </div>

            <Link href={`/auctions/${auction.id}`}>
              <h4 className="text-sm font-black text-agri-green-dark dark:text-agri-green-light hover:underline truncate leading-tight">
                {auction.productName}
              </h4>
            </Link>
            <p className="text-[10px] text-agri-brown flex items-center gap-1.5 flex-wrap">
              by {auction.farmerName}
              {auction.farmerVerified && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-agri-green/10 text-agri-green border border-agri-green/20">
                  <BadgeCheck className="w-2.5 h-2.5" /> Verified
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Bottom section */}
        <div className="border-t border-agri-green/5 pt-3 mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3 bg-agri-green/5 dark:bg-white/5 p-3 rounded-xl">
            <div>
              <span className="text-[9px] text-agri-brown font-bold uppercase tracking-wider block">
                {isPast ? "Final Price" : isUpcoming ? "Starting Price" : "Current Bid"}
              </span>
              <p className="text-base font-black text-agri-green">
                ₹{isPast ? (auction.currentBid || auction.startingPrice) : isUpcoming ? auction.startingPrice : auction.currentBid}/kg
              </p>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-agri-brown font-bold uppercase tracking-wider block">Lot Size</span>
              <p className="text-sm font-extrabold text-agri-green-dark dark:text-agri-green-light">
                {auction.lotSize} {auction.unit}
              </p>
            </div>
          </div>

          {/* Buy-Now / Reserve chips */}
          {(auction.buyNowPrice || auction.reservePrice) && (
            <div className="flex flex-wrap gap-1.5">
              {auction.buyNowPrice && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <Zap className="w-2.5 h-2.5" /> Buy Now ₹{auction.buyNowPrice}
                </span>
              )}
              {auction.reservePrice && (
                <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border ${
                  auction.reserveMet
                    ? "bg-agri-green/10 text-agri-green border-agri-green/20"
                    : "bg-gray-100 dark:bg-zinc-800 text-agri-brown border-agri-green/10"
                }`}>
                  <Lock className="w-2.5 h-2.5" />
                  {auction.reserveMet ? "Reserve Met" : `Reserve ₹${auction.reservePrice}`}
                </span>
              )}
            </div>
          )}

          {isLive ? (
            <Link href={`/auctions/${auction.id}`} className="block w-full">
              <Button variant="outline" className="w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 hover:bg-agri-green hover:text-white hover:border-agri-green transition-all">
                <Gavel className="w-3.5 h-3.5" /> Enter Auction Room <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          ) : isUpcoming ? (
            <div className="w-full rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-[10px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              Opens {new Date(auction.startTime).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </div>
          ) : (
            <Link href={`/auctions/${auction.id}`} className="block w-full">
              <Button variant="outline" className="w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                <Trophy className="w-3.5 h-3.5" /> View Result <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, label, count, color }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-black text-agri-green-dark dark:text-agri-green-light">{label}</h2>
        {count > 0 && (
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${color}`}>{count}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AuctionsListingPage() {
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const isFarmer = isAuthenticated && user?.role === "FARMER";

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPhase, setFilterPhase] = useState("all"); // all | live | upcoming | past
  // Farmers get a tab: "mine" = their listings, "all" = everyone's live auctions
  const [farmerTab, setFarmerTab] = useState("mine");

  // My auctions (farmer only)
  const { data: myAuctionsRes, isLoading: myLoading } = useQuery({
    queryKey: ["farmerAuctions"],
    queryFn: () => apiService.getFarmerAuctions(),
    enabled: isFarmer,
  });

  // All public auctions
  const { data: allAuctionsRes, isLoading: allLoading } = useQuery({
    queryKey: ["auctions"],
    queryFn: () => apiService.getAuctions(),
    // Always fetch so switching tabs is instant
    enabled: true,
  });

  // Active dataset depending on role + tab
  const auctionsRes = isFarmer
    ? (farmerTab === "mine" ? myAuctionsRes : allAuctionsRes)
    : allAuctionsRes;
  const isLoading = isFarmer
    ? (farmerTab === "mine" ? myLoading : allLoading)
    : allLoading;

  const { mutate: deleteAuction, isPending: isDeleting } = useMutation({
    mutationFn: (id) => apiService.deleteAuction(id),
    onSuccess: () => {
      toast.success("Auction deleted successfully.");
      queryClient.invalidateQueries(["auctions"]);
      queryClient.invalidateQueries(["farmerAuctions"]);
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to delete auction.");
      setDeleteTarget(null);
    },
  });

  const allAuctions = useMemo(() => auctionsRes?.data || [], [auctionsRes]);

  const grouped = useMemo(() => {
    const live = [], upcoming = [], past = [];
    allAuctions.forEach((a) => {
      const p = getAuctionPhase(a);
      if (p === "live") live.push(a);
      else if (p === "upcoming") upcoming.push(a);
      else past.push(a);
    });
    return { live, upcoming, past };
  }, [allAuctions]);

  // Filter + search
  const filtered = useMemo(() => {
    let list = allAuctions;
    if (filterPhase !== "all") list = grouped[filterPhase] || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        a.productName?.toLowerCase().includes(q) ||
        a.farmerName?.toLowerCase().includes(q) ||
        a.farmerLocation?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allAuctions, grouped, filterPhase, searchQuery]);

  const filteredGrouped = useMemo(() => {
    const live = [], upcoming = [], past = [];
    filtered.forEach((a) => {
      const p = getAuctionPhase(a);
      if (p === "live") live.push(a);
      else if (p === "upcoming") upcoming.push(a);
      else past.push(a);
    });
    return { live, upcoming, past };
  }, [filtered]);

  const farmerUserId = user?.id || user?._id;

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 text-current transition-colors pb-20">
      <Header />

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            auction={deleteTarget}
            onConfirm={() => deleteAuction(deleteTarget.id)}
            onCancel={() => setDeleteTarget(null)}
            isPending={isDeleting}
          />
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">

        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
              {isFarmer ? (farmerTab === "mine" ? "My Auctions" : "Live Bidding Arena") : "Live Bidding Arena"}
            </h1>
            <p className="text-xs sm:text-sm text-agri-brown mt-1">
              {isFarmer
                ? farmerTab === "mine"
                  ? "View and manage all auctions you have created."
                  : "Browse all live and upcoming auctions on the platform."
                : "Participate in high-margin crop auctions in real-time."}
            </p>
            {/* ── Farmer tab switcher ── */}
            {isFarmer && (
              <div className="flex mt-4 gap-3">
                <button
                  onClick={() => { setFarmerTab("mine"); setSearchQuery(""); setFilterPhase("all"); }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black border-2 transition-all shadow-sm ${
                    farmerTab === "mine"
                      ? "bg-agri-green text-white border-agri-green shadow-agri-green/30"
                      : "bg-white dark:bg-zinc-900 text-agri-brown border-agri-green/20 hover:border-agri-green hover:text-agri-green"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  My Auctions
                  {myAuctionsRes?.data?.length > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${farmerTab === "mine" ? "bg-white/20 text-white" : "bg-agri-green/10 text-agri-green"}`}>
                      {myAuctionsRes.data.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { setFarmerTab("all"); setSearchQuery(""); setFilterPhase("all"); }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black border-2 transition-all shadow-sm ${
                    farmerTab === "all"
                      ? "bg-agri-green-dark text-white border-agri-green-dark"
                      : "bg-white dark:bg-zinc-900 text-agri-brown border-agri-green/20 hover:border-agri-green hover:text-agri-green"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 004 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /></svg>
                  All Auctions
                </button>
              </div>
            )}
          </div>
          {isFarmer && farmerTab === "mine" && (
            <Link href="/auctions/create">
              <Button variant="primary" className="flex items-center gap-1.5 py-2.5 rounded-xl text-xs shadow-md shadow-agri-green/20">
                <PlusCircle className="w-4 h-4" />
                Launch New Auction
              </Button>
            </Link>
          )}
        </div>

        {/* ── Stats strip ─────────────────────────────────────────── */}
        {!isLoading && allAuctions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatPill icon={TrendingUp}  label="Live Now"       value={grouped.live.length}     color="bg-red-500/10 text-red-500" />
            <StatPill icon={Clock}       label="Upcoming"       value={grouped.upcoming.length} color="bg-amber-500/10 text-amber-600" />
            <StatPill icon={Trophy}      label="Past Auctions"  value={grouped.past.length}     color="bg-agri-green/10 text-agri-green" />
            <StatPill icon={Gavel}       label="Total Lots"     value={allAuctions.length}      color="bg-agri-brown/10 text-agri-brown" />
          </div>
        )}

        {/* ── Info banner ─────────────────────────────────────────── */}
        <div className="p-4 bg-agri-green/5 border border-agri-green/10 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-agri-green shrink-0 mt-0.5" />
          <p className="text-xs text-agri-brown dark:text-gray-300 leading-relaxed">
            Live auctions can be entered and bid on. Upcoming auctions are visible but locked until their start time. Past auctions show results only.
            {isFarmer && (
              <span className="ml-1 text-agri-green font-semibold">
                As a farmer, you can delete your <strong>upcoming</strong> auctions — live auctions cannot be removed once bidding starts.
              </span>
            )}
          </p>
        </div>

        {/* ── Search + filter bar ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-agri-brown/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product, farmer, or location..."
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-agri-green/10 bg-white/70 dark:bg-zinc-900/70 text-xs focus:outline-none focus:ring-2 focus:ring-agri-green/20 text-agri-green-dark dark:text-gray-200 placeholder:text-agri-brown/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-agri-brown/50 hover:text-agri-green transition">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-1.5 bg-white/60 dark:bg-zinc-900/60 border border-agri-green/5 rounded-2xl p-1">
            {[
              { value: "all",      label: "All" },
              { value: "live",     label: "🔴 Live" },
              { value: "upcoming", label: "⏰ Upcoming" },
              { value: "past",     label: "🏆 Past" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilterPhase(value)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                  filterPhase === value
                    ? "bg-agri-green text-white shadow-sm"
                    : "text-agri-brown hover:bg-agri-green/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── MY AUCTIONS: Table/list view (farmer's own listings) ── */}
        {isFarmer && farmerTab === "mine" && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl bg-gray-200 dark:bg-zinc-800 animate-pulse" />
                ))}
              </div>
            ) : allAuctions.length === 0 ? (
              <div className="text-center py-20 bg-white/40 dark:bg-black/10 rounded-3xl border border-dashed border-agri-green/10">
                <div className="w-16 h-16 rounded-2xl bg-agri-green/10 flex items-center justify-center mx-auto mb-4">
                  <Gavel className="w-8 h-8 text-agri-green/40" />
                </div>
                <h3 className="text-base font-bold text-agri-green-dark dark:text-white">No auctions created yet</h3>
                <p className="text-xs text-agri-brown mt-1.5 mb-4">Launch your first auction to start selling crops at market price.</p>
                <Link href="/auctions/create">
                  <Button variant="primary" className="rounded-xl text-xs">
                    <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Launch New Auction
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-agri-green/10 overflow-hidden shadow-sm">
                {/* Table header */}
                <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-agri-green/5 border-b border-agri-green/10 text-[10px] font-black text-agri-brown uppercase tracking-wider">
                  <div className="col-span-4">Product</div>
                  <div className="col-span-2 text-center">Status</div>
                  <div className="col-span-2 text-center">Bid</div>
                  <div className="col-span-2 text-center">End Time</div>
                  <div className="col-span-2 text-center">Actions</div>
                </div>
                {/* Rows */}
                {allAuctions.map((a) => {
                  const phase = getAuctionPhase(a);
                  const phaseColor = phase === "live" ? "bg-red-500/10 text-red-600 border-red-200" : phase === "upcoming" ? "bg-amber-500/10 text-amber-700 border-amber-200" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700";
                  const phaseLabel = phase === "live" ? "🔴 Live" : phase === "upcoming" ? "⏰ Upcoming" : "✅ Ended";
                  return (
                    <div key={a.id} className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-agri-green/5 last:border-0 hover:bg-agri-green/2 transition items-center">
                      {/* Product */}
                      <div className="col-span-4 flex items-center gap-3 min-w-0">
                        <img
                          src={a.image || a.images?.[0] || "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=100"}
                          alt={a.productName}
                          className="w-10 h-10 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-agri-green-dark dark:text-agri-green-light truncate">{a.productName}</p>
                          <p className="text-[10px] text-agri-brown">{a.quantity} {a.unit} · {a.category}</p>
                        </div>
                      </div>
                      {/* Status */}
                      <div className="col-span-2 flex justify-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${phaseColor}`}>{phaseLabel}</span>
                      </div>
                      {/* Bid */}
                      <div className="col-span-2 text-center">
                        <p className="text-sm font-black text-agri-green">₹{a.currentBid || a.startingPrice}</p>
                        <p className="text-[9px] text-agri-brown">/ {a.unit}</p>
                      </div>
                      {/* End time */}
                      <div className="col-span-2 text-center">
                        <p className="text-[11px] font-semibold text-agri-brown">
                          {new Date(a.endTime).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                        <p className="text-[10px] text-agri-brown/60">
                          {new Date(a.endTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {/* Actions */}
                      <div className="col-span-2 flex items-center justify-center gap-2">
                        <Link href={`/auctions/${a.id}`}>
                          <button className="px-3 py-1.5 rounded-xl bg-agri-green/10 text-agri-green text-[10px] font-black hover:bg-agri-green hover:text-white transition">
                            View
                          </button>
                        </Link>
                        {(phase === "upcoming" || phase === "past") && (
                          <button
                            onClick={() => setDeleteTarget(a)}
                            className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-black hover:bg-red-500 hover:text-white transition"
                          >
                            Delete
                          </button>
                        )}
                        {phase === "live" && (
                          <span className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-[10px] font-black cursor-not-allowed" title="Cannot delete live auction">
                            🔒 Live
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ALL AUCTIONS: Card grid view ─────────────────────────────────── */}
        {(!isFarmer || farmerTab === "all") && (
        <>
        {/* ── Content ─────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[460px] rounded-3xl bg-gray-200 dark:bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white/40 dark:bg-black/10 rounded-3xl border border-agri-green/5">
            <Landmark className="w-12 h-12 text-agri-brown/30 mx-auto mb-4" />
            <h3 className="text-base font-bold text-agri-green-dark dark:text-white">
              {searchQuery
                ? `No results for "${searchQuery}"`
                : isFarmer
                ? "You haven't created any auctions yet"
                : "No auctions available"}
            </h3>
            <p className="text-xs text-agri-brown mt-1.5">
              {searchQuery
                ? "Try a different search term."
                : isFarmer
                ? "Click \"Launch New Auction\" above to create your first auction."
                : "Check back later for new auction lots."}
            </p>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="mt-4 text-xs text-agri-green font-bold hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-12">

            {/* Live */}
            {filteredGrouped.live.length > 0 && (
              <section className="space-y-5">
                <SectionHeader
                  icon={<span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block" />}
                  label="Live Auctions"
                  count={filteredGrouped.live.length}
                  color="bg-red-500/10 text-red-600"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {filteredGrouped.live.map((a) => (
                      <AuctionCard
                        key={a.id}
                        auction={a}
                        phase="live"
                        isFarmerOwner={isFarmer && farmerTab === "mine" && String(a.farmer === farmerUserId || a.farmerId === farmerUserId || a.farmer?._id === farmerUserId || a.farmer?.id === farmerUserId)}
                        onDeleteClick={setDeleteTarget}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Upcoming */}
            {filteredGrouped.upcoming.length > 0 && (
              <section className="space-y-5">
                <SectionHeader
                  icon={<TimerReset className="w-4 h-4 text-amber-600" />}
                  label="Upcoming Bidding"
                  count={filteredGrouped.upcoming.length}
                  color="bg-amber-500/10 text-amber-700"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {filteredGrouped.upcoming.map((a) => (
                      <AuctionCard
                        key={a.id}
                        auction={a}
                        phase="upcoming"
                        isFarmerOwner={isFarmer && (
                          a.farmer === farmerUserId ||
                          a.farmerId === farmerUserId ||
                          a.farmer?._id === farmerUserId ||
                          a.farmer?.id === farmerUserId
                        )}
                        onDeleteClick={setDeleteTarget}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Past */}
            {filteredGrouped.past.length > 0 && (
              <section className="space-y-5">
                <SectionHeader
                  icon={<Trophy className="w-4 h-4 text-agri-green" />}
                  label="Past Results"
                  count={filteredGrouped.past.length}
                  color="bg-agri-green/10 text-agri-green"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {filteredGrouped.past.map((a) => (
                    <AuctionCard key={a.id} auction={a} phase="past"
                      isFarmerOwner={isFarmer && (
                        a.farmer === farmerUserId ||
                        a.farmerId === farmerUserId ||
                        a.farmer?._id === farmerUserId ||
                        a.farmer?.id === farmerUserId
                      )}
                      onDeleteClick={setDeleteTarget} />
                  ))}
                </div>
              </section>
            )}

            {/* Show empty sections only if not filtering */}
            {filterPhase === "all" && !searchQuery && (
              <>
                {filteredGrouped.live.length === 0 && (
                  <section className="space-y-4">
                    <SectionHeader icon={<span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block" />} label="Live Auctions" count={0} color="bg-red-500/10 text-red-600" />
                    <div className="rounded-3xl border border-dashed border-agri-green/10 bg-white/50 dark:bg-black/10 p-10 text-center">
                      <p className="text-sm text-agri-brown font-semibold">No live auctions right now.</p>
                      <p className="text-xs text-agri-brown/60 mt-1">Check the upcoming section for what's next.</p>
                    </div>
                  </section>
                )}
                {filteredGrouped.upcoming.length === 0 && (
                  <section className="space-y-4">
                    <SectionHeader icon={<TimerReset className="w-4 h-4 text-amber-600" />} label="Upcoming Bidding" count={0} color="bg-amber-500/10 text-amber-700" />
                    <div className="rounded-3xl border border-dashed border-agri-green/10 bg-white/50 dark:bg-black/10 p-10 text-center">
                      <p className="text-sm text-agri-brown font-semibold">No upcoming auctions scheduled.</p>
                      {isFarmer && (
                        <Link href="/auctions/create">
                          <button className="mt-3 text-xs text-agri-green font-bold hover:underline">Launch your first auction →</button>
                        </Link>
                      )}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}
        </> 
        )}
      </main>
    </div>
  );
}
