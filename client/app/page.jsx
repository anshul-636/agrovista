"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Tractor,
  Landmark,
  Cpu,
  Clock,
  ArrowRight,
  ChevronRight,
  MapPin,
  AlertCircle
} from "lucide-react";
import Header from "../components/shared/Header";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { apiService } from "../lib/api";

export default function LandingPage() {
  const [auctions, setAuctions] = useState([]);
  const [summary, setSummary] = useState({ farmers: 0, buyers: 0, products: 0, auctions: 0, cities: 0 });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsRes, auctionsRes] = await Promise.all([
          apiService.getPublicStats(),
          apiService.getAuctions()
        ]);

        const stats = statsRes?.data || {};
        const liveAuctions = Array.isArray(auctionsRes?.data) ? auctionsRes.data : [];

        setAuctions(liveAuctions.slice(0, 3));

        setSummary({
          farmers: Number(stats.farmers || 0),
          buyers: Number(stats.buyers || 0),
          products: Number(stats.products || 0),
          auctions: Number(stats.auctions || liveAuctions.length || 0),
          cities: Number(stats.cities || 0)
        });
      } catch (error) {
        setAuctions([]);
        setSummary({ farmers: 0, buyers: 0, products: 0, auctions: 0, cities: 0 });
      }
    };

    loadData();
  }, []);

  const features = [
    {
      title: "Direct Marketplace",
      description: "Show only real farmer listings from the backend. No local demo products remain.",
      icon: Tractor,
      color: "text-agri-green bg-agri-green/5"
    },
    {
      title: "Live Auctions",
      description: "Auction cards render only real auction records or a clean empty state.",
      icon: Landmark,
      color: "text-agri-wheat-dark bg-agri-wheat/10"
    },
    {
      title: "Real-Time Chat",
      description: "Socket traffic now points to the backend only, without simulated replies or fake bids.",
      icon: Clock,
      color: "text-agri-brown bg-agri-brown/10"
    },
    {
      title: "Backend AI",
      description: "Pricing suggestions and dashboards now depend on actual API responses.",
      icon: Cpu,
      color: "text-agri-green bg-agri-green/5"
    }
  ];

  const stats = [
    { value: summary.farmers.toString(), label: "Farmers Listed" },
    { value: summary.buyers.toString(), label: "Buyers Registered" },
    { value: summary.products.toString(), label: "Products Listed" },
    { value: summary.auctions.toString(), label: "Auctions Hosted" },
    { value: summary.cities.toString(), label: "Cities Connected" }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-agri-cream dark:bg-zinc-950 text-current transition-colors">
      <Header />

      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute top-1/4 left-10 w-96 h-96 bg-agri-green/5 dark:bg-agri-green-light/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-agri-wheat/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-7 space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-card border-agri-green/10">
              <span className="w-2.5 h-2.5 bg-agri-green rounded-full" />
              <span className="text-[10px] sm:text-xs font-bold text-agri-green dark:text-agri-green-light tracking-wide uppercase">
                Real data only
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-agri-green-dark dark:text-agri-green-light leading-none tracking-tight">
              Connecting farms <br />
              to <span className="bg-gradient-to-r from-agri-green to-agri-green-light bg-clip-text text-transparent">real markets.</span>
            </h1>

            <p className="text-agri-brown dark:text-gray-300 text-sm sm:text-lg max-w-xl leading-relaxed">
              AgroVista now renders only backend data. If your database is empty, the site shows clean empty states instead of demo content.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link href="/products">
                <Button variant="primary" size="lg" className="flex items-center gap-2">
                  Explore Marketplace
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/auctions">
                <Button variant="secondary" size="lg" className="border-agri-green/30">
                  View Auctions
                </Button>
              </Link>
            </div>
          </motion.div>

          <div className="lg:col-span-5">
            <Card className="p-6 rounded-[2rem] border-agri-green/10 shadow-xl space-y-4">
              <div className="relative h-64 w-full rounded-2xl overflow-hidden bg-gradient-to-br from-agri-green/10 to-agri-wheat/5 flex items-end">
                <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/90 px-3 py-1 rounded-full text-[10px] font-bold text-agri-green-dark flex items-center gap-1.5 shadow">
                  <Landmark className="w-3.5 h-3.5" />
                  {auctions[0]?.productName || "No live auction data"}
                </div>
                <div className="absolute inset-0 flex items-center justify-center text-center px-6">
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase text-agri-brown">Live Preview</p>
                    <h3 className="text-2xl font-black text-agri-green-dark dark:text-agri-green-light">
                      {auctions[0]?.productName || "Empty until real records exist"}
                    </h3>
                    <p className="text-xs text-agri-brown">
                      {auctions[0]?.farmerLocation || "No auction location available"}
                    </p>
                  </div>
                </div>
              </div>

              {auctions.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-extrabold text-agri-green-dark dark:text-agri-green-light truncate">
                        {auctions[0].productName || auctions[0].product?.name || "Live auction"}
                      </h4>
                      <p className="text-xs text-agri-brown">{auctions[0].farmerLocation || auctions[0].farmer?.location || "Location not available"}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-agri-green/15 text-agri-green text-[10px] font-bold">
                      {auctions[0].status || "LIVE"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-agri-green/5 dark:bg-white/5 p-4 rounded-2xl border border-agri-green/5">
                    <div>
                      <p className="text-[10px] font-bold text-agri-brown uppercase">Current Bid</p>
                      <p className="text-2xl font-black text-agri-green">
                        ₹{auctions[0].currentBid ?? auctions[0].startingPrice ?? 0}
                        <span className="text-xs font-semibold">/kg</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-agri-brown uppercase">Lot Size</p>
                      <p className="text-sm font-extrabold text-agri-green-dark dark:text-agri-green-light">{auctions[0].lotSize || auctions[0].quantity || 0} {auctions[0].unit || "kg"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-2xl border border-dashed border-agri-green/10 p-5 bg-agri-green/5">
                  <p className="text-sm font-bold text-agri-green-dark dark:text-agri-green-light">No live auction data yet</p>
                  <p className="text-xs text-agri-brown">Create a real auction from the backend and it will appear here automatically.</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-br from-agri-green-dark to-[#092B0F] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 text-center">
            {stats.map((stat, idx) => (
              <div key={idx} className="space-y-2">
                <p className="text-4xl sm:text-5xl font-black text-agri-wheat tracking-tight">{stat.value}</p>
                <p className="text-xs sm:text-sm text-white/60 font-bold uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-white dark:bg-zinc-900 border-y border-agri-green/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-xs font-extrabold text-agri-green dark:text-agri-green-light uppercase tracking-wider">What remains</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-agri-green-dark dark:text-white tracking-tight">Only real backend content</h3>
            <p className="text-sm sm:text-base text-agri-brown dark:text-gray-400">
              No local mock lists, fake dashboards, or simulated chat and auction responses remain in the UI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <Card key={idx} className="p-6 rounded-3xl border-agri-green/5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${feat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-extrabold text-agri-green-dark dark:text-agri-green-light">{feat.title}</h4>
                  <p className="text-xs sm:text-sm text-agri-brown dark:text-gray-400 mt-2.5 leading-relaxed">{feat.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-16 gap-4">
            <div className="space-y-3">
              <h2 className="text-xs font-extrabold text-agri-green dark:text-agri-green-light uppercase tracking-wider">Real-Time Trading</h2>
              <h3 className="text-3xl sm:text-4xl font-black text-agri-green-dark dark:text-white tracking-tight">Live Auctions Preview</h3>
            </div>
            <Link href="/auctions" className="text-sm font-bold text-agri-green hover:underline flex items-center gap-1.5 self-start">
              See All Live Auctions <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {auctions.length > 0 ? auctions.map((auc) => (
              <Card key={auc.id || auc._id} className="relative border-agri-green/5 p-6 space-y-4">
                <div className="relative h-48 w-full rounded-2xl overflow-hidden bg-agri-green/10">
                  <img
                    src={auc.image || auc.images?.[0] || "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=600"}
                    alt={auc.productName || auc.product?.name || "Auction lot"}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    {auc.status || "LIVE"}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-base font-extrabold text-agri-green-dark dark:text-agri-green-light truncate">
                    {auc.productName || auc.product?.name || "Auction lot"}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-agri-brown">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{auc.farmerLocation || auc.farmer?.location || "Location not available"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-agri-green/5 dark:bg-white/5 p-3.5 rounded-2xl border border-agri-green/5 text-xs">
                  <div>
                    <p className="text-[10px] text-agri-brown font-bold uppercase">Current Bid</p>
                    <p className="text-lg font-black text-agri-green">₹{auc.currentBid ?? auc.startingPrice ?? 0}/kg</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-agri-brown font-bold uppercase">Lot Size</p>
                    <p className="text-base font-extrabold text-agri-green-dark dark:text-agri-green-light">{auc.lotSize || auc.quantity || 0} {auc.unit || "kg"}</p>
                  </div>
                </div>

                <Link href={`/auctions/${auc.id || auc._id}`}>
                  <Button variant="outline" className="w-full py-2.5 rounded-xl mt-2 text-xs font-bold">
                    Enter Auction Room
                  </Button>
                </Link>
              </Card>
            )) : (
              <Card className="md:col-span-3 border-agri-green/5 p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-agri-green mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-agri-green-dark dark:text-agri-green-light">No live auctions yet</h4>
                    <p className="text-xs text-agri-brown mt-1">Create real auctions from the backend to show marketplace content here.</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </section>

      <section className="py-24 bg-white dark:bg-zinc-900 border-y border-agri-green/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border-agri-green/5 p-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-agri-green mt-0.5" />
              <div>
                <h3 className="text-lg font-black text-agri-green-dark dark:text-agri-green-light">Real data only mode</h3>
                <p className="text-sm text-agri-brown dark:text-gray-300 mt-2 leading-relaxed">
                  The landing page now shows only backend data or empty states. Create real records from the app and they will appear here automatically.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}