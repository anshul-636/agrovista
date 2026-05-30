"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Image, Check, HelpCircle, Loader2 } from "lucide-react";
import Header from "../../../components/shared/Header";
import Sidebar from "../../../components/shared/Sidebar";
import Button from "../../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import { apiService } from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import { toast } from "sonner";

export default function CreateProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

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

  // AI Pricing Suggestion State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // Redirect if not authorized farmer
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    } else if (user && user.role !== "FARMER") {
      router.push("/dashboard/buyer");
    }
  }, [isAuthenticated, user, router]);

  // Mutation to create product
  const createProductMutation = useMutation({
    mutationFn: (newProd) => apiService.createProduct(newProd),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Crop listing created successfully!");
        queryClient.invalidateQueries(["products"]);
        queryClient.invalidateQueries(["farmerAnalytics"]);
        router.push("/dashboard/farmer");
      } else {
        toast.error("Failed to create product listing.");
      }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !description || !price || !quantity || !harvestDate) {
      toast.error("Please fill in all required fields (including description).");
      return;
    }

    createProductMutation.mutate({
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
    if (!name) {
      toast.error("Please enter a crop name first to request AI suggestions.");
      return;
    }
    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const res = await apiService.getAiPriceSuggestion({
        productName: name,
        category,
        quantity: quantity ? Number(quantity) : undefined,
        unit,
        description,
        isOrganic,
        location: user?.location || "Nashik"
      });
      if (res.success) {
        setAiSuggestion(res.data);
        toast.success("AI Price recommendation compiled!");
      }
    } catch (e) {
      toast.error("Failed to compile AI crop pricing suggestion.");
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiPrice = (recommendation) => {
    if (!recommendation) return;

    const targetPrice = recommendation.suggestedPrice || recommendation.priceRange?.min;
    if (targetPrice) {
      setPrice(String(Math.round(targetPrice)));
      toast.success(`Applied AI recommended price of ₹${Math.round(targetPrice)}/${unit}!`);
    }
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
              List New Crop
            </h1>
            <p className="text-xs sm:text-sm text-agri-brown mt-1">
              Add your harvest lot to the AgroVista direct marketplace.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Column */}
            <div className="lg:col-span-7">
              <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="border-agri-green/5 p-6 space-y-4">
                  <Input
                    label="Crop / Product Name *"
                    id="name"
                    placeholder="e.g. Organic Roma Tomatoes, Basmati Rice Lot #4"
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
                      placeholder="e.g. 500"
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
                        { value: "kg", label: "kg (Kilogram)" },
                        { value: "quintal", label: "quintal (100 kg)" },
                        { value: "ton", label: "ton (1000 kg)" }
                      ]}
                    />
                    <Input
                      label="Price per Unit (₹) *"
                      id="price"
                      type="number"
                      placeholder="e.g. 45"
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
                      placeholder="Describe crop freshness, moisture checks, packaging size, transport parameters..."
                      className="w-full px-4 py-3 rounded-2xl border text-sm bg-white/60 dark:bg-black/30 border-agri-green/10 focus:outline-none focus:ring-2 focus:ring-agri-green/20 focus:border-agri-green text-current"
                    />
                  </div>

                  {/* Organic check */}
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-agri-green-dark dark:text-agri-green-light py-2">
                    <input
                      type="checkbox"
                      checked={isOrganic}
                      onChange={(e) => setIsOrganic(e.target.checked)}
                      className="rounded border-agri-green/20 text-agri-green focus:ring-agri-green w-4.5 h-4.5"
                    />
                    <span>This harvest is verified 100% Organic (Certified)</span>
                  </label>

                  {/* Image upload / URL input */}
                  <div className="space-y-3">
                    <span className="text-xs font-semibold text-agri-green-dark dark:text-agri-green-light">Crop Images</span>
                    <div className="border-2 border-dashed border-agri-green/15 dark:border-agri-green-light/15 bg-white/40 dark:bg-black/10 rounded-2xl p-6 text-center space-y-2">
                      <Image className="w-10 h-10 text-agri-brown mx-auto" />
                      <p className="text-xs text-agri-brown font-semibold">Drag and drop images or photos here to upload</p>
                      <p className="text-[10px] text-agri-brown-light">Supports JPG, PNG formats up to 5MB. Handled via Cloudinary</p>
                    </div>
                    <Input
                      label="Or Provide Image URL"
                      id="imageUrl"
                      type="text"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                  </div>
                </Card>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-1.5"
                    disabled={createProductMutation.isLoading}
                  >
                    {createProductMutation.isLoading ? "Creating Listing..." : "Publish to Marketplace"}
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
              <Card className="border-agri-green/5 bg-gradient-to-br from-white/80 to-agri-green/5 dark:from-[#121F16]/80 dark:to-agri-green/5 overflow-hidden">
                <CardHeader className="pb-3 border-none flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-agri-green flex items-center gap-1.5">
                      <Sparkles className="w-5 h-5 text-agri-green fill-current" />
                      AI Price Advisor
                    </CardTitle>
                    <CardDescription>Valuation analysis helper</CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-xs text-agri-brown dark:text-gray-300 leading-relaxed">
                    Need help setting the right price? Our pricing engine checks regional crop balances, weather effects, and wholesale marketplace averages to recommend pricing.
                  </p>

                  <Button
                    onClick={getAiPricing}
                    variant="accent"
                    className="w-full py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5"
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Compiling Suggestions...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4.5 h-4.5" />
                        <span>Get Suggested Price</span>
                      </>
                    )}
                  </Button>

                  {/* Suggestion Result Box */}
                  {aiSuggestion && (
                    <div className="mt-4 p-4 bg-white/80 dark:bg-black/40 border border-agri-green/10 rounded-2xl space-y-4 animate-fade-in">
                      <div className="flex justify-between items-start border-b border-agri-green/5 pb-3">
                        <div>
                          <span className="text-[9px] text-agri-brown uppercase font-bold">Recommended starting price</span>
                          <p className="text-xl font-black text-agri-green">
                            {aiSuggestion.recommendedRange || `₹${aiSuggestion.suggestedPrice}/${unit}`}
                          </p>
                        </div>
                        <Button
                          onClick={() => applyAiPrice(aiSuggestion)}
                          className="py-1 px-3 text-[10px] rounded-lg bg-agri-green/10 text-agri-green hover:bg-agri-green/20"
                        >
                          Apply Price
                        </Button>
                      </div>
                      <div>
                        <span className="text-[9px] text-agri-brown uppercase font-bold">Analysis details</span>
                        <p className="text-[11px] text-agri-brown dark:text-gray-300 mt-1 leading-relaxed whitespace-pre-line bg-agri-green/5 p-3 rounded-xl border border-agri-green/5">
                          {aiSuggestion.explanation}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
