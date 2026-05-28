"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Check, UserPlus, ShieldAlert, Tractor, ShoppingCart } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { apiService } from "../../lib/api";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const { login, isAuthenticated, user } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("BUYER");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: "Weak", color: "bg-red-500" });

  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectUrl = user.role === "FARMER" ? "/dashboard/farmer" : "/dashboard/buyer";
      router.push(redirectUrl);
    }
  }, [isAuthenticated, user, router]);

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, label: "None", color: "bg-gray-200" });
      return;
    }
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    let label = "Weak";
    let color = "bg-red-500";
    if (score >= 4) {
      label = "Strong";
      color = "bg-agri-green";
    } else if (score >= 2) {
      label = "Medium";
      color = "bg-agri-wheat";
    }

    setPasswordStrength({ score, label, color });
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !location || !phone) {
      toast.error("Please fill in all details.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiService.signup({ name, email, password, role, location, phone });
      if (res.success) {
        login(res.user, res.token);
        toast.success(`Account created! Welcome, ${res.user.name}.`);
        const redirectUrl = res.user.role === "FARMER" ? "/dashboard/farmer" : "/dashboard/buyer";
        router.push(redirectUrl);
      } else {
        toast.error("Registration failed.");
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-agri-cream dark:bg-zinc-950">
      {/* Left Column: Form Section */}
      <section className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-agri-green/10 rounded-full blur-3xl -z-10" />

        {/* Branding header */}
        <div>
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-black bg-gradient-to-r from-agri-green to-agri-green-light bg-clip-text text-transparent">
              AgroVista
            </span>
          </Link>
        </div>

        {/* Form contents */}
        <div className="w-full max-w-md mx-auto my-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
              Create Account
            </h2>
            <p className="text-xs text-agri-brown dark:text-gray-400 mt-1">
              Select your role and start direct agricultural trading.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Role Select Button Group */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-agri-green-dark dark:text-agri-green-light">
                  I am registering as a:
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("FARMER")}
                    className={`py-3 px-4 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition ${
                      role === "FARMER"
                        ? "border-agri-green bg-agri-green/10 text-agri-green"
                        : "border-agri-green/15 bg-white/50 text-agri-brown hover:bg-white"
                    }`}
                  >
                    <Tractor className="w-4.5 h-4.5" />
                    <span>Farmer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("BUYER")}
                    className={`py-3 px-4 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition ${
                      role === "BUYER"
                        ? "border-agri-green bg-agri-green/10 text-agri-green"
                        : "border-agri-green/15 bg-white/50 text-agri-brown hover:bg-white"
                    }`}
                  >
                    <ShoppingCart className="w-4.5 h-4.5" />
                    <span>Buyer</span>
                  </button>
                </div>
              </div>

              <Input
                label="Full Name / business Name"
                id="name"
                placeholder="Rajesh Kumar / Green Farms"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Email Address"
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  id="phone"
                  placeholder="+91 98765..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <Input
                  label="Location (City, State)"
                  id="location"
                  placeholder="Karnal, Haryana"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>

              <div className="relative">
                <Input
                  label="Create Password"
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
                  className="absolute right-4 top-[38px] text-agri-brown hover:text-agri-green"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength meter */}
              {password && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-agri-brown">Password Strength:</span>
                    <span
                      className={
                        passwordStrength.label === "Strong"
                          ? "text-agri-green"
                          : passwordStrength.label === "Medium"
                          ? "text-agri-wheat-dark"
                          : "text-red-500"
                      }
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-1.5 bg-agri-green/5 dark:bg-white/5 rounded-full overflow-hidden flex">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-full flex-1 border-r border-agri-cream dark:border-zinc-950 last:border-0 ${
                          i < passwordStrength.score ? passwordStrength.color : "bg-gray-200 dark:bg-gray-800"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Terms Checkbox */}
              <label className="flex items-start gap-2 cursor-pointer text-[10px] font-bold text-agri-brown leading-none">
                <input
                  type="checkbox"
                  required
                  className="rounded border-agri-green/20 text-agri-green focus:ring-agri-green mt-0.5"
                />
                <span>I agree to verify identity and comply with trade margin parameters.</span>
              </label>

              {/* Submit */}
              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 rounded-2xl flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
                <UserPlus className="w-4 h-4" />
              </Button>
            </form>

            <p className="text-center text-xs font-semibold text-agri-brown mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-agri-green dark:text-agri-green-light hover:underline font-bold">
                Log in here
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Footer info */}
        <div className="flex items-center gap-2 text-[10px] font-semibold text-agri-brown-light">
          <ShieldAlert className="w-4 h-4 text-agri-wheat-dark" />
          <span>Falsifying farmer status or locations triggers immediate watchlist bans.</span>
        </div>
      </section>

      {/* Right Column: Agriculture Display (Same style for layout coherence) */}
      <section className="hidden lg:flex lg:col-span-7 bg-gradient-to-br from-agri-green-dark to-[#092B0F] relative flex-col justify-between p-12 overflow-hidden select-none">
        <div className="absolute top-10 right-10 w-96 h-96 bg-agri-green/10 rounded-full blur-2xl animate-pulse-slow" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-agri-wheat/5 rounded-full blur-2xl animate-float" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />

        <div className="self-end px-3 py-1.5 glass-card border-white/5 rounded-full text-xs font-semibold text-agri-wheat flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
          100% Identity Verification Activated
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
              Direct Trade. <span className="text-agri-wheat">Zero Middlemen.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white/70 text-base mt-6 leading-relaxed"
            >
              Farmers keep 100% of their finalized listing value, and buyers receive bulk lots direct from harvesting fields. We provide the analytics, logistics channels, and real-time escrow safety indicators.
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

        <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
          <div>
            <p className="text-2xl font-black text-white">₹4.8 Cr+</p>
            <p className="text-xs text-white/50 font-bold mt-1">Farmer Earnings</p>
          </div>
          <div>
            <p className="text-2xl font-black text-agri-wheat">3.2K+</p>
            <p className="text-xs text-white/50 font-bold mt-1">Auctions Conducted</p>
          </div>
          <div>
            <p className="text-2xl font-black text-agri-green-light">120+</p>
            <p className="text-xs text-white/50 font-bold mt-1">Cities Connected</p>
          </div>
        </div>
      </section>
    </main>
  );
}
