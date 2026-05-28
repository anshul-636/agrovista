"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Send } from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      toast.success("Recovery instructions sent to " + email);
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
              Reset Password
            </h2>
            <p className="text-sm text-agri-brown dark:text-gray-400 mt-2">
              Enter your email and we will send you verification instructions.
            </p>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <Input
                  label="Registered Email Address"
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-3 rounded-2xl flex items-center justify-center gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending Link..." : "Send Reset Link"}
                  <Send className="w-4.5 h-4.5" />
                </Button>
              </form>
            ) : (
              <div className="mt-8 p-6 bg-agri-green/5 border border-agri-green/20 rounded-3xl text-center space-y-4">
                <Mail className="w-12 h-12 text-agri-green mx-auto animate-bounce" />
                <h3 className="text-lg font-bold text-agri-green-dark">Check Your Inbox</h3>
                <p className="text-xs text-agri-brown">
                  We have dispatched a secure password retrieval URL to <span className="font-extrabold">{email}</span>. Please click it within 15 minutes.
                </p>
              </div>
            )}

            <div className="mt-8 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-agri-green dark:text-agri-green-light hover:underline"
              >
                <ArrowLeft className="w-4.5 h-4.5" />
                <span>Back to Login portal</span>
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="text-[10px] text-agri-brown-light font-semibold">
          Need direct helper support? Contact support@agrovista.com
        </div>
      </section>

      {/* Right Column */}
      <section className="hidden lg:col-span-7 bg-gradient-to-br from-agri-green-dark to-[#092B0F] relative flex-col justify-between p-12 overflow-hidden select-none">
        <div className="absolute top-10 right-10 w-96 h-96 bg-agri-green/10 rounded-full blur-2xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />
        
        <div className="my-auto max-w-xl">
          <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">
            Restoring Secure <span className="text-agri-wheat">Farm Channels.</span>
          </h1>
          <p className="text-white/70 text-base mt-6 leading-relaxed">
            Your login parameters represent secure commercial identifiers. We run high-grade encryption layers and audit access locations to ensure listing databases are never compromised.
          </p>
        </div>
      </section>
    </main>
  );
}
