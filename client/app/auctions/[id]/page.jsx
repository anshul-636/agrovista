"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Landmark, Clock, Users, ArrowLeft, Send, Trophy, AlertTriangle,
  ShieldCheck, TimerReset, BadgeCheck, Zap, TrendingUp, Lock
} from "lucide-react";
import Header from "../../../components/shared/Header";
import Button from "../../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import { apiService } from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import { getSocket } from "../../../lib/socket";
import confetti from "canvas-confetti";
import { toast } from "sonner";

const getAuctionPhase = (auction) => {
  if (!auction) return "upcoming";
  const now = new Date();
  const startTime = new Date(auction.startTime);
  const endTime = new Date(auction.endTime);
  if (auction.status === "ENDED" || auction.status === "CLOSED" || now >= endTime) return "past";
  if (auction.status === "LIVE" || (now >= startTime && now < endTime)) return "live";
  return "upcoming";
};

// ── Verified badge chip ────────────────────────────────────────────────────────
function VerifiedChip() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-agri-green/10 text-agri-green border border-agri-green/20">
      <BadgeCheck className="w-3 h-3" /> Verified
    </span>
  );
}

// ── Reserve status banner ──────────────────────────────────────────────────────
function ReserveBanner({ auction, currentBid }) {
  if (!auction?.reservePrice) return null;
  const met = currentBid >= auction.reservePrice || auction.reserveMet;
  return (
    <motion.div
      key={met ? "met" : "unmet"}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${
        met
          ? "bg-agri-green/10 text-agri-green border border-agri-green/20"
          : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
      }`}
    >
      {met ? (
        <><ShieldCheck className="w-4 h-4" /> Reserve price met — lot will be sold to highest bidder</>
      ) : (
        <><Lock className="w-4 h-4" /> Reserve not yet met — lot won't sell below ₹{auction.reservePrice?.toLocaleString("en-IN")}</>
      )}
    </motion.div>
  );
}

export default function AuctionRoomPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const [currentBid, setCurrentBid] = useState(0);
  const [reserveMet, setReserveMet] = useState(false);
  const [bidsList, setBidsList] = useState([]);
  const [timeLeft, setTimeLeft] = useState({ diff: 0, text: "" });
  const [bidAmount, setBidAmount] = useState("");
  const [participantsCount, setParticipantsCount] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [winner, setWinner] = useState(null);
  const [buyNowActive, setBuyNowActive] = useState(false);
  const isExpiredRef = useRef(isExpired);
  const socketRef = useRef(null);

  useEffect(() => { isExpiredRef.current = isExpired; }, [isExpired]);

  const { data: auctionRes, isLoading } = useQuery({
    queryKey: ["auction", id],
    queryFn: () => apiService.getAuctionById(id),
  });

  const auction = auctionRes?.data || null;
  const auctionPhase = React.useMemo(() => getAuctionPhase(auction), [auction]);
  const canBid = auctionPhase === "live";

  useEffect(() => {
    if (auction) {
      setCurrentBid(auction.currentBid ?? auction.startingPrice ?? 0);
      setBidsList(auction.bids || []);
      setIsExpired(auctionPhase === "past");
      setReserveMet(auction.reserveMet || false);
      setBuyNowActive(!!auction.buyNowPrice);

      // ── Seed winner name from API data when auction is already ENDED ──
      if (auctionPhase === "past") {
        // Priority: 1) winner.name from populated object, 2) winnerName mapped by normalizer,
        // 3) top bid's bidder name (most reliable — always present if any bid was placed),
        // 4) No bidders fallback
        const winnerFromObj = typeof auction.winner === "object" && auction.winner !== null
          ? (auction.winner.name || null)
          : null;
        const topBidName = auction.bids && auction.bids.length > 0
          ? ([...auction.bids].sort((a, b) => b.amount - a.amount)[0]?.bidderName || null)
          : null;
        const resolvedWinner = winnerFromObj || auction.winnerName || topBidName || null;
        setWinner(resolvedWinner || "No bidders");
      }
    }
  }, [auction, auctionPhase]);

  // ── Socket bindings ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !canBid) return;
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;
    socket.emit("join:auction", { auctionId: id });

    const handleNewBid = (data) => {
      if (data.auctionId !== id) return;
      if (isExpiredRef.current) return;

      const actualAmount = typeof data.amount === "number" && data.amount < 10
        ? currentBid + data.amount
        : data.amount;

      setCurrentBid(actualAmount);
      if (data.reserveMet) setReserveMet(true);

      const bidderString = typeof data.bidder === "object" && data.bidder !== null
        ? data.bidder.name
        : (data.bidder || "Unknown Bidder");

      setBidsList(prev => [{
        bidderName: bidderString,
        amount: actualAmount,
        isUser: !!data.isUser,
        timestamp: data.timestamp || new Date().toISOString()
      }, ...prev]);

      toast.info(`New bid: ₹${actualAmount}/kg by ${bidderString}`, { icon: "📈" });
    };

    // Buy-Now or natural expiry ended the auction
    const handleAuctionEnded = (data) => {
      if (data.auctionId !== id) return;
      setIsExpired(true);
      setTimeLeft({ diff: 0, text: "Ended" });
      if (data.reason === "BUY_NOW") {
        toast.success(`Auction closed — sold via Buy Now to ${data.winner?.name || "a buyer"}!`, { duration: 8000, icon: "⚡" });
      }
      const winnerName = typeof data.winner === "object" ? data.winner?.name : data.winner;
      if (winnerName) setWinner(winnerName);
      queryClient.invalidateQueries(["auction", id]);
    };

    const handleParticipants = (data) => {
      if (data?.auctionId !== id) return;
      setParticipantsCount(data.count || 0);
    };

    const handleDeleted = (data) => {
      if (!data || data.auctionId !== id) return;
      toast.error("This auction was deleted by the seller.");
      router.push("/auctions");
    };

    socket.on("bid:new", handleNewBid);
    socket.on("auction:ended", handleAuctionEnded);
    socket.on("auction:participants", handleParticipants);
    socket.on("auction:deleted", handleDeleted);

    return () => {
      socket.off("bid:new", handleNewBid);
      socket.off("auction:ended", handleAuctionEnded);
      socket.off("auction:participants", handleParticipants);
      socket.off("auction:deleted", handleDeleted);
    };
  }, [id, currentBid, canBid, router, queryClient]);

  // ── Countdown ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!auction) return;
    const updateTimer = () => {
      const now = new Date();
      const startDiff = new Date(auction.startTime) - now;
      const endDiff   = new Date(auction.endTime) - now;

      if (auctionPhase === "upcoming") {
        setTimeLeft({ diff: Math.max(startDiff, 0), text: startDiff > 0 ? `Starts in ${Math.max(Math.floor(startDiff / 60000), 0)}m ${Math.max(Math.floor((startDiff / 1000) % 60), 0)}s` : "Starting soon" });
        return;
      }

      if (endDiff <= 0) {
        if (!isExpiredRef.current) {
          setTimeLeft({ diff: 0, text: "Ended" });
          setIsExpired(true);
          socketRef.current?.emit("leave:auction", { auctionId: id });
          if (bidsList.length > 0) {
            const highBid = bidsList[0];
            setWinner(highBid.bidderName);
            if (highBid.isUser || highBid.bidderName?.includes("You")) {
              confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
              toast.success("Congratulations! You won this crop lot!", { duration: 8000, icon: "🏆" });
            }
          } else {
            setWinner("No bidders");
          }
        }
        return;
      }

      const minutes = Math.floor((endDiff / 1000 / 60) % 60);
      const seconds = Math.floor((endDiff / 1000) % 60);
      setTimeLeft({ diff: endDiff, text: `${minutes}m ${seconds}s` });
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [auction, bidsList, auctionPhase, id]);

  // ── Place Bid mutation ───────────────────────────────────────────────────────
  const placeBidMutation = useMutation({
    mutationFn: (amount) => apiService.placeBid(id, amount),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.error || "Failed to place bid.");
      } else {
        setBidAmount("");
        // Handle buy-now instant win returned from server
        if (res.data?.isBuyNow) {
          setIsExpired(true);
          setBuyNowActive(false);
          confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 } });
          toast.success("⚡ You triggered Buy Now — you won this lot!", { duration: 8000 });
          queryClient.invalidateQueries(["auction", id]);
        }
        if (res.data?.reserveMet) setReserveMet(true);
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to place bid.");
    }
  });

  // ── Validation helpers ───────────────────────────────────────────────────────
  const minIncrement = auction?.minBidIncrement || 1;
  const minAllowed = (auction?.currentBid ?? auction?.startingPrice ?? 0) + minIncrement;

  // ── Is the current logged-in user the auction winner? ──────────────────────
  const isCurrentUserWinner = Boolean(
    isExpired && user && auction?.winner && (() => {
      const wid = typeof auction.winner === 'object'
        ? (auction.winner._id || auction.winner.id)
        : auction.winner;
      const uid = user._id || user.id;
      return wid && uid && String(wid) === String(uid);
    })()
  );

  const handleProceedToPayment = () => {
    const params = new URLSearchParams({
      auctionId: String(auction.id || auction._id),
      name: auction.productName || '',
      bid: String(currentBid),
      qty: String(auction.quantity || auction.lotSize || 1),
      unit: auction.unit || 'kg',
      img: encodeURIComponent(auction.image || '')
    });
    router.push('/auctions/checkout?' + params.toString());
  };

  const validateBid = (val) => {
    if (!canBid) { toast.error(auctionPhase === "upcoming" ? "Auction hasn't started." : "Auction has ended."); return false; }
    if (!isAuthenticated) { toast.error("Please sign in to bid."); router.push("/login"); return false; }
    if (user.role !== "BUYER") { toast.error("Only buyers can place bids."); return false; }
    if (!val || isNaN(val) || val <= 0) { toast.error("Enter a valid bid amount."); return false; }
    if (val < minAllowed) { toast.error(`Minimum bid is ₹${minAllowed} (increment: ₹${minIncrement})`); return false; }
    if (val > (user?.walletBalance || 1000000)) { toast.error(`Exceeds your purse of ₹${(user?.walletBalance || 1000000).toLocaleString()}`); return false; }
    return true;
  };

  const handleBidSubmit = (e) => {
    if (e) e.preventDefault();
    const val = Number(bidAmount);
    if (validateBid(val)) placeBidMutation.mutate(val);
  };

  const handleQuickIncrement = (inc) => {
    const nextVal = (currentBid ?? auction?.startingPrice ?? 0) + inc;
    if (validateBid(nextVal)) placeBidMutation.mutate(nextVal);
  };

  const handleBuyNow = () => {
    if (!auction?.buyNowPrice) return;
    if (!isAuthenticated) { toast.error("Please sign in."); router.push("/login"); return; }
    if (user.role !== "BUYER") { toast.error("Only buyers can use Buy Now."); return; }
    if (auction.buyNowPrice > (user?.walletBalance || 1000000)) {
      toast.error(`Buy-Now price ₹${auction.buyNowPrice} exceeds your purse.`); return;
    }
    placeBidMutation.mutate(auction.buyNowPrice);
  };

  // ── Loading / empty states ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col">
        <Header />
        <div className="max-w-7xl mx-auto p-8 w-full animate-pulse space-y-6">
          <div className="h-6 w-24 bg-gray-200 dark:bg-zinc-800 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl" />
            <div className="lg:col-span-5 h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col">
        <Header />
        <div className="max-w-md mx-auto my-auto text-center p-8 space-y-4">
          <h2 className="text-xl font-bold text-red-500">Auction Room Inactive</h2>
          <Button onClick={() => router.push("/auctions")}>Return to Arena</Button>
        </div>
      </div>
    );
  }

  const urgencyFlash = timeLeft.diff > 0 && timeLeft.diff < 1000 * 60;

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 text-current transition-colors pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">

        {/* ── Back nav ── */}
        <button
          onClick={() => router.push("/auctions")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-agri-brown hover:text-agri-green transition"
        >
          <ArrowLeft className="w-4 h-4" /> Exit Arena Bidding
        </button>

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-agri-green/5 pb-6">
          <div>
            <span className="text-[10px] font-black uppercase text-agri-green flex items-center gap-1.5">
              <Landmark className="w-4 h-4" />
              {auctionPhase === "live" ? "Live Bidding Arena" : auctionPhase === "upcoming" ? "Upcoming Auction" : "Auction Results"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-agri-green-dark dark:text-agri-green-light mt-1">
              {auction.productName}
            </h1>
            <p className="text-xs text-agri-brown mt-1 flex items-center gap-2 flex-wrap">
              <span>Seller: {auction.farmerName}</span>
              {auction.farmerVerified && <VerifiedChip />}
              <span>• {auction.farmerLocation}</span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-3.5 py-2 rounded-2xl bg-white dark:bg-black/20 border border-agri-green/10 flex items-center gap-2 text-xs font-bold text-agri-green">
              <Users className="w-4 h-4 animate-bounce" />
              <span>
                {auctionPhase === "live" ? `${participantsCount} watching` : auctionPhase === "upcoming" ? "Not open yet" : "Closed"}
              </span>
            </div>
            <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2 text-xs font-extrabold shadow ${
              urgencyFlash
                ? "bg-red-500/10 border-red-500 text-red-500 animate-pulse"
                : "bg-white dark:bg-black/20 border-agri-green/10 text-current"
            }`}>
              <Clock className="w-4 h-4" />
              <span>{timeLeft.text}</span>
            </div>
          </div>
        </div>

        {/* ── Winner overlay ── */}
        {isExpired && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-gradient-to-r from-agri-green-dark to-[#092B0F] border border-agri-green/20 rounded-3xl text-center text-white space-y-3 shadow-xl"
          >
            <Trophy className={`w-12 h-12 mx-auto animate-bounce ${winner && winner !== "No bidders" ? "text-agri-wheat" : "text-white/40"}`} />
            <h2 className="text-2xl font-black">Auction Closed!</h2>
            {winner && winner !== "No bidders" ? (
              <p className="text-sm font-semibold">
                Winning Bidder: <span className="text-agri-wheat font-black uppercase">{winner}</span>
              </p>
            ) : (
              <p className="text-sm text-white/60 font-semibold">No bids were placed on this auction.</p>
            )}
            <p className="text-xs text-white/60">
              Final price: ₹{currentBid}/kg
              {auction.reservePrice && !reserveMet && (
                <span className="ml-2 text-amber-400">(Reserve not met — lot may not transfer)</span>
              )}
            </p>
            {/* ── Winner CTA: only shown to the actual winner ── */}
            {isCurrentUserWinner && (
              <div className="pt-2 space-y-2">
                <p className="text-xs text-agri-wheat font-bold">🎉 Congratulations! You won this lot.</p>
                <button
                  onClick={handleProceedToPayment}
                  className="w-full py-3 px-6 rounded-2xl bg-agri-wheat text-agri-green-dark font-black text-sm hover:bg-yellow-300 transition shadow-lg flex items-center justify-center gap-2"
                >
                  Proceed to Payment & Delivery →
                </button>
              </div>
            )}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── LEFT: Bidding ── */}
          <div className="lg:col-span-7 space-y-4">

            {/* Reserve status banner */}
            {canBid && auction.reservePrice && (
              <ReserveBanner auction={{ ...auction, reserveMet }} currentBid={currentBid} />
            )}

            <Card className="border-agri-green/5 p-6 sm:p-8 space-y-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-agri-green/5 to-transparent pointer-events-none -z-10" />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                {/* Current bid display */}
                <div className="text-center sm:text-left space-y-2">
                  <span className="text-[10px] text-agri-brown font-extrabold uppercase tracking-wide">Current Highest Bid</span>
                  <motion.p
                    key={currentBid}
                    initial={{ scale: 0.9, opacity: 0.8 }}
                    animate={{ scale: 1.05, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                    className="text-5xl font-black text-agri-green tracking-tight select-none"
                  >
                    ₹{currentBid} <span className="text-sm font-semibold text-agri-brown">/ kg</span>
                  </motion.p>
                </div>

                {/* Lot specs */}
                <div className="text-center sm:text-right text-xs space-y-1 text-agri-brown font-semibold">
                  <div>Starting: <span className="font-extrabold text-agri-green-dark dark:text-agri-green-light">₹{auction.startingPrice}/kg</span></div>
                  {auction.reservePrice && (
                    <div>Reserve: <span className={`font-extrabold ${reserveMet ? "text-agri-green" : "text-amber-600"}`}>
                      {reserveMet ? "✓ Met" : `₹${auction.reservePrice}`}
                    </span></div>
                  )}
                  <div>Lot Size: <span className="font-extrabold text-agri-green-dark dark:text-agri-green-light">{auction.lotSize} {auction.unit}</span></div>
                  <div>Min Increment: <span className="font-extrabold text-agri-green-dark dark:text-agri-green-light">₹{minIncrement}</span></div>

                  {user?.role === "BUYER" && (
                    <div className="mt-3 pt-2 border-t border-agri-green/10">
                      <span className="uppercase text-[9px] tracking-widest text-agri-green-dark font-extrabold block">Bidding Purse</span>
                      <span className="font-black text-agri-green text-lg">₹{(user?.walletBalance || 1000000).toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-center sm:justify-end gap-1 text-[10px] text-green-600 font-extrabold uppercase mt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-agri-green" /> Escrow Assured
                  </div>
                </div>
              </div>

              {/* Bidding controls */}
              {canBid ? (
                <div className="space-y-5">

                  {/* Buy-Now button */}
                  {buyNowActive && auction.buyNowPrice && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/10 border border-amber-300 dark:border-amber-700 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                            <Zap className="w-4 h-4" /> Buy Now Available
                          </p>
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">Skip the bidding — win instantly at this price</p>
                        </div>
                        <span className="text-2xl font-black text-amber-700 dark:text-amber-300">₹{auction.buyNowPrice}</span>
                      </div>
                      <button
                        onClick={handleBuyNow}
                        disabled={placeBidMutation.isPending}
                        className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        {placeBidMutation.isPending ? "Processing…" : `Buy Now — ₹${auction.buyNowPrice}/kg`}
                      </button>
                    </motion.div>
                  )}

                  {/* Quick increments — use minBidIncrement as base */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-agri-green-dark dark:text-agri-green-light">
                      Quick Bid Increments <span className="text-agri-brown font-normal">(min +₹{minIncrement})</span>
                    </span>
                    <div className="grid grid-cols-3 gap-3">
                      {[minIncrement, minIncrement * 5, minIncrement * 10].map((inc) => (
                        <button
                          key={inc}
                          onClick={() => handleQuickIncrement(inc)}
                          disabled={placeBidMutation.isPending}
                          className="py-3 px-4 rounded-2xl border border-agri-green/10 bg-agri-green/5 text-agri-green font-black text-sm hover:bg-agri-green/10 transition shadow-sm disabled:opacity-50"
                        >
                          + ₹{inc}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual bid input */}
                  <form onSubmit={handleBidSubmit} className="space-y-2">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <input
                          type="number"
                          placeholder={`Min: ₹${minAllowed}`}
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl border text-sm bg-white dark:bg-black/20 border-agri-green/10 focus:outline-none focus:ring-2 focus:ring-agri-green/20 focus:border-agri-green font-bold"
                        />
                      </div>
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={placeBidMutation.isPending}
                        className="px-6 rounded-2xl flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-4 h-4" />
                        {placeBidMutation.isPending ? "…" : "Bid"}
                      </Button>
                    </div>
                    <p className="text-[10px] text-agri-brown font-semibold pl-1">
                      Next valid bid: ₹{minAllowed}/kg or higher
                    </p>
                  </form>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-agri-green/15 bg-agri-green/5 p-6 space-y-3">
                  <div className="flex items-center gap-2 text-agri-green-dark dark:text-agri-green-light font-black text-sm">
                    {auctionPhase === "upcoming" ? <TimerReset className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
                    {auctionPhase === "upcoming" ? "Bidding opens soon" : "Auction closed"}
                  </div>
                  <p className="text-xs text-agri-brown font-semibold leading-relaxed">
                    {auctionPhase === "upcoming"
                      ? "This auction is scheduled but not yet open. Come back when it starts."
                      : `Auction finished. Final price: ₹${currentBid}/kg.`}
                  </p>
                  {/* ── Winner payment CTA inside the bidding card ── */}
                  {isCurrentUserWinner && (
                    <div className="pt-1 space-y-1.5">
                      <p className="text-xs text-agri-green font-bold">🏆 You are the winner! Complete checkout to confirm your order.</p>
                      <button
                        onClick={handleProceedToPayment}
                        className="w-full py-3 px-6 rounded-2xl bg-agri-green text-white font-black text-sm hover:bg-agri-green-dark transition shadow flex items-center justify-center gap-2"
                      >
                        Proceed to Payment & Delivery →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Disclaimer */}
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-agri-brown dark:text-gray-300 leading-relaxed font-semibold">
                By bidding, you contractually agree to accept delivery and arrange prompt transport upon winning.
                Retracting active bids triggers Trust Score penalties.
              </p>
            </div>

            {/* Auction info strip */}
            <Card className="border-agri-green/5 p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                {[
                  { label: "Category",    value: auction.category },
                  { label: "Quantity",    value: `${auction.lotSize} ${auction.unit}` },
                  { label: "Min Increment", value: `₹${minIncrement}` },
                  { label: "Reserve",     value: auction.reservePrice ? `₹${auction.reservePrice}` : "No reserve" },
                ].map(({ label, value }) => (
                  <div key={label} className="space-y-0.5">
                    <p className="text-[9px] font-black uppercase text-agri-brown">{label}</p>
                    <p className="font-extrabold text-agri-green-dark dark:text-agri-green-light">{value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ── RIGHT: Bid History ── */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-agri-green/5 p-6 h-[480px] flex flex-col justify-between">
              <CardHeader className="p-0 pb-4 border-none">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-agri-green flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Live Bid Feed
                  </CardTitle>
                  <span className="text-[10px] text-agri-brown font-semibold">{bidsList.length} bids</span>
                </div>
                <p className="text-[10px] text-agri-brown mt-0.5">Updates in real-time</p>
              </CardHeader>

              <CardContent className="p-0 flex-1 overflow-y-auto space-y-2 pr-1">
                <AnimatePresence initial={false}>
                  {bidsList.length === 0 ? (
                    <p className="text-xs text-center text-agri-brown py-16 italic">No bids yet — be the first!</p>
                  ) : (
                    bidsList.map((bid, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", duration: 0.3 }}
                        className={`p-3 rounded-2xl border text-xs flex justify-between items-center transition ${
                          bid.isUser || bid.bidderName?.includes("You")
                            ? "bg-agri-green/10 border-agri-green text-agri-green-dark dark:text-agri-green-light"
                            : i === 0
                            ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40 text-current"
                            : "bg-white/50 dark:bg-black/20 border-agri-green/5 text-current"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="font-extrabold flex items-center gap-1">
                            {i === 0 && <span className="text-amber-500">👑</span>}
                            {bid.bidderName}
                            {(bid.isUser || bid.bidderName?.includes("You")) && (
                              <Badge variant="green" size="sm" className="normal-case scale-90">You</Badge>
                            )}
                          </span>
                          <span className="text-[9px] text-agri-brown font-semibold">
                            {(() => { const d = new Date(bid.timestamp || bid.createdAt); return isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }); })()}
                          </span>
                        </div>
                        <span className="font-black text-sm text-agri-green">₹{bid.amount}/kg</span>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}