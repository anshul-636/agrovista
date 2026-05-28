"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Landmark, Clock, Users, ArrowLeft, Send, Sparkles, Trophy, AlertTriangle, ShieldCheck } from "lucide-react";
import Header from "../../../components/shared/Header";
import Button from "../../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import { apiService } from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import { getSocket } from "../../../lib/socket";
import confetti from "canvas-confetti";
import { toast } from "sonner";

export default function AuctionRoomPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const [currentBid, setCurrentBid] = useState(0);
  const [bidsList, setBidsList] = useState([]);
  const [timeLeft, setTimeLeft] = useState({ diff: 0, text: "" });
  const [bidAmount, setBidAmount] = useState("");
  const [participantsCount, setParticipantsCount] = useState(8);
  const [isExpired, setIsExpired] = useState(false);
  const [winner, setWinner] = useState(null);
  
  const socketRef = useRef(null);

  // Fetch auction details
  const { data: auctionRes, isLoading } = useQuery({
    queryKey: ["auction", id],
    queryFn: () => apiService.getAuctionById(id),
  });

  const auction = auctionRes?.data || null;

  // Initialize initial state once loaded
  useEffect(() => {
    if (auction) {
      setCurrentBid(auction.currentBid);
      setBidsList(auction.bids || []);
    }
  }, [auction]);

  // Socket connection + Realtime bindings
  useEffect(() => {
    if (!id) return;

    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    socket.emit("join:auction", { auctionId: id });

    const handleNewBid = (data) => {
      console.log("[Room] Received bid event:", data);
      if (data.auctionId !== id) return;

      // Handle relative modifiers from mock socket
      let actualAmount = data.amount;
      if (data.amount < 10) {
        // It's a mock incremental modifier
        actualAmount = currentBid + data.amount;
      }

      setCurrentBid(actualAmount);
      
      const newBidEntry = {
        bidderName: data.bidder,
        amount: actualAmount,
        isUser: !!data.isUser,
        timestamp: data.timestamp || new Date().toISOString()
      };

      setBidsList(prev => [newBidEntry, ...prev]);

      // Spark screen indicator
      toast.info(`New bid placed by ${data.bidder}: ₹${actualAmount}/kg`, { icon: "📈" });
    };

    socket.on("bid:new", handleNewBid);

    // Dynamic participants simulator
    const participantInterval = setInterval(() => {
      setParticipantsCount(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        return Math.max(3, prev + delta);
      });
    }, 15000);

    return () => {
      socket.off("bid:new", handleNewBid);
      clearInterval(participantInterval);
    };
  }, [id, currentBid]);

  // Countdown timer calculations
  useEffect(() => {
    if (!auction) return;

    const updateTimer = () => {
      const diff = new Date(auction.endTime) - new Date();
      if (diff <= 0) {
        setTimeLeft({ diff: 0, text: "Ended" });
        setIsExpired(true);
        
        // Find winner (highest bidder)
        if (bidsList.length > 0) {
          const highBid = bidsList[0];
          setWinner(highBid.bidderName);

          // Trigger Confetti if user wins
          if (highBid.isUser || highBid.bidderName.includes("You")) {
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 }
            });
            toast.success("Congratulations! You won this crop lot!", { duration: 8000, icon: "🏆" });
          }
        } else {
          setWinner("No bidders");
        }
        return;
      }

      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      
      let text = `${minutes}m ${seconds}s`;
      setTimeLeft({ diff, text });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [auction, bidsList]);

  // Place Bid action
  const handleBidSubmit = (e) => {
    if (e) e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Please sign in to bid.");
      router.push("/login");
      return;
    }
    if (user.role !== "BUYER") {
      toast.error("Only buyers can bid on auctions.");
      return;
    }
    const val = Number(bidAmount);
    if (!val || isNaN(val)) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (val <= currentBid) {
      toast.error(`Bid must exceed current high bid of ₹${currentBid}/kg.`);
      return;
    }

    if (socketRef.current) {
      socketRef.current.emit("place:bid", {
        auctionId: id,
        amount: val,
        bidder: user.name
      });
      setBidAmount("");
    }
  };

  const handleQuickIncrement = (inc) => {
    const nextVal = currentBid + inc;
    if (!isAuthenticated) {
      toast.error("Please sign in to bid.");
      router.push("/login");
      return;
    }
    if (user.role !== "BUYER") {
      toast.error("Only buyers can bid on auctions.");
      return;
    }
    if (socketRef.current) {
      socketRef.current.emit("place:bid", {
        auctionId: id,
        amount: nextVal,
        bidder: user.name
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col">
        <Header />
        <div className="max-w-7xl mx-auto p-8 w-full animate-pulse space-y-6">
          <div className="h-6 w-24 bg-gray-200 dark:bg-zinc-800 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl" />
            <div className="lg:col-span-4 h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl" />
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

  const urgencyFlash = timeLeft.diff > 0 && timeLeft.diff < 1000 * 60; // less than 1 min

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 text-current transition-colors pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Navigation back */}
        <button
          onClick={() => router.push("/auctions")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-agri-brown hover:text-agri-green transition"
        >
          <ArrowLeft className="w-4 h-4" /> Exit Arena Bidding
        </button>

        {/* Header summary */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-agri-green/5 pb-6">
          <div>
            <span className="text-[10px] font-black uppercase text-agri-green flex items-center gap-1.5">
              <Landmark className="w-4 h-4" /> Live bidding Arena
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-agri-green-dark dark:text-agri-green-light mt-1">
              {auction.productName}
            </h1>
            <p className="text-xs text-agri-brown mt-1">
              Seller: {auction.farmerName} • Location: {auction.farmerLocation}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Count Indicator */}
            <div className="px-3.5 py-2 rounded-2xl bg-white dark:bg-black/20 border border-agri-green/10 flex items-center gap-2 text-xs font-bold text-agri-green">
              <Users className="w-4 h-4 animate-bounce" />
              <span>{participantsCount} watching</span>
            </div>
            
            {/* Countdown Badge */}
            <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2 text-xs font-extrabold shadow ${
              urgencyFlash
                ? "bg-red-500/10 border-red-500 text-red-500 animate-pulse"
                : "bg-white dark:bg-black/20 border-agri-green/10 text-current"
            }`}>
              <Clock className="w-4.5 h-4.5" />
              <span>{timeLeft.text}</span>
            </div>
          </div>
        </div>

        {/* Winner overlay block */}
        {isExpired && winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-gradient-to-r from-agri-green-dark to-[#092B0F] border border-agri-green/20 rounded-3xl text-center text-white space-y-3 shadow-xl"
          >
            <Trophy className="w-12 h-12 text-agri-wheat mx-auto animate-bounce" />
            <h2 className="text-2xl font-black tracking-tight">Auction Closed!</h2>
            <p className="text-sm font-semibold">
              Winning Bidder: <span className="text-agri-wheat font-black uppercase">{winner}</span>
            </p>
            <p className="text-xs text-white/60">Final price settled at ₹{currentBid}/kg lot value.</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Live Bidding Actions */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-agri-green/5 p-6 sm:p-8 space-y-8 relative overflow-hidden">
              {/* Glow grid background */}
              <div className="absolute inset-0 bg-gradient-to-br from-agri-green/5 to-transparent pointer-events-none -z-10" />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                {/* High Bid Display */}
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

                {/* Starting price / Lot specifications */}
                <div className="text-center sm:text-right text-xs space-y-1 text-agri-brown font-semibold">
                  <div>Starting Bid: <span className="font-extrabold text-agri-green-dark dark:text-agri-green-light">₹{auction.startingPrice}/kg</span></div>
                  <div>Lot Size: <span className="font-extrabold text-agri-green-dark dark:text-agri-green-light">{auction.lotSize} {auction.unit}</span></div>
                  <div className="flex items-center justify-center sm:justify-end gap-1 text-[10px] text-green-600 font-extrabold uppercase mt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-agri-green" /> Escrow Assured
                  </div>
                </div>
              </div>

              {/* Form / Increment Buttons */}
              {!isExpired && (
                <div className="space-y-6">
                  {/* Quick increment buttons */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-agri-green-dark dark:text-agri-green-light">Quick Bidding Increments</span>
                    <div className="grid grid-cols-3 gap-3">
                      {[2, 5, 10].map((inc) => (
                        <button
                          key={inc}
                          onClick={() => handleQuickIncrement(inc)}
                          className="py-3 px-4 rounded-2xl border border-agri-green/10 bg-agri-green/5 text-agri-green font-black text-sm hover:bg-agri-green/10 transition shadow-sm"
                        >
                          + ₹{inc}
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleBidSubmit} className="space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <input
                          type="number"
                          placeholder={`Enter bid value (min: ₹${currentBid + 1})`}
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl border text-sm bg-white dark:bg-black/20 border-agri-green/10 focus:outline-none focus:ring-2 focus:ring-agri-green/20 focus:border-agri-green font-bold"
                        />
                      </div>
                      <Button
                        type="submit"
                        variant="primary"
                        className="px-6 rounded-2xl flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-4 h-4" /> Place Bid
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </Card>

            {/* General instructions */}
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-agri-brown dark:text-gray-300 leading-relaxed font-semibold">
                By bidding, you contractually agree to accept delivery parameters and arrange prompt transport upon winning. Retracting active bids triggers Trust Score penalties.
              </p>
            </div>
          </div>

          {/* Right Column: Bids Feed */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-agri-green/5 p-6 h-[400px] flex flex-col justify-between">
              <CardHeader className="p-0 pb-4 border-none">
                <CardTitle className="text-base font-bold text-agri-green">Live Bid History</CardTitle>
                <CardDescription>Updates in real-time</CardDescription>
              </CardHeader>

              <CardContent className="p-0 flex-1 overflow-y-auto space-y-3 pr-1">
                <AnimatePresence initial={false}>
                  {bidsList.length === 0 ? (
                    <p className="text-xs text-center text-agri-brown py-12 italic">No bids placed yet. Start the arena!</p>
                  ) : (
                    bidsList.map((bid, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", duration: 0.3 }}
                        className={`p-3 rounded-2xl border text-xs flex justify-between items-center transition ${
                          bid.isUser || bid.bidderName.includes("You")
                            ? "bg-agri-green/10 border-agri-green text-agri-green-dark dark:text-agri-green-light"
                            : "bg-white/50 dark:bg-black/20 border-agri-green/5 text-current"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="font-extrabold flex items-center gap-1">
                            {bid.bidderName}
                            {(bid.isUser || bid.bidderName.includes("You")) && (
                              <Badge variant="green" size="sm" className="normal-case scale-90">You</Badge>
                            )}
                          </span>
                          <span className="text-[9px] text-agri-brown font-semibold">
                            {new Date(bid.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
