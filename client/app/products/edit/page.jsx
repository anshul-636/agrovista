"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Image, Check, Loader2 } from "lucide-react";
import Header from "../../../components/shared/Header";
import Sidebar from "../../../components/shared/Sidebar";
import Button from "../../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import { apiService } from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import { toast } from "sonner";

function EditForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const id = searchParams.get("id");

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Vegetables");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("kg");
  const [quantity, setQuantity] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [isOrganic, setIsOrganic] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // Fetch product detail to prefill
  const { data: detailRes, isLoading: detailsLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => apiService.getProductById(id),
    enabled: !!id
  });

  useEffect(() => {
    if (detailRes?.data) {
      const p = detailRes.data;
      setName(p.name);
      setDescription(p.description);
      setCategory(p.category);
      setPrice(String(p.price));
      setUnit(p.unit);
      setQuantity(String(p.quantity));
      setHarvestDate(p.harvestDate);
      setIsOrganic(p.isOrganic);
      setImageUrl(p.images[0] || "");
    }
  }, [detailRes]);

  // Mutation to edit product
  const editProductMutation = useMutation({
    mutationFn: (updatedData) => apiService.editProduct(id, updatedData),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Listing updated successfully!");
        queryClient.invalidateQueries(["product", id]);
        queryClient.invalidateQueries(["products"]);
        router.push("/dashboard/farmer");
      } else {
        toast.error("Failed to update listing.");
      }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !price || !quantity || !harvestDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    editProductMutation.mutate({
      name,
      description,
      category,
      price: Number(price),
      unit,
      quantity: Number(quantity),
      harvestDate,
      isOrganic,
      images: imageUrl ? [imageUrl] : undefined
    });
  };

  const getAiPricing = async () => {
    if (!name) return;
    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const res = await apiService.getAiPriceSuggestion({
        name,
        category,
        unit,
        isOrganic,
        location: user?.location || "Nashik"
      });
      if (res.success) {
        setAiSuggestion(res.data);
        toast.success("AI pricing suggestions parsed!");
      }
    } catch (e) {
      toast.error("Failed to request suggestions.");
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiPrice = (recRange) => {
    const match = recRange.match(/₹(\d+)/);
    if (match && match[1]) {
      setPrice(match[1]);
      toast.success(`Applied starting bid of ₹${match[1]}/kg!`);
    }
  };

  if (detailsLoading) {
    return (
      <div className="max-w-7xl mx-auto p-8 w-full animate-pulse space-y-6">
        <div className="h-6 w-24 bg-gray-200 dark:bg-zinc-800 rounded" />
        <div className="h-12 w-2/3 bg-gray-200 dark:bg-zinc-800 rounded" />
        <div className="h-80 w-full bg-gray-200 dark:bg-zinc-800 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Form */}
      <div className="lg:col-span-7">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-agri-green/5 p-6 space-y-4">
            <Input
              label="Crop Name *"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Category"
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: "Vegetables", label: "Vegetables" },
                  { value: "Grains", label: "Grains" },
                  { value: "Fruits", label: "Fruits" }
                ]}
              />
              <Input
                label="Harvest Date *"
                id="harvestDate"
                type="date"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Available Qty *"
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              <Select
                label="Selling Unit"
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                options={[
                  { value: "kg", label: "kg" },
                  { value: "quintal", label: "quintal" },
                  { value: "ton", label: "ton" }
                ]}
              />
              <Input
                label="Price per Unit (₹) *"
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className="text-xs font-semibold text-agri-green-dark dark:text-agri-green-light">
                Crop Description
              </label>
              <textarea
                id="description"
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border text-sm bg-white/60 dark:bg-black/30 border-agri-green/10 focus:outline-none focus:ring-2 focus:ring-agri-green/20 focus:border-agri-green text-current"
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-agri-green-dark dark:text-agri-green-light py-2">
              <input
                type="checkbox"
                checked={isOrganic}
                onChange={(e) => setIsOrganic(e.target.checked)}
                className="rounded border-agri-green/20 text-agri-green w-4.5 h-4.5"
              />
              <span>Organic Certified crop</span>
            </label>

            <div className="space-y-2">
              <Input
                label="Modify Image URL"
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              variant="primary"
              className="flex-1 py-3.5 rounded-2xl font-bold flex items-center justify-center"
              disabled={editProductMutation.isLoading}
            >
              {editProductMutation.isLoading ? "Saving changes..." : "Save Changes"}
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

      {/* AI Advisor Panel */}
      <div className="lg:col-span-5 sticky top-24 space-y-6">
        <Card className="border-agri-green/5 bg-gradient-to-br from-white/80 to-agri-green/5 dark:from-[#121F16]/80 dark:to-agri-green/5">
          <CardHeader className="pb-3 border-none flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-agri-green flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-agri-green fill-current" />
              AI Price Advisor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={getAiPricing}
              variant="accent"
              className="w-full py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5"
              disabled={aiLoading}
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify AI Pricing"}
            </Button>

            {aiSuggestion && (
              <div className="mt-4 p-4 bg-white/80 dark:bg-black/40 border border-agri-green/10 rounded-2xl space-y-4">
                <div className="flex justify-between items-start border-b border-agri-green/5 pb-3">
                  <div>
                    <p className="text-xs text-agri-brown">Suggested Price</p>
                    <p className="text-lg font-black text-agri-green">{aiSuggestion.recommendedRange}</p>
                  </div>
                  <Button
                    onClick={() => applyAiPrice(aiSuggestion.recommendedRange)}
                    className="py-1 px-3 text-[10px] rounded-lg"
                  >
                    Apply
                  </Button>
                </div>
                <p className="text-[11px] text-agri-brown dark:text-gray-300 whitespace-pre-line leading-relaxed bg-agri-green/5 p-3 rounded-xl border">
                  {aiSuggestion.explanation}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function EditProductPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // Redirect if not authorized farmer
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    } else if (user && user.role !== "FARMER") {
      router.push("/dashboard/buyer");
    }
  }, [isAuthenticated, user, router]);

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
              Edit Crop Listing
            </h1>
            <p className="text-xs sm:text-sm text-agri-brown mt-1">
              Modify active quantities, stock or price of your listed harvest.
            </p>
          </div>

          <Suspense fallback={
            <div className="h-64 w-full bg-gray-100 dark:bg-zinc-950 rounded-3xl animate-pulse flex items-center justify-center text-xs text-agri-brown font-bold">
              Loading Crop parameters...
            </div>
          }>
            <EditForm />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
