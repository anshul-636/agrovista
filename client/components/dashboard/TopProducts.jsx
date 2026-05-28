"use client";

import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function TopProducts({ data = [] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-64 w-full flex items-center justify-center bg-gray-50/50 dark:bg-zinc-900/30 rounded-2xl animate-pulse">
        <span className="text-xs text-agri-brown">Loading sales metrics...</span>
      </div>
    );
  }

  return (
    <div className="h-64 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(46,125,50,0.05)" />
          <XAxis
            dataKey="name"
            stroke="rgba(141,110,99,0.7)"
            fontSize={10}
            tickLine={false}
          />
          <YAxis
            stroke="rgba(141,110,99,0.7)"
            fontSize={10}
            tickLine={false}
            tickFormatter={(v) => `₹${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(255, 255, 255, 0.95)",
              border: "1px solid rgba(46, 125, 50, 0.15)",
              borderRadius: "1rem",
              fontFamily: "var(--font-family-sans)",
              fontSize: "11px",
            }}
            formatter={(value) => [`₹${value}`, "Total Sales"]}
          />
          <Bar
            dataKey="revenue"
            fill="#F9A825"
            radius={[8, 8, 0, 0]}
            maxBarSize={45}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
