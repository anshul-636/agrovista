"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, MapPin, Star, ShieldCheck, Heart, Tractor, ArrowUpDown } from "lucide-react";
import Header from "../../components/shared/Header";
import { Card, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Input from "../../components/ui/Input";
import { apiService } from "../../lib/api";
import Link from "next/link";

export default function ProductListingPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [isOrganic, setIsOrganic] = useState(false);
  const [sortBy, setSortBy] = useState("price_asc");

  // Fetch products with TanStack Query
  const { data: productsRes, isLoading, refetch } = useQuery({
    queryKey: ["products", { search, category, isOrganic }],
    queryFn: () => apiService.getProducts({ search, category, isOrganic }),
  });

  const products = Array.isArray(productsRes?.data) ? productsRes.data : [];

  // Client side sorting
  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === "price_asc") return a.price - b.price;
    if (sortBy === "price_desc") return b.price - a.price;
    if (sortBy === "trust_desc") return b.farmerTrustScore - a.farmerTrustScore;
    return 0;
  });

  const categories = ["All", "Vegetables", "Grains", "Fruits"];

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 text-current transition-colors pb-16">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
            AgroVista Marketplace
          </h1>
          <p className="text-xs sm:text-sm text-agri-brown mt-1">
            Browse and source fresh crops directly from verified farms.
          </p>
        </div>

        {/* Filter bar */}
        <div className="glass-card p-4 rounded-3xl border-agri-green/5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Search */}
            <div className="md:col-span-5 relative">
              <Search className="absolute left-4 top-3.5 w-4.5 h-4.5 text-agri-brown" />
              <input
                type="text"
                placeholder="Search tomato, potatoes, rice..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border text-sm bg-white dark:bg-black/20 border-agri-green/10 focus:outline-none focus:ring-2 focus:ring-agri-green/20 focus:border-agri-green"
              />
            </div>

            {/* Sorting */}
            <div className="md:col-span-3 flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-agri-green shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full p-3 rounded-2xl border text-xs font-bold uppercase bg-white dark:bg-black/20 border-agri-green/10 focus:outline-none focus:ring-2 focus:ring-agri-green/20 focus:border-agri-green"
              >
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="trust_desc">Farmer Trust Score</option>
              </select>
            </div>

            {/* Organic Toggler */}
            <div className="md:col-span-4 flex items-center justify-between sm:justify-end gap-3 px-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-agri-green-dark dark:text-agri-green-light">
                <input
                  type="checkbox"
                  checked={isOrganic}
                  onChange={(e) => setIsOrganic(e.target.checked)}
                  className="rounded border-agri-green/25 text-agri-green focus:ring-agri-green w-4 h-4"
                />
                <span>Organic Certified Only</span>
              </label>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 border-t border-agri-green/5 pt-3 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-xl transition whitespace-nowrap ${
                  category === cat
                    ? "bg-agri-green text-white shadow-sm"
                    : "bg-white/40 dark:bg-black/20 text-agri-brown hover:bg-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="glass-card rounded-3xl p-4 space-y-4 animate-pulse">
                <div className="h-40 w-full bg-gray-200 dark:bg-zinc-800 rounded-2xl" />
                <div className="h-4 w-2/3 bg-gray-200 dark:bg-zinc-800 rounded" />
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-20 bg-white/40 dark:bg-black/10 rounded-3xl border border-agri-green/5">
            <Tractor className="w-12 h-12 text-agri-brown mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-bold text-agri-green-dark">No Products Found</h3>
            <p className="text-xs text-agri-brown mt-1.5">Modify your filters or search term to discover listings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sortedProducts.map((prod) => (
              <Card key={prod.id} hoverEffect className="border-agri-green/5 p-4 flex flex-col justify-between h-[420px]">
                <div className="space-y-4 w-full">
                  {/* Card Image */}
                  <div className="relative h-40 w-full rounded-2xl overflow-hidden bg-agri-green/10 group">
                    <img
                      src={prod.images[0]}
                      alt={prod.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {prod.isOrganic && (
                      <div className="absolute top-2.5 left-2.5">
                        <Badge variant="green" size="sm">Organic</Badge>
                      </div>
                    )}
                    <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-black text-agri-wheat flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current text-agri-wheat" />
                      <span>{prod.farmerTrustScore}% Trust</span>
                    </div>
                  </div>

                  {/* Header metadata */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-agri-brown">
                      <MapPin className="w-3.5 h-3.5 text-agri-brown shrink-0" />
                      <span className="truncate">{prod.farmerLocation}</span>
                    </div>
                    <Link href={`/products/${prod.id}`}>
                      <h4 className="text-sm font-extrabold text-agri-green-dark dark:text-agri-green-light hover:underline truncate">
                        {prod.name}
                      </h4>
                    </Link>
                    <p className="text-[10px] text-agri-brown truncate">Grower: {prod.farmerName}</p>
                  </div>
                </div>

                {/* Footer details */}
                <div className="border-t border-agri-green/5 pt-3 mt-3 w-full space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[9px] text-agri-brown font-bold uppercase">Price</span>
                      <p className="text-base font-black text-agri-green leading-none">
                        ₹{prod.price} <span className="text-[10px] font-semibold">/ {prod.unit}</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] text-agri-brown font-bold uppercase block text-right">Available</span>
                      <p className="text-xs font-bold text-agri-green-dark dark:text-agri-green-light">
                        {prod.quantity} {prod.unit}
                      </p>
                    </div>
                  </div>

                  <Link href={`/products/${prod.id}`} className="block w-full">
                    <Button variant="outline" className="w-full py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1">
                      View details
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
