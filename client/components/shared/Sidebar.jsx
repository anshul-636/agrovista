"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Landmark,
  FileText,
  Heart,
  MessageSquare,
  Settings,
  User,
  PlusCircle,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  if (!user) return null;

  const farmerLinks = [
    { label: "Overview", href: "/dashboard/farmer", icon: LayoutDashboard },
    { label: "My Listings", href: "/products?farmer=mine", icon: ShoppingBag },
    { label: "Create Product", href: "/products/create", icon: PlusCircle },
    { label: "Incoming Orders", href: "/orders", icon: FileText },
    { label: "My Auctions", href: "/auctions?owner=mine", icon: Landmark },
    { label: "Create Auction", href: "/auctions/create", icon: PlusCircle },
  ];

  const buyerLinks = [
    { label: "Overview", href: "/dashboard/buyer", icon: LayoutDashboard },
    { label: "Marketplace", href: "/products", icon: ShoppingBag },
    { label: "My Orders", href: "/orders", icon: FileText },
    { label: "Live Auctions", href: "/auctions", icon: Landmark },
    { label: "Watchlist", href: "/dashboard/buyer?tab=watchlist", icon: Heart },
    { label: "Chat Support", href: "/messages", icon: MessageSquare },
  ];

  const links = user.role === "FARMER" ? farmerLinks : buyerLinks;

  const utilityLinks = [
    { label: "My Profile", href: "/profile", icon: User },
    { label: "Account Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 hidden lg:flex flex-col gap-6 p-6 h-[calc(100vh-5rem)] sticky top-20 border-r border-agri-green/5 bg-white/20 dark:bg-black/10 backdrop-blur-md">
      {/* Dashboard Nav Brand Title */}
      <div className="px-3">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-agri-brown-light">
          Navigation Portal
        </p>
        <p className="text-lg font-black text-agri-green-dark dark:text-agri-green-light mt-1">
          {user.role === "FARMER" ? "🌾 Farmer Center" : "🛒 Buyer Portal"}
        </p>
      </div>

      {/* Main Links */}
      <div className="flex flex-col gap-1.5 flex-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                isActive
                  ? "bg-agri-green text-white shadow-md shadow-agri-green/10"
                  : "text-agri-brown dark:text-gray-300 hover:bg-agri-green/5 dark:hover:bg-agri-green-light/5"
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Profile & Settings Utilities */}
      <div className="flex flex-col gap-1.5 border-t border-agri-green/5 pt-4">
        {utilityLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-agri-green/10 text-agri-green dark:bg-agri-green-light/10 dark:text-agri-green-light"
                  : "text-agri-brown/80 dark:text-gray-400 hover:bg-agri-green/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
