"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  Tractor,
  Landmark,
  Cpu,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  MapPin,
  TrendingUp,
  Users,
  Leaf,
  Star,
  Zap,
  BarChart3,
  Globe,
  Clock,
  CheckCircle2,
  Package,
} from "lucide-react";
import Header from "../components/shared/Header";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { apiService } from "../lib/api";

// ─── Animated counter ───────────────────────────────────────────────────────
function AnimatedNumber({ target, suffix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1800;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// ─── Floating badge ──────────────────────────────────────────────────────────
function FloatingBadge({ icon: Icon, label, value, className }) {
  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      className={`glass-card absolute px-3 py-2 rounded-2xl shadow-lg flex items-center gap-2 text-xs font-bold ${className}`}
    >
      <span className="w-7 h-7 rounded-xl bg-agri-green/10 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-agri-green dark:text-agri-green-light" />
      </span>
      <div>
        <p className="text-agri-brown dark:text-gray-400 text-[10px] font-semibold">{label}</p>
        <p className="text-agri-green-dark dark:text-agri-green-light">{value}</p>
      </div>
    </motion.div>
  );
}

// ─── Step card ───────────────────────────────────────────────────────────────
function StepCard({ number, title, description, delay }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="relative"
    >
      <div className="flex gap-5">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-2xl bg-agri-green text-white flex items-center justify-center text-sm font-black flex-shrink-0 shadow-lg shadow-agri-green/20">
            {number}
          </div>
          {number < 3 && <div className="w-0.5 h-full bg-agri-green/10 mt-3" />}
        </div>
        <div className="pb-10">
          <h4 className="text-base font-extrabold text-agri-green-dark dark:text-white mb-1">{title}</h4>
          <p className="text-sm text-agri-brown dark:text-gray-400 leading-relaxed">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [auctions, setAuctions] = useState([]);
  const [summary, setSummary] = useState({ farmers: 0, buyers: 0, products: 0, auctions: 0, cities: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsRes, auctionsRes] = await Promise.all([
          apiService.getPublicStats(),
          apiService.getAuctions(),
        ]);
        const stats = statsRes?.data || {};
        const liveAuctions = Array.isArray(auctionsRes?.data) ? auctionsRes.data : [];
        setAuctions(liveAuctions.slice(0, 3));
        setSummary({
          farmers: Number(stats.farmers || 0),
          buyers: Number(stats.buyers || 0),
          products: Number(stats.products || 0),
          auctions: Number(stats.auctions || liveAuctions.length || 0),
          cities: Number(stats.cities || 0),
        });
      } catch {
        setAuctions([]);
      } finally {
        setLoaded(true);
      }
    };
    loadData();
  }, []);

  const features = [
    {
      icon: Tractor,
      title: "Direct Farm Marketplace",
      description: "Browse verified produce listings straight from the source. No middlemen, no markups — just fresh, fairly-priced crops.",
      color: "bg-agri-green/10 text-agri-green",
    },
    {
      icon: Landmark,
      title: "Live Auction Rooms",
      description: "Bid on crop lots in real-time with live price updates and transparent bidding history. Every rupee counts.",
      color: "bg-agri-wheat/15 text-agri-wheat-dark",
    },
    {
      icon: Cpu,
      title: "AI Price Suggestions",
      description: "Get intelligent valuation guidance powered by market trends, seasonality, and regional demand data.",
      color: "bg-agri-green/10 text-agri-green",
    },
    {
      icon: ShieldCheck,
      title: "Verified Farmer Profiles",
      description: "Every farmer is vetted with trust scores, transaction history, and location verification for total peace of mind.",
      color: "bg-agri-brown/10 text-agri-brown",
    },
  ];

  const stats = [
    { icon: Users, value: summary.farmers, label: "Farmers Listed", suffix: "+" },
    { icon: Package, value: summary.products, label: "Products Available", suffix: "+" },
    { icon: Landmark, value: summary.auctions, label: "Auctions Hosted", suffix: "+" },
    { icon: Globe, value: summary.cities, label: "Cities Connected", suffix: "+" },
  ];

  const testimonials = [
    {
      name: "Ramesh Patel",
      role: "Wheat Farmer, Gujarat",
      quote: "I sold my entire harvest in 3 hours at 18% above mandi price. AgroVista changed everything.",
      avatar: "R",
      rating: 5,
    },
    {
      name: "Priya Sharma",
      role: "Bulk Buyer, Delhi",
      quote: "The auction rooms are transparent and competitive. I source premium rice directly without any broker fees.",
      avatar: "P",
      rating: 5,
    },
    {
      name: "Anil Yadav",
      role: "Vegetable Farmer, UP",
      quote: "The AI pricing tool helped me understand my tomatoes were worth far more than local traders offered.",
      avatar: "A",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-agri-cream dark:bg-zinc-950 overflow-x-hidden">
      <Header />

      {/* ─── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-agri-green/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/4 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-agri-wheat/8 rounded-full blur-[100px] translate-x-1/3 translate-y-1/4 pointer-events-none" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left copy */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-6 space-y-7"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-card border border-agri-green/20"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-agri-green opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-agri-green" />
              </span>
              <span className="text-[11px] font-extrabold text-agri-green dark:text-agri-green-light tracking-widest uppercase">
                Live marketplace • India
              </span>
            </motion.div>

            <div className="space-y-3">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-black text-agri-green-dark dark:text-white leading-[0.95] tracking-tight"
              >
                Farmers earn
                <br />
                <span className="relative">
                  <span className="bg-gradient-to-r from-agri-green to-agri-green-light bg-clip-text text-transparent">
                    what they deserve.
                  </span>
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="text-agri-brown dark:text-gray-300 text-base sm:text-lg max-w-lg leading-relaxed"
              >
                AgroVista connects verified farmers directly to bulk buyers through a transparent marketplace and real-time auctions — cutting out every middleman in between.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="flex flex-wrap items-center gap-4"
            >
              <Link href="/products">
                <Button variant="primary" size="lg" className="flex items-center gap-2 shadow-lg shadow-agri-green/25 hover:shadow-agri-green/40 transition-shadow">
                  Browse Marketplace
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/auctions">
                <Button variant="secondary" size="lg" className="flex items-center gap-2 border-agri-green/25">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  Live Auctions
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="flex items-center gap-6 pt-2"
            >
              {[
                { icon: CheckCircle2, text: "Zero commission fees" },
                { icon: CheckCircle2, text: "Verified farmers only" },
                { icon: CheckCircle2, text: "Real-time bidding" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-agri-brown dark:text-gray-400 font-semibold">
                  <Icon className="w-3.5 h-3.5 text-agri-green flex-shrink-0" />
                  {text}
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — hero card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="lg:col-span-6 relative"
          >
            <div className="relative">
              {/* Floating badges */}
              <FloatingBadge
                icon={TrendingUp}
                label="Avg. price premium"
                value="+22% vs mandi"
                className="top-6 -left-4 z-20 hidden sm:flex"
              />
              <FloatingBadge
                icon={Zap}
                label="Avg. time to sell"
                value="Under 4 hours"
                className="bottom-16 -right-4 z-20 hidden sm:flex"
              />

              <Card className="p-5 rounded-[2rem] border-agri-green/10 shadow-2xl shadow-agri-green/10 space-y-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
                {/* Top product image area */}
                <div className="relative h-52 w-full rounded-2xl overflow-hidden bg-gradient-to-br from-agri-green/20 to-agri-green-dark/30">
                  {auctions[0]?.images?.[0] ? (
                    <img
                      src={auctions[0].images[0]}
                      alt={auctions[0].productName}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <Leaf className="w-12 h-12 text-agri-green/40" />
                      <p className="text-xs text-agri-brown/60 font-semibold">Fresh produce available now</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                  {/* Live pill */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500/90 backdrop-blur text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    LIVE AUCTION
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-white font-black text-xl leading-tight drop-shadow">
                      {auctions[0]?.productName || "Premium Crop Lots"}
                    </p>
                    {(auctions[0]?.farmerLocation) && (
                      <p className="text-white/70 text-xs mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {auctions[0].farmerLocation}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bid row */}
                {auctions[0] ? (
                  <div className="flex items-center justify-between bg-agri-green/5 dark:bg-white/5 p-4 rounded-2xl border border-agri-green/10">
                    <div>
                      <p className="text-[10px] font-bold text-agri-brown uppercase tracking-wider">Current Bid</p>
                      <p className="text-2xl font-black text-agri-green">
                        ₹{auctions[0].currentBid ?? auctions[0].startingPrice ?? 0}
                        <span className="text-xs font-semibold text-agri-brown">/kg</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-agri-brown uppercase tracking-wider">Lot Size</p>
                      <p className="text-lg font-black text-agri-green-dark dark:text-agri-green-light">
                        {auctions[0].lotSize || auctions[0].quantity || 0} {auctions[0].unit || "kg"}
                      </p>
                    </div>
                    <Link href={`/auctions/${auctions[0].id || auctions[0]._id}`}>
                      <button className="px-4 py-2.5 bg-agri-green hover:bg-agri-green-hover text-white text-xs font-black rounded-xl transition shadow-md shadow-agri-green/25">
                        Bid Now
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-agri-green/5 dark:bg-white/5 p-4 rounded-2xl border border-agri-green/10">
                    <div>
                      <p className="text-[10px] font-bold text-agri-brown uppercase tracking-wider">Starting from</p>
                      <p className="text-2xl font-black text-agri-green">₹0<span className="text-xs font-semibold text-agri-brown">/kg</span></p>
                    </div>
                    <Link href="/auctions">
                      <button className="px-4 py-2.5 bg-agri-green hover:bg-agri-green-hover text-white text-xs font-black rounded-xl transition">
                        View Auctions
                      </button>
                    </Link>
                  </div>
                )}

                {/* Thumbnails of other auctions */}
                {auctions.length > 1 && (
                  <div className="flex gap-2">
                    {auctions.slice(1).map((auc, i) => (
                      <Link
                        key={auc.id || i}
                        href={`/auctions/${auc.id || auc._id}`}
                        className="flex-1 rounded-xl overflow-hidden relative h-14 bg-agri-green/10 group"
                      >
                        {auc.images?.[0] ? (
                          <img src={auc.images[0]} alt={auc.productName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Leaf className="w-5 h-5 text-agri-green/40" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-end p-1.5">
                          <p className="text-white text-[9px] font-bold truncate">{auc.productName}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── STATS TICKER ──────────────────────────────────────────────────── */}
      <section className="py-14 bg-agri-green-dark relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(102,187,106,0.15),transparent_60%)]" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="space-y-2"
                >
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center mx-auto">
                    <Icon className="w-5 h-5 text-agri-wheat" />
                  </div>
                  <p className="text-4xl sm:text-5xl font-black text-agri-wheat">
                    <AnimatedNumber target={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="text-xs text-white/50 font-bold uppercase tracking-widest">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ─────────────────────────────────────────────────── */}
      <section className="py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-xs font-extrabold text-agri-green dark:text-agri-green-light uppercase tracking-widest"
            >
              Why AgroVista
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl sm:text-5xl font-black text-agri-green-dark dark:text-white leading-tight"
            >
              Built for the future
              <br />
              of Indian agriculture
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-agri-brown dark:text-gray-400 text-sm sm:text-base"
            >
              From small family farms to large-scale operations, every grower deserves a fair, modern platform to reach buyers across the country.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="p-6 h-full rounded-3xl border-agri-green/5 hover:border-agri-green/20 hover:shadow-lg hover:shadow-agri-green/5 transition-all duration-300 group cursor-default">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${feat.color} transition-transform duration-300 group-hover:scale-110`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-extrabold text-agri-green-dark dark:text-white mb-2">{feat.title}</h3>
                    <p className="text-sm text-agri-brown dark:text-gray-400 leading-relaxed">{feat.description}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── LIVE AUCTIONS ─────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-zinc-900/50 border-y border-agri-green/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-14 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-extrabold text-agri-green dark:text-agri-green-light uppercase tracking-widest">Real-Time Trading</p>
              <h2 className="text-3xl sm:text-4xl font-black text-agri-green-dark dark:text-white">
                Live Auctions
              </h2>
              <p className="text-sm text-agri-brown dark:text-gray-400 max-w-md">
                Bid on fresh crop lots with complete price transparency and live competition.
              </p>
            </div>
            <Link href="/auctions" className="flex items-center gap-1.5 text-sm font-bold text-agri-green hover:text-agri-green-dark dark:hover:text-agri-green-light transition self-start sm:self-auto">
              See all auctions <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {auctions.length > 0
              ? auctions.map((auc, i) => (
                  <motion.div
                    key={auc.id || i}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="group relative border-agri-green/5 hover:border-agri-green/20 transition-all hover:shadow-xl hover:shadow-agri-green/5 rounded-3xl overflow-hidden">
                      <div className="relative h-48 w-full bg-agri-green/10">
                        <img
                          src={auc.images?.[0] || "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=600"}
                          alt={auc.productName || "Auction"}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute top-3 left-3 bg-red-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                          {auc.status || "LIVE"}
                        </div>
                        <div className="absolute bottom-3 left-4">
                          <p className="text-white font-black text-lg leading-tight drop-shadow-sm">
                            {auc.productName || "Crop lot"}
                          </p>
                          <p className="text-white/70 text-xs flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {auc.farmerLocation || "India"}
                          </p>
                        </div>
                      </div>

                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-3 bg-agri-green/5 dark:bg-white/5 p-3.5 rounded-2xl border border-agri-green/5">
                          <div>
                            <p className="text-[10px] text-agri-brown font-bold uppercase tracking-wider">Current Bid</p>
                            <p className="text-lg font-black text-agri-green">₹{auc.currentBid ?? auc.startingPrice ?? 0}/kg</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-agri-brown font-bold uppercase tracking-wider">Lot Size</p>
                            <p className="text-base font-extrabold text-agri-green-dark dark:text-agri-green-light">
                              {auc.lotSize || auc.quantity || 0} {auc.unit || "kg"}
                            </p>
                          </div>
                        </div>
                        <Link href={`/auctions/${auc.id || auc._id}`}>
                          <Button variant="outline" className="w-full py-2.5 rounded-xl text-xs font-bold hover:bg-agri-green hover:text-white hover:border-agri-green transition-all duration-200">
                            Enter Auction Room →
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  </motion.div>
                ))
              : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="md:col-span-3"
                >
                  <Card className="border-dashed border-agri-green/15 p-12 text-center rounded-3xl">
                    <Landmark className="w-10 h-10 text-agri-green/30 mx-auto mb-3" />
                    <h4 className="font-bold text-agri-green-dark dark:text-white mb-1">No live auctions right now</h4>
                    <p className="text-sm text-agri-brown dark:text-gray-400">
                      New auction lots are added daily. Check back soon or register to get notified.
                    </p>
                    <Link href="/signup" className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-agri-green hover:underline">
                      Get notified <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Card>
                </motion.div>
              )}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section className="py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20 space-y-3">
            <p className="text-xs font-extrabold text-agri-green dark:text-agri-green-light uppercase tracking-widest">Simple Process</p>
            <h2 className="text-4xl sm:text-5xl font-black text-agri-green-dark dark:text-white">How it works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <p className="text-xs font-extrabold text-agri-wheat-dark uppercase tracking-widest mb-6">For Farmers</p>
              <StepCard number={1} title="Create your profile" description="Register, verify your farm location, and get your trust score approved in under 24 hours." delay={0} />
              <StepCard number={2} title="List your produce" description="Add your crop details, quality photos, available quantity, and your minimum price." delay={0.1} />
              <StepCard number={3} title="Sell at the best price" description="Receive direct buyer offers or run a live auction to get the maximum competitive price." delay={0.2} />
            </div>
            <div>
              <p className="text-xs font-extrabold text-agri-green uppercase tracking-widest mb-6">For Buyers</p>
              <StepCard number={1} title="Browse verified listings" description="Filter by crop type, location, quality grade, and quantity — all listings are farmer-direct." delay={0.1} />
              <StepCard number={2} title="Bid or buy instantly" description="Join a live auction room or place a direct purchase order with one click." delay={0.2} />
              <StepCard number={3} title="Track your order" description="Follow your shipment in real-time from farm to delivery with full logistics visibility." delay={0.3} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-agri-green-dark relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(102,187,106,0.1),transparent_60%)]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16 space-y-3">
            <p className="text-xs font-extrabold text-agri-green-light uppercase tracking-widest">Real Voices</p>
            <h2 className="text-4xl font-black text-white">Trusted by farmers & buyers across India</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="bg-white/5 backdrop-blur rounded-3xl p-6 border border-white/10 space-y-4"
              >
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: t.rating }).map((_, s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-agri-wheat text-agri-wheat" />
                  ))}
                </div>
                <p className="text-sm text-white/80 leading-relaxed italic">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                  <div className="w-9 h-9 rounded-2xl bg-agri-green/30 text-agri-green-light font-black flex items-center justify-center text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-[11px] text-white/50">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-[2.5rem] p-10 sm:p-16 text-center space-y-6 border-agri-green/15 relative overflow-hidden"
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-agri-green/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-agri-wheat/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative space-y-3">
              <p className="text-xs font-extrabold text-agri-green dark:text-agri-green-light uppercase tracking-widest">Get started today</p>
              <h2 className="text-4xl sm:text-5xl font-black text-agri-green-dark dark:text-white">
                Ready to sell smarter?
              </h2>
              <p className="text-agri-brown dark:text-gray-400 text-base max-w-lg mx-auto">
                Join thousands of farmers and buyers who are already trading directly, transparently, and profitably on AgroVista.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative">
              <Link href="/signup">
                <Button variant="primary" size="lg" className="flex items-center gap-2 shadow-xl shadow-agri-green/20 w-full sm:w-auto">
                  Create Free Account
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/products">
                <Button variant="secondary" size="lg" className="border-agri-green/20 w-full sm:w-auto">
                  Explore Marketplace
                </Button>
              </Link>
            </div>
            <p className="text-xs text-agri-brown dark:text-gray-500 relative">
              Free to join • No hidden fees • Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 border-t border-agri-green/5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-agri-green">AgroVista</span>
            <span className="text-xs border border-agri-green/20 px-2 py-0.5 rounded-full text-agri-green font-bold">Direct</span>
          </div>
          <p className="text-xs text-agri-brown dark:text-gray-500 text-center">
            Connecting Indian farms to markets — fairly, transparently, and directly.
          </p>
          <div className="flex items-center gap-5 text-xs font-semibold text-agri-brown dark:text-gray-400">
            <Link href="/products" className="hover:text-agri-green transition">Marketplace</Link>
            <Link href="/auctions" className="hover:text-agri-green transition">Auctions</Link>
            <Link href="/signup" className="hover:text-agri-green transition">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
