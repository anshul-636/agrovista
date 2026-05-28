"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound, ArrowRight, ArrowLeft } from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      toast.error("Please fill in both password inputs.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Password reset successfully! Redirecting to login...");
      router.push("/login");
    }, 1500);
  };

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-agri-cream dark:bg-zinc-950">
      {/* Left Column */}
      <section className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-agri-green/10 rounded-full blur-3xl -z-10" />

        <div>
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-black bg-gradient-to-r from-agri-green to-agri-green-light bg-clip-text text-transparent">
              AgroVista
            </span>
          </Link>
        </div>

        <div className="w-full max-w-md mx-auto my-auto py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
              Create New Password
            </h2>
            <p className="text-sm text-agri-brown dark:text-gray-400 mt-2">
              Please enter and confirm your new account password.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <Input
                label="New Password"
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Input
                label="Confirm New Password"
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 rounded-2xl flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? "Saving password..." : "Confirm Password Change"}
                <ArrowRight className="w-4.5 h-4.5" />
              </Button>
            </form>

            <div className="mt-8 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-agri-green dark:text-agri-green-light hover:underline"
              >
                <ArrowLeft className="w-4.5 h-4.5" />
                <span>Return to Login portal</span>
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="text-[10px] text-agri-brown-light font-semibold">
          Trade verification protocols are actively monitoring account safety.
        </div>
      </section>

      {/* Right Column */}
      <section className="hidden lg:col-span-7 bg-gradient-to-br from-agri-green-dark to-[#092B0F] relative flex-col justify-between p-12 overflow-hidden select-none">
        <div className="absolute top-10 right-10 w-96 h-96 bg-agri-green/10 rounded-full blur-2xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />
        
        <div className="my-auto max-w-xl">
          <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">
            Connecting Farms to <span className="text-agri-wheat">Secure Trade.</span>
          </h1>
          <p className="text-white/70 text-base mt-6 leading-relaxed">
            Protecting identity parameters is critical to maintaining buyer trust scores. Thank you for completing identity validations.
          </p>
        </div>
      </section>
    </main>
  );
}
