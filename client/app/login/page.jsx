"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight, ShieldCheck, Users, Package, Landmark } from "lucide-react";
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

  const [stats, setStats] = useState({ farmers: 0, products: 0, auctions: 0 });
  useEffect(() => {
    apiService.getPublicStats().then((res) => {
      const d = res?.data || {};
      setStats({
        farmers: Number(d.farmers || 0),
        products: Number(d.products || 0),
        auctions: Number(d.auctions || 0),
      });
    }).catch(() => {});
  }, []);

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
    } catch {
      toast.error("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const backendURL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";
    window.location.href = `${backendURL}/api/auth/google`;
  };

  const statItems = [
    { icon: Users,    value: stats.farmers,  label: "Verified Farmers" },
    { icon: Package,  value: stats.products, label: "Products Listed"  },
    { icon: Landmark, value: stats.auctions, label: "Auctions Hosted"  },
  ];

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-agri-cream dark:bg-zinc-950">

      {/* ── LEFT: Form ──────────────────────────────────────────────────── */}
      <section className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-agri-green/10 rounded-full blur-3xl -z-10" />

        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="text-2xl font-black bg-gradient-to-r from-agri-green to-agri-green-light bg-clip-text text-transparent">
            AgroVista
          </span>
          <span className="text-[10px] font-extrabold border border-agri-green/20 px-2 py-0.5 rounded-full text-agri-green">
            Direct
          </span>
        </Link>

        {/* Form */}
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
                  className="absolute right-4 top-[38px] text-agri-brown hover:text-agri-green dark:text-gray-400 transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/*: Custom styled checkbox instead of plain system default */}
              <div className="flex items-center justify-between text-xs font-semibold">
                <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                  <div
                    onClick={() => setRememberMe(!rememberMe)}
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all duration-150 flex-shrink-0
                      ${rememberMe
                        ? "bg-agri-green border-agri-green"
                        : "border-agri-green/30 dark:border-gray-600 group-hover:border-agri-green/60"
                      }`}
                  >
                    {rememberMe && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                        <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-agri-brown dark:text-gray-300">Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-agri-green dark:text-agri-green-light hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-agri-green/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Signing In...
                  </>
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>

              <div className="flex items-center gap-3 my-2">
                <div className="h-px bg-agri-green/10 flex-1" />
                <span className="text-[10px] text-agri-brown/50 uppercase tracking-widest font-bold">or</span>
                <div className="h-px bg-agri-green/10 flex-1" />
              </div>

              {/* "Continue with Google" — standard expected label */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-3 rounded-2xl border border-agri-green/15 bg-white dark:bg-zinc-900 hover:bg-agri-green/5 dark:hover:bg-zinc-800 text-agri-green-dark dark:text-gray-200 font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 shadow-sm"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.39 7.56l3.85 2.99c.92-2.76 3.49-4.51 6.76-4.51z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.57l3.73 2.89c2.18-2.01 3.7-4.97 3.7-8.61z" />
                  <path fill="#FBBC05" d="M5.24 14.81c-.24-.72-.38-1.49-.38-2.31s.14-1.59.38-2.31L1.39 7.2C.5 8.98 0 10.94 0 13s.5 4.02 1.39 5.8l3.85-2.99z" />
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.73-2.89c-1.03.69-2.35 1.1-4.23 1.1-3.27 0-5.84-1.75-6.76-4.51l-3.85 2.99C3.37 20.35 7.35 23 12 23z" />
                </svg>
                Continue with Google
              </button>
            </form>

            <p className="text-center text-xs font-semibold text-agri-brown dark:text-gray-400 mt-8">
              New to AgroVista?{" "}
              <Link href="/signup" className="text-agri-green dark:text-agri-green-light hover:underline font-bold">
                Create a free account
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Sharper tagline */}
        <div className="flex items-center gap-2 text-[10px] font-semibold text-agri-brown-light dark:text-gray-500">
          <ShieldCheck className="w-4 h-4 text-agri-green flex-shrink-0" />
          <span>Every farmer is verified. Every bid is live.</span>
        </div>
      </section>

      {/* ── RIGHT: Branding panel ────────────────────────────────────────── */}
      <section className="hidden lg:flex lg:col-span-7 bg-gradient-to-br from-agri-green-dark to-[#092B0F] relative flex-col justify-between p-12 overflow-hidden select-none">
        {/* Background atmosphere */}
        <div className="absolute top-10 right-10 w-96 h-96 bg-agri-green/10 rounded-full blur-2xl animate-pulse-slow" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-agri-wheat/5 rounded-full blur-2xl animate-float" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />

        {/* Live badge */}
        <div className="self-end z-10">
          <div className="px-3 py-1.5 glass-card border-white/5 rounded-full text-xs font-semibold text-agri-wheat flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Realtime Market Data Enabled
          </div>
        </div>

        {/* Main content */}
        <div className="my-auto grid grid-cols-1 xl:grid-cols-2 gap-8 items-center w-full z-10">
          <div className="max-w-xl">
            <motion.h1
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight"
            >
              Connecting Farms to{" "}
              <span className="text-agri-wheat">Future Markets.</span>
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

          {/* Illustration inside a styled container — no raw white rectangle */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
            className="flex justify-center relative"
          >
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-agri-green/20 to-agri-green-dark/40 p-4 border border-white/10 shadow-2xl shadow-black/30">
              <div className="absolute inset-0 bg-agri-wheat/5 rounded-3xl" />
              <img
                src="/farmer_cartoon.png"
                alt="Farmer with harvest"
                className="max-h-[300px] w-auto object-contain relative z-10 drop-shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:scale-105 transition-transform duration-500"
              />
            </div>
            {/* Decorative glow behind card */}
            <div className="absolute inset-0 bg-agri-wheat/10 rounded-full blur-3xl -z-10" />
          </motion.div>
        </div>

        {/* Real live stats from backend */}
        <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10 z-10">
          {statItems.map(({ icon: Icon, value, label }) => (
            <div key={label}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5 text-agri-wheat/60" />
                <p className="text-2xl font-black text-agri-wheat">
                  {value > 0 ? `${value.toLocaleString()}+` : "—"}
                </p>
              </div>
              <p className="text-xs text-white/50 font-bold">{label}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
