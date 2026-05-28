"use client";

import React, { useState } from "react";
import { CloudRain, Sun, CloudSun, Wind, Droplets, Thermometer, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";

export default function WeatherWidget() {
  const [region, setRegion] = useState("Nashik Region");
  
  // Static mock weather that fits agriculture advice
  const weatherData = {
    temp: 32,
    humidity: 58,
    rainProb: 12,
    wind: 14,
    condition: "Sunny & Warm",
    icon: Sun,
    suggestion: "Optimal conditions for harvesting vegetables and soil aeration. Moisture levels are ideal. Ensure proper ventilation in transport crates to avoid heat buildup."
  };

  const Icon = weatherData.icon;

  return (
    <Card className="border-agri-green/5 bg-gradient-to-br from-white/80 to-agri-green/5 dark:from-[#121F16]/80 dark:to-agri-green/5">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-none">
        <div>
          <CardTitle className="text-sm font-bold text-agri-green">Weather & Crop Advisor</CardTitle>
          <span className="text-[10px] text-agri-brown font-bold uppercase">{region}</span>
        </div>
        <Icon className="w-8 h-8 text-agri-wheat animate-pulse-slow" />
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Core metrics grid */}
        <div className="grid grid-cols-3 gap-2 text-center bg-white/50 dark:bg-black/30 p-3 rounded-2xl border border-agri-green/5">
          <div className="flex flex-col items-center">
            <Thermometer className="w-4 h-4 text-orange-500 mb-1" />
            <span className="text-xs text-agri-brown">Temp</span>
            <span className="text-sm font-black text-agri-green-dark dark:text-white">{weatherData.temp}°C</span>
          </div>
          <div className="flex flex-col items-center">
            <Droplets className="w-4 h-4 text-blue-500 mb-1" />
            <span className="text-xs text-agri-brown">Humidity</span>
            <span className="text-sm font-black text-agri-green-dark dark:text-white">{weatherData.humidity}%</span>
          </div>
          <div className="flex flex-col items-center">
            <CloudRain className="w-4 h-4 text-indigo-500 mb-1" />
            <span className="text-xs text-agri-brown">Rain Prob</span>
            <span className="text-sm font-black text-agri-green-dark dark:text-white">{weatherData.rainProb}%</span>
          </div>
        </div>

        {/* Suggestion Card */}
        <div className="p-3.5 bg-agri-green/5 rounded-2xl border border-agri-green/10 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-agri-green shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black uppercase text-agri-green">Agronomy Advice</p>
            <p className="text-xs text-agri-brown dark:text-gray-300 mt-1 leading-relaxed">
              {weatherData.suggestion}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
