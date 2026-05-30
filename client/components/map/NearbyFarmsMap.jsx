"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";

// MarkerCluster runtime loader URLs
const MARKER_CLUSTER_CSS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
const MARKER_CLUSTER_DEFAULT_CSS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
const MARKER_CLUSTER_JS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";

async function loadMarkerCluster() {
  if (typeof window === 'undefined') return;
  if (window._leafletMarkerClusterLoaded) return;

  // inject CSS
  const ensureLink = (href) => {
    if (!document.querySelector(`link[href='${href}']`)) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      document.head.appendChild(l);
    }
  };

  ensureLink(MARKER_CLUSTER_CSS);
  ensureLink(MARKER_CLUSTER_DEFAULT_CSS);

  // inject script and await load
  if (!document.querySelector(`script[src='${MARKER_CLUSTER_JS}']`)) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = MARKER_CLUSTER_JS;
      s.async = true;
      s.onload = () => { window._leafletMarkerClusterLoaded = true; resolve(); };
      s.onerror = (e) => reject(e);
      document.body.appendChild(s);
    });
  } else {
    window._leafletMarkerClusterLoaded = true;
  }
}

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
  const clusterGroupRef = useRef(null);
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

    // attempt to load markercluster plugin at runtime
    loadMarkerCluster().then(() => {
      try {
        if (window.L && typeof window.L.markerClusterGroup === 'function') {
          clusterGroupRef.current = L.markerClusterGroup();
          map.addLayer(clusterGroupRef.current);
        }
      } catch (err) {
        // fallback to simple layerGroup
        clusterGroupRef.current = farmsLayerRef.current;
      }
    }).catch(() => {
      clusterGroupRef.current = farmsLayerRef.current;
    });

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
    const targetLayer = clusterGroupRef.current || farmsLayerRef.current;
    if (!targetLayer) return;
    if (typeof targetLayer.clearLayers === 'function') targetLayer.clearLayers();

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

      // custom simple icon as a colored dot using DivIcon
      const farmIcon = L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;border-radius:50%;background:#2E7D32;border:3px solid white;box-shadow:0 0 0 2px rgba(46,125,50,0.12)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      const marker = L.marker(farm.coords, { icon: farmIcon }).bindPopup(popupContent);
      if (typeof targetLayer.addLayer === 'function') targetLayer.addLayer(marker);
      else if (typeof targetLayer.addTo === 'function') marker.addTo(targetLayer);
    });
  }, [farms]);

  // compute distance (km) between two [lat, lon] points
  const haversine = (a, b) => {
    const toRad = (v) => (v * Math.PI) / 180;
    const [lat1, lon1] = a;
    const [lat2, lon2] = b;
    const R = 6371; // Earth radius km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };

  const highlightNearest = () => {
    if (!mapInstanceRef.current || !Array.isArray(farms) || farms.length === 0) return;
    const center = mapInstanceRef.current.getCenter();
    const centerArr = [center.lat, center.lng];
    let best = null;
    for (const f of farms) {
      if (!Array.isArray(f.coords) || f.coords.length < 2) continue;
      const d = haversine(centerArr, f.coords);
      if (!best || d < best.d) best = { farm: f, d };
    }
    if (best && best.farm && Array.isArray(best.farm.coords)) {
      mapInstanceRef.current.setView(best.farm.coords, 13);
      L.popup()
        .setLatLng(best.farm.coords)
        .setContent(`<strong>${best.farm.name}</strong><div style="font-size:11px;">Grower: ${best.farm.farmer || ''}</div>`) 
        .openOn(mapInstanceRef.current);
    }
  };

  return (
    <div className="w-full h-full min-h-[300px] relative rounded-3xl overflow-hidden shadow-inner">
      <div className="absolute left-4 top-4 z-30">
        <button
          type="button"
          aria-label="Find nearest farm"
          onClick={highlightNearest}
          className="bg-white text-gray-800 dark:bg-black dark:text-white px-3 py-2 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 font-medium"
        >
          Find nearest farm
        </button>
      </div>
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-10" />
    </div>
  );
}
