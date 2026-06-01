"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Sun, Moon, LogOut, User, Settings, ShoppingBag, Landmark, MessageSquare, Menu, X } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useNotificationStore } from "../../store/notificationStore";
import { getSocket } from "../../lib/socket";
import { useCartStore } from "../../store/cartStore";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { unreadCount, addNotification } = useNotificationStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cartItems = useCartStore((s) => s.items);
  const cartCount = cartItems.length;


  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ─── SOCKET: global notification + order listeners ──────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();
    if (!socket) return;

    const handleNotification = (notif) => {
      addNotification(notif);
    };

    const handleOrderNew = () => {
      addNotification({
        type: "ORDER",
        title: "New Order Received!",
        body: "A buyer just placed an order on your listing.",
        link: "/dashboard/farmer",
      });
    };

    const handleOrderUpdated = (data) => {
      addNotification({
        type: "ORDER",
        title: "Order Status Updated",
        body: `Your order status changed to ${data?.status || "updated"}.`,
        link: "/orders",
      });
    };

    socket.on("notification:new", handleNotification);
    socket.on("order:new", handleOrderNew);
    socket.on("order:updated", handleOrderUpdated);

    return () => {
      socket.off("notification:new", handleNotification);
      socket.off("order:new", handleOrderNew);
      socket.off("order:updated", handleOrderUpdated);
    };
  }, [isAuthenticated, addNotification]);
  // ────────────────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const navLinks = [
    { label: "Marketplace", href: "/products", icon: ShoppingBag },
    { label: "Auctions", href: "/auctions", icon: Landmark },
  ];

  if (isAuthenticated && user) {
    const dashHref = user.role === "FARMER" ? "/dashboard/farmer" : "/dashboard/buyer";
    navLinks.unshift({ label: "Dashboard", href: dashHref, icon: Landmark });
    navLinks.push(
      { label: "Messages", href: "/messages", icon: MessageSquare },
      { label: "Notifications", href: "/notifications", icon: Bell }
    );
  }

  return (
    <nav className="glass-nav sticky top-0 z-40 w-full transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-agri-green to-agri-green-light bg-clip-text text-transparent tracking-tight">
                AgroVista
              </span>
              <span className="text-xs font-bold border border-agri-green/20 px-2 py-0.5 rounded-full text-agri-green dark:text-agri-green-light">
                Direct
              </span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  className={`text-sm font-semibold flex items-center gap-1.5 transition-all hover:text-agri-green ${
                    isActive
                      ? "text-agri-green dark:text-agri-green-light font-bold"
                      : "text-agri-brown dark:text-gray-300"
                  }`}
                >
                  {link.label === "Notifications" ? (
                    <div className="relative flex items-center">
                      <Bell className="w-4 h-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-agri-wheat rounded-full text-[9px] font-black text-agri-green-dark flex items-center justify-center animate-pulse">
                          {unreadCount}
                        </span>
                      )}
                      <span className="ml-1.5">{link.label}</span>
                    </div>
                  ) : (
                    <>
                      <Icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Action Items */}
          <div className="hidden md:flex items-center gap-4">
            {/* ✅ FIX: Theme toggle only renders after mount to avoid sun/moon mismatch */}
            {mounted && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2.5 rounded-2xl bg-agri-green/5 dark:bg-agri-green-light/5 text-agri-green dark:text-agri-green-light hover:bg-agri-green/10 transition"
                aria-label="Toggle Theme"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </motion.button>
            )}

            {mounted && isAuthenticated && user && user.role === "BUYER" && (
              <Link
                href="/cart"
                className="relative p-2.5 rounded-2xl bg-agri-green/5 dark:bg-agri-green-light/5 text-agri-green dark:text-agri-green-light hover:bg-agri-green/10 transition animate-float"
                aria-label="Shopping Cart"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-agri-green rounded-full text-[9px] font-black text-white flex items-center justify-center animate-pulse">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            {/* ✅ FIX: Auth UI only renders after mount to avoid isAuthenticated mismatch */}
            {mounted && (
              isAuthenticated && user ? (
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 focus:outline-none"
                  >
                    <img
                      src={user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"}
                      alt={user.name}
                      className="w-10 h-10 rounded-2xl object-cover ring-2 ring-agri-green/20"
                    />
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-3 w-56 glass-card rounded-2xl shadow-xl z-20 py-2"
                        >
                          <div className="px-4 py-2.5 border-b border-agri-green/5">
                            <p className="text-xs font-bold text-agri-brown dark:text-gray-400">Signed in as</p>
                            <p className="text-sm font-black truncate text-agri-green-dark dark:text-agri-green-light">{user.name}</p>
                            <span className="inline-block mt-1 text-[10px] font-extrabold uppercase bg-agri-green/10 text-agri-green px-2 py-0.5 rounded-full">
                              {user.role}
                            </span>
                          </div>

                          <Link
                            href="/profile"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-agri-brown dark:text-gray-300 hover:bg-agri-green/5 dark:hover:bg-agri-green-light/5 transition"
                          >
                            <User className="w-4 h-4" /> Profile Details
                          </Link>
                          <Link
                            href="/settings"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-agri-brown dark:text-gray-300 hover:bg-agri-green/5 dark:hover:bg-agri-green-light/5 transition"
                          >
                            <Settings className="w-4 h-4" /> Account Settings
                          </Link>

                          <button
                            onClick={() => {
                              setProfileOpen(false);
                              handleLogout();
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-500/5 dark:hover:bg-red-500/10 transition border-t border-agri-green/5 mt-1.5"
                          >
                            <LogOut className="w-4 h-4" /> Sign Out
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-semibold text-agri-green dark:text-agri-green-light hover:text-agri-green-dark"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/signup"
                    className="px-5 py-2.5 bg-agri-green hover:bg-agri-green-hover text-white text-sm font-semibold rounded-2xl shadow-md transition"
                  >
                    Register
                  </Link>
                </div>
              )
            )}
          </div>

          {/* Mobile Menu Icon */}
          <div className="md:hidden flex items-center gap-3">
            {/* ✅ FIX: Theme toggle only renders after mount */}
            {mounted && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-xl bg-agri-green/5 text-agri-green dark:text-agri-green-light"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </motion.button>
            )}

            {mounted && isAuthenticated && user && user.role === "BUYER" && (
              <Link
                href="/cart"
                className="relative p-2 rounded-xl bg-agri-green/5 text-agri-green dark:text-agri-green-light"
                aria-label="Shopping Cart"
              >
                <ShoppingBag className="w-4.5 h-4.5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-agri-green rounded-full text-[8px] font-black text-white flex items-center justify-center animate-pulse">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-agri-green focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-agri-green/5 bg-white dark:bg-[#0B130E] overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-base font-medium rounded-xl hover:bg-agri-green/5 hover:text-agri-green dark:text-gray-200"
                >
                  {link.label}
                </Link>
              ))}

              {/* ✅ FIX: Auth section in mobile drawer also behind mounted guard */}
              {mounted && (
                isAuthenticated ? (
                  <div className="pt-4 border-t border-agri-green/5 space-y-1">
                    <div className="px-3 py-2 text-sm text-gray-500">
                      Logged in as <span className="font-bold text-agri-green">{user?.name}</span>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-base font-medium rounded-xl hover:bg-agri-green/5 dark:text-gray-200"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-base font-medium rounded-xl hover:bg-agri-green/5 dark:text-gray-200"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left block px-3 py-2 text-base font-medium text-red-600 rounded-xl hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-agri-green/5 flex gap-4">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 text-center py-2 border border-agri-green/20 rounded-xl text-agri-green font-medium"
                    >
                      Log In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 text-center py-2 bg-agri-green text-white rounded-xl font-medium"
                    >
                      Register
                    </Link>
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
