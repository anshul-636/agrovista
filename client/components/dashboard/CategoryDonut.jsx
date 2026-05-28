"use client";

import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function CategoryDonut({ data = [] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-64 w-full flex items-center justify-center bg-gray-50/50 dark:bg-zinc-900/30 rounded-2xl animate-pulse">
        <span className="text-xs text-agri-brown">Loading breakdown metrics...</span>
      </div>
    );
  }

  return (
    <div className="h-64 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "rgba(255, 255, 255, 0.95)",
              border: "1px solid rgba(46, 125, 50, 0.15)",
              borderRadius: "1rem",
              fontFamily: "var(--font-family-sans)",
              fontSize: "11px",
            }}
            formatter={(value) => [`₹${value}`, "Revenue"]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{
              fontSize: "11px",
              fontFamily: "var(--font-family-sans)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
