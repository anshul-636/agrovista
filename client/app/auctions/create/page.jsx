"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Landmark, Tractor } from "lucide-react";
import Header from "../../../components/shared/Header";
import Sidebar from "../../../components/shared/Sidebar";
import Button from "../../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import { apiService } from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import { toast } from "sonner";

export default function CreateAuctionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const [productName, setProductName] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [unit, setUnit] = useState("kg");
  const [lotSize, setLotSize] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not authorized farmer
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    } else if (user && user.role !== "FARMER") {
      router.push("/dashboard/buyer");
    }
  }, [isAuthenticated, user, router]);

  const createAuctionMutation = useMutation({
    mutationFn: (newAuc) => apiService.createAuction(newAuc),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Auction room launched successfully!");
        queryClient.invalidateQueries(["auctions"]);
        router.push("/auctions");
      } else {
        toast.error("Failed to create auction.");
      }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!productName || !startingPrice || !lotSize) {
      toast.error("Please fill in all required fields.");
      return;
    }

    createAuctionMutation.mutate({
      productName,
      startingPrice: Number(startingPrice),
      unit,
      lotSize: Number(lotSize),
      durationMinutes: Number(durationMinutes)
    });
  };

  if (!isAuthenticated || !user || user.role !== "FARMER") {
    return null;
  }

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col text-current transition-colors">
      <Header />

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
          {/* Header */}
          <div>
            <button
              onClick={() => router.push("/dashboard/farmer")}
              className="inline-flex items-center gap-1 text-xs font-bold text-agri-brown hover:text-agri-green mb-4 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <h1 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
              Launch Live Auction
            </h1>
            <p className="text-xs sm:text-sm text-agri-brown mt-1">
              Create a real-time bidding room to sell bulk harvest lots.
            </p>
          </div>

          <div className="max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card className="border-agri-green/5 p-6 space-y-4">
                <Input
                  label="Auction Lot Title *"
                  id="productName"
                  placeholder="e.g. Premium Roma Tomatoes Lot #2, Organic Basmati Rice Steam Lot"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Lot size *"
                    id="lotSize"
                    type="number"
                    placeholder="e.g. 1000"
                    value={lotSize}
                    onChange={(e) => setLotSize(e.target.value)}
                    required
                  />
                  <Select
                    label="Unit"
                    id="unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    options={[
                      { value: "kg", label: "kg (Kilogram)" },
                      { value: "quintal", label: "quintal" },
                      { value: "ton", label: "ton" }
                    ]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Starting Price per Unit (₹) *"
                    id="startingPrice"
                    type="number"
                    placeholder="e.g. 35"
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(e.target.value)}
                    required
                  />
                  <Select
                    label="Bidding Duration"
                    id="durationMinutes"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    options={[
                      { value: "15", label: "15 Minutes (Fast Trade)" },
                      { value: "30", label: "30 Minutes" },
                      { value: "60", label: "1 Hour" },
                      { value: "120", label: "2 Hours" }
                    ]}
                  />
                </div>
              </Card>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-1.5"
                  disabled={createAuctionMutation.isLoading}
                >
                  <Landmark className="w-4.5 h-4.5" />
                  <span>{createAuctionMutation.isLoading ? "Starting room..." : "Start Auction Room"}</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push("/dashboard/farmer")}
                  className="px-6 rounded-2xl border-agri-green/15"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
