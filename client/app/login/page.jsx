"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { apiService } from "../../lib/api";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectUrl = user.role === "FARMER" ? "/dashboard/farmer" : "/dashboard/buyer";
      router.push(redirectUrl);
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all credentials.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiService.login({ email, password });
      if (res.success) {
        login(res.user, res.token);
        toast.success(`Welcome back, ${res.user.name}!`);
        const redirectUrl = res.user.role === "FARMER" ? "/dashboard/farmer" : "/dashboard/buyer";
        router.push(redirectUrl);
      } else {
        toast.error("Invalid credentials.");
      }
    } catch (err) {
      toast.error("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    toast.success("Redirecting to Google OAuth...", { icon: "🌐" });
    setTimeout(() => {
      // Mock OAuth success
      const mockUser = {
        id: "buyer-google-1",
        email: email || "google_buyer@agrovista.com",
        name: "Google Buyer Partner",
        role: "BUYER",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        location: "Delhi, India"
      };
      login(mockUser, "mock-google-token-xyz");
      toast.success("Logged in successfully with Google!");
      router.push("/dashboard/buyer");
    }, 1500);
  };

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-agri-cream dark:bg-zinc-950">
      {/* Left Column: Login Form */}
      <section className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden">
        {/* Glow Element */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-agri-green/10 rounded-full blur-3xl -z-10" />
        
        {/* Header Branding */}
        <div>
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-black bg-gradient-to-r from-agri-green to-agri-green-light bg-clip-text text-transparent">
              AgroVista
            </span>
          </Link>
        </div>

        {/* Auth form container */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
              Welcome back!
            </h2>
            <p className="text-sm text-agri-brown dark:text-gray-400 mt-2">
              Log in to access your direct farm-to-market trade platform.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <Input
                label="Email Address"
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="relative">
                <Input
                  label="Password"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-[38px] text-agri-brown hover:text-agri-green dark:text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Remember Me and Forgot Password */}
              <div className="flex items-center justify-between text-xs font-semibold">
                <label className="flex items-center gap-2 cursor-pointer text-agri-brown dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-agri-green/20 text-agri-green focus:ring-agri-green"
                  />
                  <span>Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-agri-green dark:text-agri-green-light hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 rounded-2xl flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
                <ArrowRight className="w-4 h-4" />
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="h-px bg-agri-green/10 flex-1" />
                <span className="text-xs text-agri-brown/60 uppercase">or connect with</span>
                <div className="h-px bg-agri-green/10 flex-1" />
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-3 rounded-2xl border border-agri-green/15 bg-white hover:bg-agri-cream/30 text-agri-green-dark font-bold text-sm flex items-center justify-center gap-2 transition"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.39 7.56l3.85 2.99c.92-2.76 3.49-4.51 6.76-4.51z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.57l3.73 2.89c2.18-2.01 3.7-4.97 3.7-8.61z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.24 14.81c-.24-.72-.38-1.49-.38-2.31s.14-1.59.38-2.31L1.39 7.2C.5 8.98 0 10.94 0 13s.5 4.02 1.39 5.8l3.85-2.99z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.73-2.89c-1.03.69-2.35 1.1-4.23 1.1-3.27 0-5.84-1.75-6.76-4.51l-3.85 2.99C3.37 20.35 7.35 23 12 23z"
                  />
                </svg>
                Google Partner Account
              </button>
            </form>

            <p className="text-center text-xs font-semibold text-agri-brown mt-8">
              New to AgroVista?{" "}
              <Link href="/signup" className="text-agri-green dark:text-agri-green-light hover:underline font-bold">
                Create a free trade account
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Footer info */}
        <div className="flex items-center gap-2 text-[10px] font-semibold text-agri-brown-light">
          <ShieldCheck className="w-4 h-4 text-agri-green" />
          <span>Secured trade networks & verified farmer connections.</span>
        </div>
      </section>

      {/* Right Column: Dynamic Agriculture Showcase */}
      <section className="hidden lg:flex lg:col-span-7 bg-gradient-to-br from-agri-green-dark to-[#092B0F] relative flex-col justify-between p-12 overflow-hidden select-none">
        {/* Floating circles */}
        <div className="absolute top-10 right-10 w-96 h-96 bg-agri-green/10 rounded-full blur-2xl animate-pulse-slow" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-agri-wheat/5 rounded-full blur-2xl animate-float" />

        {/* Overlay Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />

        {/* Small badge */}
        <div className="self-end px-3 py-1.5 glass-card border-white/5 rounded-full text-xs font-semibold text-agri-wheat flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
          Realtime Market Data Enabled
        </div>

        {/* Main Content Area */}
        <div className="my-auto grid grid-cols-1 xl:grid-cols-2 gap-8 items-center w-full z-10">
          <div className="max-w-xl">
            <motion.h1
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight"
            >
              Connecting Farms to <span className="text-agri-wheat">Future Markets.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white/70 text-base mt-6 leading-relaxed"
            >
              AgroVista is a transparent trading gateway. Bypass local supply chains to secure maximum harvest margins for growers and premium fresh lots for commercial buyers.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
            className="flex justify-center relative"
          >
            {/* Soft decorative backing glow */}
            <div className="absolute inset-0 bg-agri-wheat/10 rounded-full blur-3xl animate-pulse" />
            <img
              src="/farmer_cartoon.png"
              alt="Farmer with his grain to sell"
              className="max-h-[350px] w-auto object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(46,125,50,0.3)] hover:scale-105 transition-transform duration-500"
            />
          </motion.div>
        </div>

        {/* Mini stats showcase */}
        <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
          <div>
            <p className="text-2xl font-black text-agri-wheat">12K+</p>
            <p className="text-xs text-white/50 font-bold mt-1">Verified Farmers</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">45K+</p>
            <p className="text-xs text-white/50 font-bold mt-1">Orders Handled</p>
          </div>
          <div>
            <p className="text-2xl font-black text-agri-green-light">99.4%</p>
            <p className="text-xs text-white/50 font-bold mt-1">Order Fulfillment</p>
          </div>
        </div>
      </section>
    </main>
  );
}
