"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Tractor,
  TrendingUp,
  Landmark,
  ShieldCheck,
  Cpu,
  BarChart3,
  MapPin,
  Clock,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Star
} from "lucide-react";
import Header from "../components/shared/Header";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { mockAuctions } from "../lib/api";

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 15 }
    }
  };

  const floatingVariants = {
    animate: {
      y: [0, -12, 0],
      transition: {
        duration: 4,
        ease: "easeInOut",
        repeat: Infinity
      }
    }
  };

  const statistics = [
    { value: "12K+", label: "Farmers Joined" },
    { value: "45K+", label: "Orders Completed" },
    { value: "3.2K+", label: "Auctions Hosted" },
    { value: "120+", label: "Cities Connected" }
  ];

  const features = [
    {
      title: "Direct Marketplace",
      description: "Connect directly with growers. Save middleman margins of up to 35% on fresh crops.",
      icon: Tractor,
      color: "text-agri-green bg-agri-green/5"
    },
    {
      title: "Live Auctions",
      description: "Bidding lists update in real-time. Lock in fair market value under transparent bidding rooms.",
      icon: Landmark,
      color: "text-agri-wheat-dark bg-agri-wheat/10"
    },
    {
      title: "AI Price suggestions",
      description: "Uses advanced OpenAI models to recommend optimal pricing based on location and supply indices.",
      icon: Cpu,
      color: "text-agri-brown bg-agri-brown/10"
    },
    {
      title: "Real-time Tracking",
      description: "Receive push status updates immediately. Track packing, dispatch, and final mileage delivery stages.",
      icon: Clock,
      color: "text-agri-green bg-agri-green/5"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-agri-cream dark:bg-zinc-950 text-current transition-colors">
      <Header />

      {/* 1. HERO SECTION */}
      <section className="relative min-h-[calc(100vh-5rem)] flex items-center py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Wheat floating background objects */}
        <div className="absolute top-1/4 left-10 w-96 h-96 bg-agri-green/5 dark:bg-agri-green-light/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-agri-wheat/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
          {/* Hero text */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-7 space-y-6 sm:space-y-8"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-card border-agri-green/10">
              <span className="w-2.5 h-2.5 bg-agri-green rounded-full animate-ping" />
              <span className="text-[10px] sm:text-xs font-bold text-agri-green dark:text-agri-green-light tracking-wide uppercase">
                Bridging the Gap: Farm to Table, Direct
              </span>
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-4xl sm:text-6xl font-black text-agri-green-dark dark:text-agri-green-light leading-none tracking-tight">
              Connecting Farms <br />
              to <span className="bg-gradient-to-r from-agri-green to-agri-green-light bg-clip-text text-transparent">Future Markets.</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-agri-brown dark:text-gray-300 text-sm sm:text-lg max-w-xl leading-relaxed">
              AgroVista is a premium B2B agriculture platform connecting verified growers and buyers. Place bids in live rooms, secure AI pricing indicators, and track logistics in real-time.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4">
              <Link href="/products">
                <Button variant="primary" size="lg" className="flex items-center gap-2">
                  Explore Marketplace
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="secondary" size="lg" className="border-agri-green/30">
                  Start Selling
                </Button>
              </Link>
              <Link href="/auctions">
                <Button variant="ghost" className="text-agri-green-dark dark:text-agri-green-light font-bold flex items-center gap-1.5">
                  View Live Auctions
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>

            {/* Trusted indicators */}
            <motion.div variants={itemVariants} className="pt-6 sm:pt-8 border-t border-agri-green/5 flex items-center gap-4">
              <div className="flex -space-x-3">
                {[...Array(4)].map((_, i) => (
                  <img
                    key={i}
                    className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-950 object-cover"
                    src={`https://images.unsplash.com/photo-${[
                      "1534528741775-53994a69daeb",
                      "1507003211169-0a1dd7228f2d",
                      "1500648767791-00dcc994a43e",
                      "1494790108377-be9c29b29330"
                    ][i]}?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80`}
                    alt="User avatar"
                  />
                ))}
              </div>
              <p className="text-xs font-semibold text-agri-brown">
                Trusted by thousands of commercial buyers and farmers across India.
              </p>
            </motion.div>
          </motion.div>

          {/* Hero graphics */}
          <div className="lg:col-span-5 flex justify-center items-center relative">
            {/* Background glowing rings */}
            <div className="absolute inset-0 w-80 h-80 bg-agri-wheat/10 rounded-full blur-xl -z-10 animate-pulse" />

            <motion.div
              variants={floatingVariants}
              animate="animate"
              className="w-full max-w-sm glass-card p-6 rounded-[2.5rem] shadow-2xl relative border-agri-green/10"
            >
              {/* Illustration element */}
              <div className="relative h-64 w-full rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-agri-green/10 to-agri-wheat/5">
                <img
                  src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
                  alt="Agriculture farmland crop fields"
                  className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-90 transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/90 px-3 py-1 rounded-full text-[10px] font-bold text-agri-green-dark flex items-center gap-1.5 shadow">
                  <Landmark className="w-3.5 h-3.5" /> Live Auction Lot #42
                </div>
              </div>

              {/* Mock bid info block */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-extrabold text-agri-green-dark dark:text-agri-green-light">Organic Basmati Rice</h4>
                    <p className="text-xs text-agri-brown">Karnal, Haryana</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-agri-green/15 text-agri-green text-[10px] font-bold">
                    1000 kg Lot
                  </span>
                </div>

                <div className="flex items-center justify-between bg-agri-green/5 dark:bg-white/5 p-4 rounded-2xl border border-agri-green/5">
                  <div>
                    <p className="text-[10px] font-bold text-agri-brown uppercase">Current High Bid</p>
                    <p className="text-2xl font-black text-agri-green">₹98<span className="text-xs font-semibold">/kg</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-agri-brown uppercase">Remaining Time</p>
                    <p className="text-sm font-extrabold text-red-500 animate-pulse">18 min 24 sec</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. FEATURES SECTION */}
      <section className="py-24 bg-white dark:bg-zinc-900 border-y border-agri-green/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-xs font-extrabold text-agri-green dark:text-agri-green-light uppercase tracking-wider">
              Why Choose AgroVista?
            </h2>
            <h3 className="text-3xl sm:text-4xl font-black text-agri-green-dark dark:text-white tracking-tight">
              Empowering agriculture with modern tech
            </h3>
            <p className="text-sm sm:text-base text-agri-brown dark:text-gray-400">
              We cut out intermediaries, leverage machine learning pricing models, and run high-efficiency bidding queues.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ y: -5 }}
                  className="glass-card p-6 rounded-3xl relative border-agri-green/5"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${feat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-extrabold text-agri-green-dark dark:text-agri-green-light">
                    {feat.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-agri-brown dark:text-gray-400 mt-2.5 leading-relaxed">
                    {feat.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. STATISTICS SECTION */}
      <section className="py-16 bg-gradient-to-br from-agri-green-dark to-[#092B0F] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {statistics.map((stat, idx) => (
              <div key={idx} className="space-y-2">
                <p className="text-4xl sm:text-5xl font-black text-agri-wheat tracking-tight">
                  {stat.value}
                </p>
                <p className="text-xs sm:text-sm text-white/60 font-bold uppercase tracking-wider">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. LIVE AUCTIONS PREVIEW */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-16 gap-4">
            <div className="space-y-3">
              <h2 className="text-xs font-extrabold text-agri-green dark:text-agri-green-light uppercase tracking-wider">
                Real-Time Trading
              </h2>
              <h3 className="text-3xl sm:text-4xl font-black text-agri-green-dark dark:text-white tracking-tight">
                Live Auctions Preview
              </h3>
            </div>
            <Link
              href="/auctions"
              className="text-sm font-bold text-agri-green hover:underline flex items-center gap-1.5 self-start"
            >
              See All Live Auctions <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {mockAuctions.map((auc) => (
              <Card key={auc.id} hoverEffect className="relative border-agri-green/5 p-6 space-y-4">
                <div className="relative h-48 w-full rounded-2xl overflow-hidden bg-agri-green/10">
                  <img
                    src={auc.images[0]}
                    alt={auc.productName}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    LIVE
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-base font-extrabold text-agri-green-dark dark:text-agri-green-light truncate">
                    {auc.productName}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-agri-brown">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{auc.farmerLocation}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-agri-green/5 dark:bg-white/5 p-3.5 rounded-2xl border border-agri-green/5 text-xs">
                  <div>
                    <p className="text-[10px] text-agri-brown font-bold uppercase">Current Bid</p>
                    <p className="text-lg font-black text-agri-green">₹{auc.currentBid}/kg</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-agri-brown font-bold uppercase">Lot Size</p>
                    <p className="text-base font-extrabold text-agri-green-dark dark:text-agri-green-light">{auc.lotSize} {auc.unit}</p>
                  </div>
                </div>

                <Link href={`/auctions/${auc.id}`}>
                  <Button variant="outline" className="w-full py-2.5 rounded-xl mt-2 text-xs font-bold">
                    Enter Auction Room
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5. TESTIMONIALS SECTION */}
      <section className="py-24 bg-white dark:bg-zinc-900 border-y border-agri-green/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-xs font-extrabold text-agri-green dark:text-agri-green-light uppercase tracking-wider">
              Testimonials
            </h2>
            <h3 className="text-3xl sm:text-4xl font-black text-agri-green-dark dark:text-white tracking-tight">
              Growers & buyers sharing reviews
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "AgroVista changed everything for my farm. I bypass local mandi cartels and sell onions directly to Bangalore outlets, increasing my profit margins by 40%.",
                author: "Dinesh Patel",
                role: "Onion Grower, Gujarat",
                rating: 5,
                avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80"
              },
              {
                quote: "As a retail chef, sourcing bulk organic basmati rice with guaranteed harvest dates was a headache. Now I bid in live lots, chat with farmers, and track transit live.",
                author: "Chef Vikram Sen",
                role: "Taj Group Hospitality",
                rating: 5,
                avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80"
              },
              {
                quote: "The AI pricing advisor tool suggested listing my Kashmiri delicious apples at ₹160/kg. They sold out in 3 days! The trust score rating keeps client inquiries serious.",
                author: "Waseem Bhat",
                role: "Orchard Owner, Kashmir",
                rating: 5,
                avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80"
              }
            ].map((t, idx) => (
              <div key={idx} className="glass-card p-6 sm:p-8 rounded-3xl relative border-agri-green/5 flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 mb-4 text-agri-wheat">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-agri-brown dark:text-gray-300 italic leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>
                <div className="flex items-center gap-3.5 mt-6 pt-6 border-t border-agri-green/5">
                  <img
                    src={t.avatar}
                    alt={t.author}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <h5 className="text-sm font-extrabold text-agri-green-dark dark:text-white">{t.author}</h5>
                    <p className="text-[10px] text-agri-brown font-bold">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. AI PRICING SECTION */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-80 h-80 bg-agri-green/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6 sm:space-y-8">
            <h2 className="text-xs font-extrabold text-agri-green dark:text-agri-green-light uppercase tracking-wider">
              Smart Market AI
            </h2>
            <h3 className="text-3xl sm:text-4xl font-black text-agri-green-dark dark:text-white tracking-tight">
              AI-Powered Pricing Suggestion
            </h3>
            <p className="text-sm sm:text-base text-agri-brown dark:text-gray-300 leading-relaxed">
              When launching a crop listing, AgroVista&apos;s AI engine runs aggregated SQL data matrices for category, region, season patterns, and rainfall indexes to outline the absolute optimal recommended pricing range.
            </p>

            <div className="space-y-4">
              {[
                "OpenAI GPT-4o-mini integration",
                "Analyzes supply curves and seasonal factors",
                "Contextual market explanation cards"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-agri-green-dark dark:text-agri-green-light">
                  <ShieldCheck className="w-5 h-5 text-agri-green shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md glass-card p-6 sm:p-8 rounded-[2rem] shadow-xl border-agri-green/10 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold border border-agri-green/20 px-2 py-0.5 rounded-full text-agri-green dark:text-agri-green-light flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> AI Price Advisor
                </span>
                <span className="text-[10px] text-agri-brown font-bold">Model: GPT-4o-mini</span>
              </div>

              <div className="p-4 bg-agri-green/5 dark:bg-white/5 rounded-2xl border border-agri-green/5 space-y-3">
                <p className="text-xs text-agri-brown font-bold uppercase">Recommended price Range</p>
                <p className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light">₹42 - ₹54 <span className="text-sm font-bold text-agri-brown">per kg</span></p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-agri-brown uppercase">Context Analysis</h4>
                <p className="text-xs text-agri-brown dark:text-gray-300 leading-relaxed bg-white/40 dark:bg-black/20 p-4 rounded-xl border border-agri-green/5">
                  Regional onion supply in Maharashtra is down by 14% due to delayed harvesting. Suggest starting bidding base at ₹35/kg. Commercial retail outlets in Delhi show high organic-tag search rates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. ANALYTICS SHOWCASE */}
      <section className="py-24 bg-white dark:bg-zinc-900 border-y border-agri-green/5 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 w-96 h-96 bg-agri-green/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 flex justify-center order-last lg:order-first">
            <div className="w-full max-w-md glass-card p-6 rounded-[2rem] shadow-xl border-agri-green/10 space-y-4">
              <div className="flex items-center justify-between border-b border-agri-green/5 pb-4">
                <h4 className="font-extrabold text-sm text-agri-green-dark dark:text-agri-green-light">Revenue Trend Analytics</h4>
                <span className="text-[10px] bg-agri-green/15 text-agri-green px-2 py-0.5 rounded-full font-bold">This Week</span>
              </div>
              {/* Mock Chart Illustration */}
              <div className="h-48 w-full flex items-end justify-between gap-2.5 pt-6 select-none">
                {[45, 60, 35, 78, 55, 84, 98].map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <motion.div
                      initial={{ height: 0 }}
                      whileInView={{ height: `${val}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="w-full bg-gradient-to-t from-agri-green to-agri-green-light rounded-t-lg"
                    />
                    <span className="text-[9px] font-semibold text-agri-brown">M{i+1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6 sm:space-y-8">
            <h2 className="text-xs font-extrabold text-agri-green dark:text-agri-green-light uppercase tracking-wider">
              SaaS Analytics
            </h2>
            <h3 className="text-3xl sm:text-4xl font-black text-agri-green-dark dark:text-white tracking-tight">
              Farmer Analytics Showcase
            </h3>
            <p className="text-sm sm:text-base text-agri-brown dark:text-gray-300 leading-relaxed">
              Every farmer account features interactive charts covering weekly revenue trends, top-performing listings by volume, category percentage splits, and aggregated completed order metrics.
            </p>
            <div className="pt-2">
              <Link href="/signup?role=FARMER">
                <Button variant="primary" className="flex items-center gap-2">
                  Create Farmer Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CTA SECTION */}
      <section className="py-24 relative overflow-hidden bg-gradient-to-br from-agri-green-dark to-[#092B0F] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] -z-10" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            Ready to grow your business <br />
            with <span className="text-agri-wheat">AgroVista?</span>
          </h2>
          <p className="text-white/70 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Join thousands of commercial food processors, retail outlets, and independent growers in a fair, secure, and direct digital trade platform.
          </p>

          <div className="flex flex-wrap justify-center items-center gap-4">
            <Link href="/signup">
              <Button variant="accent" size="lg">
                Create Free Account
              </Button>
            </Link>
            <Link href="/products">
              <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10">
                Explore Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 9. FOOTER SECTION */}
      <footer className="bg-zinc-950 text-white/60 py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Logo & Pitch */}
          <div className="space-y-4 md:col-span-1">
            <h4 className="text-xl font-black text-white">AgroVista</h4>
            <p className="text-xs leading-relaxed">
              Connecting farms to future markets. Direct agricultural platform facilitating transparent wholesale listings and live auction bidding rooms.
            </p>
          </div>

          {/* Links 1 */}
          <div>
            <h5 className="text-white font-extrabold text-sm mb-4">Marketplace</h5>
            <ul className="space-y-2 text-xs">
              <li><Link href="/products" className="hover:text-white transition">All Fresh Crops</Link></li>
              <li><Link href="/products?category=Vegetables" className="hover:text-white transition">Vegetable Lots</Link></li>
              <li><Link href="/products?category=Grains" className="hover:text-white transition">Grains & Pulses</Link></li>
              <li><Link href="/auctions" className="hover:text-white transition">Live Bidding Rooms</Link></li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h5 className="text-white font-extrabold text-sm mb-4">Company</h5>
            <ul className="space-y-2 text-xs">
              <li><Link href="#" className="hover:text-white transition">About Us</Link></li>
              <li><Link href="#" className="hover:text-white transition">Trade Policies</Link></li>
              <li><Link href="#" className="hover:text-white transition">Farmer Trust Index</Link></li>
              <li><Link href="#" className="hover:text-white transition">Contact Portal</Link></li>
            </ul>
          </div>

          {/* Legal / Socials */}
          <div className="space-y-4">
            <h5 className="text-white font-extrabold text-sm mb-4">Security</h5>
            <p className="text-xs leading-relaxed">
              Escrow guarantees, verified identities, and encrypted JWT authorizations protect every transaction on AgroVista.
            </p>
            <div className="pt-2 text-[10px] text-white/30">
              © {new Date().getFullYear()} AgroVista Inc. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
