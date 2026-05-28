"use client";

import React from "react";
import Header from "../../../components/shared/Header";
import Sidebar from "../../../components/shared/Sidebar";
import OrderDetailContent from "../../../components/orders/OrderDetailContent";

export default function OrderDetailPage() {
  return (
    <div className="min-h-screen bg-agri-cream dark:bg-zinc-950 flex flex-col text-current transition-colors">
      <Header />
      <div className="flex flex-1">
        <Sidebar role="buyer" />
        <main className="flex-1">
          <OrderDetailContent />
        </main>
      </div>
    </div>
  );
}
