"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import {
  ShieldCheck, MapPin, Edit3, Save, X, Camera, Mail, Phone,
  AlertTriangle, CheckCircle2, User, Wallet, Package, Star,
  Navigation, Clock, Sprout, TrendingUp, ShoppingBag, BarChart3,
  Leaf, Award, BadgeCheck, CircleDollarSign, Boxes, Heart,
  FileText, Upload, CheckCircle, XCircle, Hourglass,
} from "lucide-react";
import Header from "../../components/shared/Header";
import Sidebar from "../../components/shared/Sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import { apiService } from "../../lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── Completion calculators (role-aware weights) ──────────────────────────────
function calcFarmerCompletion(user) {
  // Farmers need bio + location most to attract buyers
  const checks = [
    { val: user?.name,     weight: 2 },
    { val: user?.email,    weight: 1 },
    { val: user?.phone,    weight: 2 },
    { val: user?.location, weight: 2 },
    { val: user?.bio,      weight: 2 },
    { val: user?.avatar,   weight: 1 },
  ];
  const total  = checks.reduce((s, c) => s + c.weight, 0);
  const filled = checks.filter((c) => c.val).reduce((s, c) => s + c.weight, 0);
  return Math.round((filled / total) * 100);
}

function calcBuyerCompletion(user) {
  // Buyers need location (delivery) + phone to be trusted by farmers
  const checks = [
    { val: user?.name,     weight: 2 },
    { val: user?.email,    weight: 1 },
    { val: user?.phone,    weight: 2 },
    { val: user?.location, weight: 2 },
    { val: user?.bio,      weight: 2 },
    { val: user?.avatar,   weight: 1 },
  ];
  const total  = checks.reduce((s, c) => s + c.weight, 0);
  const filled = checks.filter((c) => c.val).reduce((s, c) => s + c.weight, 0);
  return Math.round((filled / total) * 100);
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function VerificationRow({ icon: Icon, label, done, warn }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-agri-green/5 last:border-none">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
        done ? "bg-agri-green/10 text-agri-green"
             : warn ? "bg-agri-wheat/10 text-agri-wheat-dark"
             : "bg-red-500/10 text-red-500"
      }`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className={`text-xs font-semibold flex-1 ${
        done ? "text-agri-green-dark dark:text-agri-green-light"
             : warn ? "text-agri-wheat-dark dark:text-agri-wheat"
             : "text-red-600 dark:text-red-400"
      }`}>
        {label}
      </span>
      {done
        ? <CheckCircle2 className="w-4 h-4 text-agri-green" />
        : <AlertTriangle className={`w-4 h-4 ${warn ? "text-agri-wheat-dark" : "text-red-500"}`} />
      }
    </div>
  );
}

function StatPill({ icon: Icon, label, value, color }) {
  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-2xl border ${color}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</p>
        <p className="text-sm font-black">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-agri-green/5 last:border-none">
      <span className="text-agri-brown font-semibold flex items-center gap-1.5 text-xs">
        <Icon className="w-3.5 h-3.5" /> {label}
      </span>
      <span className="font-bold text-agri-green-dark dark:text-gray-200 text-xs text-right max-w-[160px] truncate">
        {value}
      </span>
    </div>
  );
}

// ─── Farmer Verification Panel ───────────────────────────────────────────────
function FarmerVerificationPanel({ user }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm]     = useState(false);
  const [files, setFiles]           = useState([]);        // File[]
  const [dragOver, setDragOver]     = useState(false);
  const fileInputRef                = React.useRef(null);

  const status = user?.verificationStatus || "UNVERIFIED";

  // ── mutation: upload files ────────────────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: (selectedFiles) => apiService.uploadVerificationDocs(selectedFiles),
    onSuccess: (res) => {
      if (res?.success || res?.data) {
        toast.success("Documents uploaded! We'll review your verification request shortly.");
        setShowForm(false);
        setFiles([]);
        // Invalidate so ProfilePage's farmerStats re-fetches fresh data from server
        queryClient.invalidateQueries(["profileStats"]);
        // Also immediately update authStore with PENDING + the returned docUrls
        const { updateProfile } = useAuthStore.getState();
        updateProfile({
          verificationStatus: "PENDING",
          verificationDocs: res?.data?.verificationDocs || res?.data?.docUrls || [],
        });
      } else {
        toast.error(res?.error || "Upload failed. Please try again.");
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Upload failed. Please try again.");
    },
  });

  // ── helpers ───────────────────────────────────────────────────────────────
  const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const MAX_SIZE_MB    = 5;

  const addFiles = (incoming) => {
    const valid = Array.from(incoming).filter((f) => {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        toast.error(`${f.name}: unsupported type. Use JPG, PNG, WEBP, or PDF.`);
        return false;
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${f.name}: exceeds ${MAX_SIZE_MB} MB limit.`);
        return false;
      }
      return true;
    });
    setFiles((prev) => {
      const names = new Set(prev.map((p) => p.name));
      const fresh = valid.filter((v) => !names.has(v.name));
      return [...prev, ...fresh].slice(0, 5);     // max 5 docs
    });
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = () => {
    if (files.length === 0) {
      toast.error("Please select at least one document to upload.");
      return;
    }
    uploadMutation.mutate(files);
  };

  const fileIcon = (f) =>
    f.type === "application/pdf" ? "📄" : "🖼️";

  // ── status config ─────────────────────────────────────────────────────────
  const statusConfig = {
    UNVERIFIED: {
      icon: ShieldCheck,
      color: "text-gray-400",
      bg: "bg-gray-100 dark:bg-zinc-800",
      label: "Not Verified",
      desc: "Upload your documents to become a verified farmer and unlock the trust badge.",
      badgeVariant: "outline",
    },
    PENDING: {
      icon: Hourglass,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      label: "Under Review",
      desc: "Your documents are being reviewed. This typically takes 24–48 hours.",
      badgeVariant: "yellow",
    },
    VERIFIED: {
      icon: BadgeCheck,
      color: "text-agri-green",
      bg: "bg-agri-green/10",
      label: "Verified Farmer",
      desc: user?.verifiedAt
        ? `Verified on ${new Date(user.verifiedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.`
        : "Your profile has been officially verified.",
      badgeVariant: "green",
    },
    REJECTED: {
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-900/20",
      label: "Verification Rejected",
      desc: user?.verificationNote
        ? `Reason: ${user.verificationNote}`
        : "Your request was not approved. You may re-submit with correct documents.",
      badgeVariant: "red",
    },
  };

  const cfg       = statusConfig[status] || statusConfig.UNVERIFIED;
  const StatusIcon = cfg.icon;
  const canSubmit  = status === "UNVERIFIED" || status === "REJECTED";

  return (
    <Card className="border-agri-green/5 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-agri-green-dark dark:text-agri-green-light flex items-center gap-1.5">
            <BadgeCheck className="w-4 h-4 text-agri-green" /> Official Farmer Verification
          </h3>
          <p className="text-[10px] text-agri-brown mt-0.5">Verified badge appears on all your listings & auctions</p>
        </div>
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {/* Status block */}
      <div className={`flex items-start gap-3 p-3 rounded-xl ${cfg.bg}`}>
        <StatusIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
        <p className={`text-xs font-semibold leading-relaxed ${cfg.color}`}>{cfg.desc}</p>
      </div>

      {/* Submitted doc list for PENDING */}
      {status === "PENDING" && user?.verificationDocs?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-agri-brown uppercase">Submitted Documents</p>
          {user.verificationDocs.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-[11px] text-agri-green hover:underline truncate">
              <FileText className="w-3.5 h-3.5 flex-shrink-0" />
              {url.length > 50 ? url.slice(0, 50) + "…" : url}
            </a>
          ))}
        </div>
      )}

      {/* ── Upload form ── */}
      {canSubmit && (
        <div className="space-y-3">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-agri-green/20 text-agri-green text-xs font-bold hover:bg-agri-green/5 transition flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {status === "REJECTED" ? "Re-submit Verification Documents" : "Submit Verification Documents"}
            </button>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                {/* Accepted doc types hint */}
                <p className="text-[10px] text-agri-brown leading-relaxed">
                  Upload up to <span className="font-bold">5 files</span> (JPG, PNG, WEBP, PDF · max 5 MB each).
                  Accepted: <span className="font-bold">Aadhaar card</span>,{" "}
                  <span className="font-bold">land records (Khasra/Khatauni)</span>,{" "}
                  <span className="font-bold">GST certificate</span>, or{" "}
                  <span className="font-bold">PM-KISAN registration</span>.
                </p>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />

                {/* Drag-and-drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-xl border-2 border-dashed transition-all px-4 py-6 flex flex-col items-center gap-2 ${
                    dragOver
                      ? "border-agri-green bg-agri-green/5"
                      : "border-agri-green/20 hover:border-agri-green/40 hover:bg-agri-green/5"
                  }`}
                >
                  <Upload className={`w-6 h-6 ${dragOver ? "text-agri-green" : "text-agri-green/40"}`} />
                  <p className="text-xs font-bold text-agri-green">
                    {dragOver ? "Drop files here" : "Click to browse or drag & drop"}
                  </p>
                  <p className="text-[10px] text-agri-brown">JPG, PNG, WEBP, PDF — up to 5 MB each</p>
                </div>

                {/* File preview list */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-agri-green/5 rounded-xl border border-agri-green/10">
                        <span className="text-base">{fileIcon(f)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-agri-green-dark dark:text-gray-200 truncate">{f.name}</p>
                          <p className="text-[9px] text-agri-brown">{(f.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="flex-shrink-0 text-red-400 hover:text-red-600 transition"
                          aria-label="Remove file"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={uploadMutation.isPending || files.length === 0}
                    className="flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                        Uploading…
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        Upload & Submit ({files.length} file{files.length !== 1 ? "s" : ""})
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => { setShowForm(false); setFiles([]); }}
                    className="py-2 px-4 text-xs rounded-xl border-agri-green/15"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}

      {/* Verified — show badge preview */}
      {status === "VERIFIED" && (
        <div className="flex items-center gap-2 p-3 bg-agri-green/5 rounded-xl border border-agri-green/10">
          <BadgeCheck className="w-5 h-5 text-agri-green flex-shrink-0" />
          <div>
            <p className="text-xs font-extrabold text-agri-green">✓ Verified Badge Active</p>
            <p className="text-[10px] text-agri-brown">Your badge appears on all product listings and auction rooms.</p>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Farmer-specific right panel ──────────────────────────────────────────────
function FarmerRightPanel({ user, liveStats }) {
  const ts   = liveStats?.trustScore   ?? user.trustScore   ?? 20;
  const avg  = liveStats?.avgRating    ?? user.avgRating    ?? 0;
  const revs = liveStats?.totalReviews ?? user.totalReviews ?? 0;
  const cr   = liveStats?.completionRate ?? 0;

  const verifications = [
    { icon: Mail,       label: "Email verified",                                     done: !!user.email,    warn: false },
    { icon: Phone,      label: user.phone ? "Phone number added" : "Phone missing — add to profile", done: !!user.phone, warn: !user.phone },
    { icon: MapPin,     label: user.location ? `Farm location: ${user.location}` : "Farm location not set", done: !!user.location, warn: !user.location },
    { icon: Leaf,       label: user.bio ? "Farm description added" : "Farm description missing — buyers can't find you", done: !!user.bio, warn: !user.bio },
  ];

  return (
    <div className="space-y-5">
      {/* Trust Index — farmer's most important metric */}
      <Card className="border-agri-green/5 p-5 bg-gradient-to-br from-agri-green/5 to-transparent space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-agri-green-dark dark:text-agri-green-light flex items-center gap-1.5">
              <Award className="w-4 h-4 text-agri-green" /> Farmer Trust Index
            </h3>
            <p className="text-[10px] text-agri-brown mt-0.5">Computed from ratings, fulfilment & response</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-agri-green leading-none">{ts}</p>
            <p className="text-[9px] text-agri-brown font-bold uppercase">/ 100</p>
          </div>
        </div>

        {/* Score bar */}
        <div className="space-y-1">
          <div className="h-2 w-full bg-agri-green/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${ts}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className={`h-full rounded-full ${ts >= 80 ? "bg-agri-green" : ts >= 60 ? "bg-agri-wheat" : "bg-red-400"}`}
            />
          </div>
          <p className="text-[9px] text-agri-brown">
            {ts >= 80 ? "Excellent — high buyer confidence" : ts >= 60 ? "Good — improving with more trades" : "Building trust — complete your profile"}
          </p>
        </div>

        {/* Breakdown rows */}
        {[
          { label: "Avg Star Rating (40 pts)",    value: avg > 0 ? `${avg} / 5.0` : "No reviews yet" },
          { label: "Order Fulfilment Rate (40 pts)", value: cr > 0 ? `${cr}%` : "No completed orders" },
          { label: "Base Score (20 pts)",          value: "20 / 20" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between text-xs border-b border-agri-green/5 pb-2 last:border-none last:pb-0">
            <span className="text-agri-brown font-semibold">{label}</span>
            <span className="font-extrabold text-agri-green">{value}</span>
          </div>
        ))}

        {revs > 0 && (
          <p className="text-[10px] text-agri-brown border-t border-agri-green/5 pt-3">
            Based on <span className="font-extrabold text-agri-green">{revs}</span> buyer{revs !== 1 ? "s" : ""} who reviewed your produce
          </p>
        )}
      </Card>

      {/* Verification status */}
      <Card className="border-agri-green/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-agri-green-dark dark:text-agri-green-light">Profile Checklist</h3>
            <p className="text-[10px] text-agri-brown mt-0.5">Complete all checks to be listed higher in search</p>
          </div>
          <ShieldCheck className="w-8 h-8 text-agri-green opacity-60" />
        </div>
        {verifications.map((v, i) => <VerificationRow key={i} {...v} />)}
      </Card>

      {/* Official farmer verification */}
      <FarmerVerificationPanel user={user} />

      {/* Account info */}
      <Card className="border-agri-green/5 p-5 space-y-2">
        <h3 className="text-sm font-bold text-agri-green-dark dark:text-agri-green-light mb-1">Account Info</h3>
        <InfoRow icon={User}   label="Role"         value={<Badge variant="green" size="sm">FARMER</Badge>} />
        <InfoRow icon={Clock}  label="Member since" value={(liveStats?.createdAt || user.createdAt) ? new Date(liveStats?.createdAt || user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"} />
        <InfoRow icon={Wallet} label="Wallet"        value={`₹${((liveStats?.walletBalance ?? user.walletBalance) ?? 0).toLocaleString("en-IN")}`} />
      </Card>
    </div>
  );
}

// ─── Buyer-specific right panel ───────────────────────────────────────────────
function BuyerRightPanel({ user, orders }) {
  const delivered   = orders.filter((o) => o.status === "DELIVERED").length;
  const active      = orders.filter((o) => !["DELIVERED","CANCELLED"].includes(o.status)).length;
  const cancelled   = orders.filter((o) => o.status === "CANCELLED").length;
  const totalSpent  = orders.filter((o) => o.status === "DELIVERED").reduce((s, o) => s + Number(o.totalAmount || 0), 0);

  const verifications = [
    { icon: Mail,       label: "Email verified",                                    done: !!user.email,    warn: false },
    { icon: Phone,      label: user.phone ? "Phone number added" : "Phone number missing", done: !!user.phone, warn: !user.phone },
    { icon: MapPin,     label: user.location ? `Delivery region: ${user.location}` : "Delivery location not set — add for faster fulfilment", done: !!user.location, warn: !user.location },
    { icon: ShoppingBag, label: user.bio ? "Procurement profile filled" : "Procurement description missing — helps farmers prioritise you", done: !!user.bio, warn: !user.bio },
  ];

  return (
    <div className="space-y-5">
      {/* Purchase activity summary */}
      <Card className="border-agri-green/5 p-5 bg-gradient-to-br from-agri-green/5 to-transparent space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-agri-green-dark dark:text-agri-green-light flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-agri-green" /> Purchase Activity
            </h3>
            <p className="text-[10px] text-agri-brown mt-0.5">Your lifetime trading summary</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-agri-green leading-none">{orders.length}</p>
            <p className="text-[9px] text-agri-brown font-bold uppercase">total orders</p>
          </div>
        </div>

        {/* Spend bar */}
        {orders.length > 0 && (
          <div className="p-3 bg-white/40 dark:bg-black/20 rounded-xl border border-agri-green/5 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-agri-brown font-semibold">Total Spent (Delivered)</span>
              <span className="font-extrabold text-agri-green">₹{totalSpent.toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}

        {[
          { label: "Delivered",   value: delivered,  color: "text-agri-green" },
          { label: "In Progress", value: active,     color: "text-agri-wheat-dark dark:text-agri-wheat" },
          { label: "Cancelled",   value: cancelled,  color: "text-red-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between text-xs border-b border-agri-green/5 pb-2 last:border-none last:pb-0">
            <span className="text-agri-brown font-semibold">{label}</span>
            <span className={`font-extrabold ${color}`}>{value} order{value !== 1 ? "s" : ""}</span>
          </div>
        ))}
      </Card>

      {/* Verification status */}
      <Card className="border-agri-green/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-agri-green-dark dark:text-agri-green-light">Verification Status</h3>
            <p className="text-[10px] text-agri-brown mt-0.5">Complete all checks for priority access to farmers</p>
          </div>
          <ShieldCheck className="w-8 h-8 text-agri-green opacity-60" />
        </div>
        {verifications.map((v, i) => <VerificationRow key={i} {...v} />)}
      </Card>

      {/* Account info */}
      <Card className="border-agri-green/5 p-5 space-y-2">
        <h3 className="text-sm font-bold text-agri-green-dark dark:text-agri-green-light mb-1">Account Info</h3>
        <InfoRow icon={User}    label="Role"         value={<Badge variant="green" size="sm">BUYER</Badge>} />
        <InfoRow icon={Clock}   label="Member since" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"} />
        <InfoRow icon={Wallet}  label="Wallet"       value={`₹${(user.walletBalance ?? 0).toLocaleString("en-IN")}`} />
      </Card>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, updateProfile } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving]     = useState(false);

  const [name,      setName]      = useState(user?.name      || "");
  const [phone,     setPhone]     = useState(user?.phone     || "");
  const [location,  setLocation]  = useState(user?.location  || "");
  const [latitude,  setLatitude]  = useState(user?.latitude  ?? "");
  const [longitude, setLongitude] = useState(user?.longitude ?? "");
  const [bio,       setBio]       = useState(user?.bio       || "");
  const [avatar,    setAvatar]    = useState(user?.avatar    || "");

  const isFarmer = user?.role === "FARMER";
  const userId   = user?._id || user?.id;

  // Fetch live stats — different query per role
  const { data: farmerStats } = useQuery({
    queryKey: ["profileStats", "farmer", userId],
    queryFn:  () => apiService.getPublicProfile(userId),
    enabled:  isFarmer && !!userId,
    select:   (res) => res?.data,
  });

  // Sync server-fresh verification data into authStore whenever farmerStats loads.
  // This fixes two bugs:
  //   1. verificationStatus stays stale (localStorage) after admin approves/rejects
  //   2. verificationDocs are missing in authStore so documents couldn't be viewed
  useEffect(() => {
    if (!farmerStats || !isFarmer) return;
    updateProfile({
      verificationStatus: farmerStats.verificationStatus,
      verificationDocs:   farmerStats.verificationDocs   || [],
      verificationNote:   farmerStats.verificationNote   || "",
      verifiedAt:         farmerStats.verifiedAt         || null,
    });
  }, [farmerStats]);

  const { data: ordersRes } = useQuery({
    queryKey: ["profileOrders", "buyer", userId],
    queryFn:  () => apiService.getOrders("BUYER"),
    enabled:  !isFarmer && !!userId,
    select:   (res) => res?.data || [],
  });
  const buyerOrders = ordersRes || [];

  // Fetch fresh buyer profile data from server so createdAt and walletBalance
  // are always current — localStorage can have stale/incomplete user objects
  // especially for OAuth accounts or accounts created before these fields existed.
  const { data: freshBuyerData } = useQuery({
    queryKey: ["profileMe", userId],
    queryFn:  () => apiService.getMe(),
    enabled:  !isFarmer && !!userId,
    select:   (res) => res?.data,
  });
  // Merge fresh server data into authStore so subsequent renders use up-to-date values
  useEffect(() => {
    if (!freshBuyerData || isFarmer) return;
    updateProfile({
      createdAt:     freshBuyerData.createdAt,
      walletBalance: freshBuyerData.walletBalance ?? 0,
    });
  }, [freshBuyerData, isFarmer]);

  // Effective user object: merged with fresh server data for display
  const effectiveUser = (!isFarmer && freshBuyerData)
    ? { ...user, createdAt: freshBuyerData.createdAt, walletBalance: freshBuyerData.walletBalance ?? user?.walletBalance ?? 0 }
    : user;

  if (!user) return null;

  const completion = isFarmer ? calcFarmerCompletion(user) : calcBuyerCompletion(effectiveUser);

  // Derived farmer stats
  const farmerProductCount = farmerStats?.productCount ?? 0;
  const farmerFulfilled    = farmerStats?.completionRate != null
    ? `${farmerStats.completionRate}%` : "—";
  const farmerAvgRating    = farmerStats?.avgRating ?? 0;

  // Derived buyer stats
  const buyerTotalOrders = buyerOrders.length;
  const buyerTotalSpent  = buyerOrders
    .filter((o) => o.status === "DELIVERED")
    .reduce((s, o) => s + Number(o.totalAmount || 0), 0);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await apiService.updateProfile({ name, phone, location, bio, avatar, latitude, longitude });
      const updatedUser = response?.data;
      if (updatedUser) {
        updateProfile(updatedUser);
        setName(updatedUser.name || "");
        setPhone(updatedUser.phone || "");
        setLocation(updatedUser.location || "");
        setLatitude(updatedUser.latitude ?? "");
        setLongitude(updatedUser.longitude ?? "");
        setBio(updatedUser.bio || "");
        setAvatar(updatedUser.avatar || "");
      }
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator?.geolocation) { toast.error("Geolocation not available"); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        setLatitude(lat); setLongitude(lon);
        try {
          const url = new URL("https://geocoding-api.open-meteo.com/v1/reverse");
          url.searchParams.set("latitude",  String(lat));
          url.searchParams.set("longitude", String(lon));
          url.searchParams.set("language",  "en");
          url.searchParams.set("format",    "json");
          const res = await fetch(url);
          if (res.ok) {
            const d = await res.json();
            const label = [d?.name, d?.admin1, d?.country].filter(Boolean).join(", ");
            if (label) setLocation(label);
          }
        } catch {}
        toast.success("Location detected!");
      },
      () => toast.error("Unable to detect location"),
      { timeout: 10000 }
    );
  };

  const avatarSrc = avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80";

  // ── Config objects — all role-specific copy lives here ────────────────────
  const config = isFarmer ? {
    pageTitle:       "Farm Profile",
    pageSubtitle:    "Your marketplace identity — what wholesale buyers see when they discover your produce.",
    completionNote:  "A complete farm profile boosts buyer confidence and improves your marketplace ranking.",
    badgeLabel:      "Verified Farmer",
    roleBadgeColor:  "green",
    bioSectionTitle: "Farm Description",
    bioPlaceholder:  "Tell buyers about your farm: what crops you grow, farming methods (organic/conventional), certifications, typical harvest sizes, and minimum order quantities...",
    bioHint:         "Visible to all buyers browsing the marketplace. A good bio increases buyer inquiries.",
    editFormTitle:   "Edit Farm Profile",
    namePlaceholder: "Your farm or business name",
    nameLabel:       "Farm / Business Name",
    locationLabel:   "Farm Location (City, State)",
    bioLabel:        "Farm Description & Specialisation",
    statPills: [
      { icon: Boxes,    label: "Active Listings", value: farmerProductCount || "—",             color: "border-agri-green/10 text-agri-green bg-agri-green/5" },
      { icon: TrendingUp, label: "Fulfilment",    value: farmerFulfilled,                        color: "border-agri-wheat/15 text-agri-wheat-dark bg-agri-wheat/5" },
      { icon: Star,     label: "Avg Rating",      value: farmerAvgRating > 0 ? `${farmerAvgRating} ★` : "No reviews", color: "border-agri-brown/10 text-agri-brown bg-agri-brown/5" },
    ],
  } : {
    pageTitle:       "Buyer Profile",
    pageSubtitle:    "Your trade identity with verified farmers across the AgroVista marketplace.",
    completionNote:  "Complete profiles receive priority attention from verified farmers listing produce.",
    badgeLabel:      "Verified Buyer",
    roleBadgeColor:  "green",
    bioSectionTitle: "Procurement Description",
    bioPlaceholder:  "Describe your procurement needs: business type (restaurant, wholesaler, retailer), crops you typically buy, preferred volumes, sourcing frequency, and any quality requirements...",
    bioHint:         "Helps farmers understand your requirements before they accept an order.",
    editFormTitle:   "Edit Buyer Profile",
    namePlaceholder: "Your name or business name",
    nameLabel:       "Full Name / Business Name",
    locationLabel:   "Delivery Region (City, State)",
    bioLabel:        "Procurement Description",
    statPills: [
      { icon: ShoppingBag, label: "Orders Placed",  value: buyerTotalOrders || "0",                   color: "border-agri-green/10 text-agri-green bg-agri-green/5" },
      { icon: CircleDollarSign, label: "Total Spent", value: buyerTotalSpent > 0 ? `₹${buyerTotalSpent.toLocaleString("en-IN")}` : "₹0", color: "border-agri-wheat/15 text-agri-wheat-dark bg-agri-wheat/5" },
      { icon: Wallet,      label: "Wallet Balance", value: `₹${(effectiveUser?.walletBalance ?? 0).toLocaleString("en-IN")}`, color: "border-agri-brown/10 text-agri-brown bg-agri-brown/5" },
    ],
  };

  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col transition-colors">
      <Header />

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">

          {/* ── Page header ──────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-agri-green-dark dark:text-agri-green-light tracking-tight">
                {config.pageTitle}
              </h1>
              <p className="text-xs sm:text-sm text-agri-brown mt-1">{config.pageSubtitle}</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold border-agri-green/20 self-start sm:self-auto"
            >
              {isEditing ? <><X className="w-4 h-4" /> Cancel</> : <><Edit3 className="w-4 h-4" /> Edit Profile</>}
            </Button>
          </div>

          {/* ── Completion banner ─────────────────────────────────────── */}
          {completion < 100 && !isEditing && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-agri-wheat/10 border border-agri-wheat/20"
            >
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-agri-wheat-dark dark:text-agri-wheat">
                    Profile {completion}% complete — {config.completionNote}
                  </span>
                  <button onClick={() => setIsEditing(true)} className="text-agri-green dark:text-agri-green-light hover:underline flex-shrink-0 ml-2">
                    Complete now →
                  </button>
                </div>
                <div className="h-1.5 w-full bg-agri-wheat/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completion}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-agri-wheat rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* ── LEFT COLUMN ───────────────────────────────────────────── */}
            <div className="lg:col-span-7 space-y-6">
              <AnimatePresence mode="wait">

                {/* ── VIEW MODE ── */}
                {!isEditing && (
                  <motion.div key="view" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Card className="border-agri-green/5 overflow-hidden">
                      {/* Cover strip — slightly different tint per role */}
                      <div className={`h-24 relative ${isFarmer
                        ? "bg-gradient-to-r from-agri-green-dark via-agri-green to-emerald-500"
                        : "bg-gradient-to-r from-agri-green-dark via-teal-700 to-agri-green"
                      }`}>
                        <div className="absolute inset-0 opacity-10 bg-[url('/grid.svg')]" />
                        {/* Role icon watermark */}
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10">
                          {isFarmer
                            ? <Sprout className="w-16 h-16 text-white" />
                            : <ShoppingBag className="w-16 h-16 text-white" />
                          }
                        </div>
                      </div>

                      <div className="px-6 pb-6 space-y-6">
                        {/* Avatar row */}
                        <div className="flex items-end justify-between -mt-12 mb-2">
                          <div className="relative">
                            <img src={avatarSrc} alt={user.name}
                              className="w-24 h-24 rounded-3xl object-cover border-4 border-white dark:border-zinc-900 shadow-xl"
                            />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-agri-green rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center">
                              {isFarmer ? <Leaf className="w-3 h-3 text-white" /> : <BadgeCheck className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          <Badge variant="green" size="sm">{config.badgeLabel}</Badge>
                        </div>

                        {/* Name + location */}
                        <div className="space-y-1">
                          <h2 className="text-2xl font-black text-agri-green-dark dark:text-agri-green-light">{user.name}</h2>
                          <p className="text-xs text-agri-brown font-semibold flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-agri-green" />
                            {user.location || (
                              <span className="text-agri-wheat-dark italic">
                                {isFarmer ? "Farm location" : "Delivery region"} not set —{" "}
                                <button onClick={() => setIsEditing(true)} className="underline">add now</button>
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Stat pills */}
                        <div className="grid grid-cols-3 gap-3">
                          {config.statPills.map((pill) => (
                            <StatPill key={pill.label} {...pill} />
                          ))}
                        </div>

                        <div className="h-px bg-agri-green/5" />

                        {/* Bio */}
                        <div className="space-y-2">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-agri-green">
                            {config.bioSectionTitle}
                          </h3>
                          <p className="text-xs sm:text-sm text-agri-brown dark:text-gray-300 leading-relaxed bg-white/40 dark:bg-black/20 p-4 rounded-2xl border border-agri-green/5 min-h-[60px]">
                            {user.bio || (
                              <span className="italic text-agri-brown/60">
                                No description added yet.{" "}
                                <button onClick={() => setIsEditing(true)} className="text-agri-green hover:underline not-italic">
                                  Click Edit Profile to add yours.
                                </button>
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="h-px bg-agri-green/5" />

                        {/* Contact info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { icon: Mail,  label: "Email Address", value: user.email },
                            { icon: Phone, label: isFarmer ? "Contact Phone" : "Registered Phone", value: user.phone || "—" },
                          ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="flex items-center gap-3 p-3.5 bg-white/50 dark:bg-black/20 border border-agri-green/5 rounded-xl">
                              <Icon className="w-4 h-4 text-agri-green flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[9px] uppercase font-bold text-agri-brown/60 tracking-wider">{label}</p>
                                <p className="text-xs font-semibold text-agri-green-dark dark:text-gray-200 truncate">{value}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )}

                {/* ── EDIT MODE ── */}
                {isEditing && (
                  <motion.div key="edit" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <form onSubmit={handleSave}>
                      <Card className="border-agri-green/5 p-6 space-y-5">
                        <div>
                          <h3 className="text-sm font-black text-agri-green-dark dark:text-agri-green-light">
                            {config.editFormTitle}
                          </h3>
                          <p className="text-[10px] text-agri-brown mt-0.5">
                            {isFarmer
                              ? "Buyers will see this information when browsing the marketplace."
                              : "Farmers see this when reviewing your order requests."}
                          </p>
                        </div>

                        {/* Avatar */}
                        <div className="flex items-center gap-4 p-4 bg-agri-green/5 rounded-2xl border border-agri-green/10">
                          <div className="relative flex-shrink-0">
                            <img src={avatar || avatarSrc} alt="Preview"
                              className="w-16 h-16 rounded-2xl object-cover border-2 border-agri-green/20"
                            />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-agri-green rounded-full flex items-center justify-center">
                              <Camera className="w-2.5 h-2.5 text-white" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <Input label="Avatar / Photo URL" id="avatar" value={avatar}
                              onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." />
                          </div>
                        </div>

                        <Input label={config.nameLabel} id="name" value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={config.namePlaceholder} required />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input label="Phone Number" id="phone" value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder={isFarmer ? "For buyer inquiries" : "For order confirmations"} />
                          <div className="space-y-1">
                            <Input label={config.locationLabel} id="location" value={location}
                              onChange={(e) => setLocation(e.target.value)} />
                            <button type="button" onClick={handleUseCurrentLocation}
                              className="flex items-center gap-1.5 text-[10px] font-bold text-agri-green hover:text-agri-green-dark transition">
                              <Navigation className="w-3 h-3" />
                              {isFarmer ? "Detect farm location" : "Detect my location"}
                            </button>
                            {latitude && (
                              <p className="text-[10px] text-agri-brown/60">
                                GPS: {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="bio" className="text-xs font-semibold text-agri-green-dark dark:text-agri-green-light">
                            {config.bioLabel}
                          </label>
                          <textarea id="bio" rows={5} value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder={config.bioPlaceholder}
                            className="w-full px-4 py-3 rounded-2xl border text-sm bg-white/60 dark:bg-black/30 border-agri-green/10 focus:outline-none focus:ring-2 focus:ring-agri-green/20 resize-none text-agri-green-dark dark:text-gray-200 placeholder:text-agri-brown/40"
                          />
                          <p className="text-[10px] text-agri-brown/70">{config.bioHint}</p>
                        </div>

                        <Button type="submit" variant="primary" disabled={saving}
                          className="w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md shadow-agri-green/20">
                          {saving
                            ? <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Saving…</>
                            : <><Save className="w-4 h-4" /> Save Changes</>
                          }
                        </Button>
                      </Card>
                    </form>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* ── RIGHT COLUMN ──────────────────────────────────────────── */}
            <div className="lg:col-span-5">
              {isFarmer
                ? <FarmerRightPanel user={user} liveStats={farmerStats} />
                : <BuyerRightPanel  user={effectiveUser} orders={buyerOrders} />
              }
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}