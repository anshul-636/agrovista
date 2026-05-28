"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function NearbyFarmsMap() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    // Check if map already initialized to avoid re-creation errors
    if (mapInstanceRef.current) return;

    // Fixed default icon issue in Leaflet on window load
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });

    // Mock central coordinate (e.g. Maharashtra region center)
    const center = [19.9975, 73.7898]; // Nashik, Maharashtra
    
    // Initialize map
    const map = L.map(mapContainerRef.current).setView(center, 9);
    mapInstanceRef.current = map;

    // OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Mock Farms coordinates
    const nearbyFarms = [
      {
        name: "Priya Organic Farms",
        farmer: "Rajesh Kumar",
        coords: [19.9975, 73.7898],
        crops: "Roma Tomatoes, Potatoes",
        trustScore: 94
      },
      {
        name: "Sai Agri Fields",
        farmer: "Dinesh Patel",
        coords: [20.0883, 73.8778],
        crops: "Red Globe Onions, Chilies",
        trustScore: 89
      },
      {
        name: "Green Valley Orchards",
        coords: [19.9122, 73.6823],
        farmer: "Suresh Patel",
        crops: "Grapes, Pomegranates",
        trustScore: 92
      }
    ];

    // Add markers with customizable popups
    nearbyFarms.forEach(farm => {
      const popupContent = `
        <div style="font-family: var(--font-family-sans); font-size: 11px; padding: 4px; min-width: 150px;">
          <h5 style="margin: 0; font-weight: 800; color: #1B5E20; font-size:12px;">${farm.name}</h5>
          <p style="margin: 3px 0; font-weight: 600;">Grower: ${farm.farmer}</p>
          <p style="margin: 3px 0; font-weight: 500; color: #8D6E63;">Crops: ${farm.crops}</p>
          <div style="margin-top: 6px; display: inline-block; background: rgba(46, 125, 50, 0.1); color: #2E7D32; font-weight: 700; padding: 2px 6px; border-radius: 99px; font-size: 9px;">
            Trust Score: ${farm.trustScore}%
          </div>
        </div>
      `;

      L.marker(farm.coords)
        .addTo(map)
        .bindPopup(popupContent);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full min-h-[300px] relative rounded-3xl overflow-hidden shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-10" />
    </div>
  );
}
