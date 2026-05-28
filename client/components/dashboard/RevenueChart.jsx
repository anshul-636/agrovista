"use client";

import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function RevenueChart({ data = [] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-64 w-full flex items-center justify-center bg-gray-50/50 dark:bg-zinc-900/30 rounded-2xl animate-pulse">
        <span className="text-xs text-agri-brown">Loading revenue charts...</span>
      </div>
    );
  }

  return (
    <div className="h-64 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(46,125,50,0.05)" />
          <XAxis
            dataKey="date"
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
              boxShadow: "0 10px 20px -10px rgba(0,0,0,0.1)"
            }}
            formatter={(value) => [`₹${value}`, "Revenue"]}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#2E7D32"
            strokeWidth={3}
            dot={{ r: 4, stroke: "#66BB6A", strokeWidth: 2, fill: "#fff" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
