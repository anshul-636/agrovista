"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Tractor, ShoppingCart, ArrowRight, Loader } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import Button from "../../components/ui/Button";
import { toast } from "sonner";



function SelectRoleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();

  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const accessToken = searchParams.get("accessToken");
  const refreshToken = searchParams.get("refreshToken");
  const userId = searchParams.get("userId");
  const email = searchParams.get("email");
  const name = searchParams.get("name");

  useEffect(() => {
    setMounted(true);
    if (!accessToken || !refreshToken) {
      toast.error("Session expired. Please login again.");
      router.push("/login");
    }
  }, [accessToken, refreshToken, router]);

  const handleSelectRole = async (role) => {
    if (!selectedRole) {
      setSelectedRole(role);
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiUrl}/users/me/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) throw new Error("Failed to update role");

      localStorage.setItem("agrovista_token", accessToken);
      localStorage.setItem("agrovista_refresh_token", refreshToken);

      login({ id: userId, email, name, role }, accessToken, refreshToken);

      toast.success(`Welcome as ${role}!`);
      router.push(role === "FARMER" ? "/dashboard/farmer" : "/dashboard/buyer");
    } catch (err) {
      toast.error("Failed to update role. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-agri-cream dark:bg-zinc-950">
        <Loader className="w-8 h-8 animate-spin text-agri-green" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-agri-cream to-agri-wheat-light dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-agri-green-dark dark:text-agri-green-light mb-4">
            Choose Your Role
          </h1>
          <p className="text-lg text-agri-brown dark:text-gray-400">
            Welcome, {name}! How would you like to use AgroVista?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Farmer Role */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelectRole("FARMER")}
            disabled={isLoading}
            className={`p-8 rounded-2xl border-2 transition-all ${
              selectedRole === "FARMER"
                ? "bg-agri-green/10 border-agri-green dark:border-agri-green-light shadow-lg"
                : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 hover:border-agri-green dark:hover:border-agri-green-light"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="mb-4 flex justify-center">
              <Tractor className="w-16 h-16 text-agri-green" />
            </div>
            <h2 className="text-2xl font-bold text-agri-green-dark dark:text-white mb-3">
              Farmer
            </h2>
            <p className="text-sm text-agri-brown dark:text-gray-400 mb-6">
              Upload crops, receive orders, bid on auctions, manage inventory, and grow your farm business
            </p>
            <div className="flex items-center justify-center gap-2 text-agri-green font-semibold">
              {selectedRole === "FARMER" && !isLoading ? (
                <><span>Continue</span><ArrowRight className="w-4 h-4" /></>
              ) : selectedRole === "FARMER" && isLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <span>Select</span>
              )}
            </div>
          </motion.button>

          {/* Buyer Role */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelectRole("BUYER")}
            disabled={isLoading}
            className={`p-8 rounded-2xl border-2 transition-all ${
              selectedRole === "BUYER"
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400 shadow-lg"
                : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="mb-4 flex justify-center">
              <ShoppingCart className="w-16 h-16 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-300 mb-3">
              Buyer
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-400 mb-6">
              Browse fresh produce, place orders, bid on auction lots, chat with farmers, track shipments
            </p>
            <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold">
              {selectedRole === "BUYER" && !isLoading ? (
                <><span>Continue</span><ArrowRight className="w-4 h-4" /></>
              ) : selectedRole === "BUYER" && isLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <span>Select</span>
              )}
            </div>
          </motion.button>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={() => router.push("/login")}
            className="text-sm text-agri-brown dark:text-gray-400 hover:text-agri-green dark:hover:text-agri-green-light transition"
          >
            Using a different account? <span className="underline">Log in</span>
          </button>
        </div>
      </motion.div>
    </main>
  );
}

// Wrap in Suspense — required by Next.js 14 whenever useSearchParams() is used
export default function SelectRolePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-agri-cream dark:bg-zinc-950">
        <Loader className="w-8 h-8 animate-spin text-agri-green" />
      </div>
    }>
      <SelectRoleContent />
    </Suspense>
  );
}