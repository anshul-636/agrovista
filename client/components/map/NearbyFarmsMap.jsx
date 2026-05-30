"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [19.9975, 73.7898];

async function geocodeLocation(location) {
  const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodeUrl.searchParams.set("name", location);
  geocodeUrl.searchParams.set("count", "1");
  geocodeUrl.searchParams.set("language", "en");
  geocodeUrl.searchParams.set("format", "json");
  geocodeUrl.searchParams.set("country", "IN");

  const response = await fetch(geocodeUrl, { cache: "no-store" });
  if (!response.ok) return null;

  const data = await response.json();
  const result = data?.results?.[0];
  if (!result) return null;

  return {
    coords: [result.latitude, result.longitude],
    label: [result.name, result.admin1, result.country].filter(Boolean).join(", "),
  };
}

export default function NearbyFarmsMap({ farms = [], location = "", fallbackLabel = "Your location", centerCoords = null }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const farmsLayerRef = useRef(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [centerLabel, setCenterLabel] = useState(fallbackLabel);

  useEffect(() => {
    let cancelled = false;

    if (typeof window === "undefined" || !mapContainerRef.current) return;

    const resolveCenter = async () => {
      // Priority: explicit centerCoords prop -> saved textual location -> browser geolocation -> default
      if (centerCoords && Array.isArray(centerCoords) && centerCoords.length === 2) {
        setCenter(centerCoords);
        setCenterLabel(fallbackLabel);
        return;
      }

      if (location) {
        const resolved = await geocodeLocation(location);
        if (!cancelled && resolved?.coords) {
          setCenter(resolved.coords);
          setCenterLabel(resolved.label || location);
          return;
        }
      }

      if (navigator?.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (!cancelled) {
              setCenter([position.coords.latitude, position.coords.longitude]);
              setCenterLabel("Your current location");
            }
          },
          () => {
            if (!cancelled) {
              setCenter(DEFAULT_CENTER);
              setCenterLabel(fallbackLabel);
            }
          },
          { timeout: 5000 }
        );
        return;
      }

      if (!cancelled) {
        setCenter(DEFAULT_CENTER);
        setCenterLabel(fallbackLabel);
      }
    };

    resolveCenter();

    return () => {
      cancelled = true;
    };
  }, [fallbackLabel, location, centerCoords]);

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

    // Initialize map
    const map = L.map(mapContainerRef.current).setView(DEFAULT_CENTER, 9);
    mapInstanceRef.current = map;

    // OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    farmsLayerRef.current = L.layerGroup().addTo(map);

    userMarkerRef.current = L.marker(DEFAULT_CENTER)
      .addTo(map)
      .bindPopup(`<strong>${fallbackLabel}</strong>`);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        userMarkerRef.current = null;
        farmsLayerRef.current = null;
      }
    };
  }, [fallbackLabel]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.setView(center, 9);

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(center).setPopupContent(`<strong>${centerLabel}</strong>`);
    }
  }, [center, centerLabel]);

  useEffect(() => {
    if (!farmsLayerRef.current) return;

    farmsLayerRef.current.clearLayers();

    farms.forEach((farm) => {
      if (!Array.isArray(farm.coords) || farm.coords.length < 2) return;

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

      L.marker(farm.coords).addTo(farmsLayerRef.current).bindPopup(popupContent);
    });
  }, [farms]);

  return (
    <div className="w-full h-full min-h-[300px] relative rounded-3xl overflow-hidden shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-10" />
    </div>
  );
}
