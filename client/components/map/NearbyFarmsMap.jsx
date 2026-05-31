"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";

// ── Tile options ─────────────────────────────────────────────────────────────
// CartoDB Positron — clean, Google Maps-like, no API key needed
const TILE_URL   = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTR  = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

// OSRM public routing (free, no key)
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

// MarkerCluster CDN
const MC_CSS  = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
const MC_CSS2 = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
const MC_JS   = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";

const DEFAULT_CENTER = [20.5937, 78.9629]; // Centre of India

// ── helpers ──────────────────────────────────────────────────────────────────
async function loadMarkerCluster() {
  if (typeof window === "undefined" || window._mcLoaded) return;
  const ensureLink = (href) => {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const l = document.createElement("link");
      l.rel = "stylesheet"; l.href = href;
      document.head.appendChild(l);
    }
  };
  ensureLink(MC_CSS); ensureLink(MC_CSS2);
  if (!document.querySelector(`script[src="${MC_JS}"]`)) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = MC_JS; s.async = true;
      s.onload = () => { window._mcLoaded = true; res(); };
      s.onerror = rej;
      document.body.appendChild(s);
    });
  } else { window._mcLoaded = true; }
}

async function geocodeLocation(location) {
  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", location);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    url.searchParams.set("country", "IN");
    const data = await fetch(url).then(r => r.json());
    const r = data?.results?.[0];
    if (!r) return null;
    return { coords: [r.latitude, r.longitude], label: [r.name, r.admin1].filter(Boolean).join(", ") };
  } catch { return null; }
}

async function fetchRoute(from, to) {
  // from / to are [lat, lng] — OSRM wants lng,lat
  try {
    const url = `${OSRM_URL}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const data = await fetch(url).then(r => r.json());
    if (data.code !== "Ok") return null;
    const route = data.routes[0];
    return {
      geojson: route.geometry,
      distanceKm: (route.distance / 1000).toFixed(1),
      durationMin: Math.round(route.duration / 60),
    };
  } catch { return null; }
}

// Custom SVG marker factories
const userPin = (label) => L.divIcon({
  className: "",
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="
        background:#2E7D32;color:#fff;font-size:10px;font-weight:800;
        padding:4px 8px;border-radius:99px;white-space:nowrap;
        box-shadow:0 2px 8px rgba(46,125,50,.35);
        max-width:120px;overflow:hidden;text-overflow:ellipsis;
      ">${label}</div>
      <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
        <path d="M10 0C4.48 0 0 4.48 0 10c0 7.5 10 14 10 14s10-6.5 10-14c0-5.52-4.48-10-10-10z" fill="#2E7D32"/>
        <circle cx="10" cy="10" r="4" fill="white"/>
      </svg>
    </div>`,
  iconSize: [120, 48],
  iconAnchor: [60, 48],
});

const farmPin = (trustScore) => {
  const color = trustScore >= 70 ? "#1B5E20" : trustScore >= 40 ? "#F57F17" : "#B71C1C";
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:1px">
        <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 6 8 12 8 12s8-6 8-12c0-4.42-3.58-8-8-8z" fill="${color}"/>
          <circle cx="8" cy="8" r="3" fill="white"/>
        </svg>
      </div>`,
    iconSize: [16, 20],
    iconAnchor: [8, 20],
  });
};

// ── component ─────────────────────────────────────────────────────────────────
export default function NearbyFarmsMap({
  farms = [],
  location = "",
  fallbackLabel = "Your location",
  centerCoords = null,
  // optional: pass farmer + buyer coords to draw a delivery route
  routeFrom = null, // [lat, lng]
  routeTo = null,   // [lat, lng]
}) {
  const containerRef  = useRef(null);
  const mapRef        = useRef(null);
  const userMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const clusterRef    = useRef(null);
  const farmsLayerRef = useRef(null);

  const [center, setCenter]     = useState(DEFAULT_CENTER);
  const [centerLabel, setLabel] = useState(fallbackLabel);
  const [routeInfo, setRouteInfo] = useState(null); // { distanceKm, durationMin }
  const [isRouting, setIsRouting] = useState(false);

  // ── resolve center coords ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (centerCoords?.length === 2) {
        setCenter(centerCoords); setLabel(fallbackLabel); return;
      }
      if (location) {
        const r = await geocodeLocation(location);
        if (!cancelled && r) { setCenter(r.coords); setLabel(r.label); return; }
      }
      if (navigator?.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (p) => { if (!cancelled) { setCenter([p.coords.latitude, p.coords.longitude]); setLabel("Your location"); } },
          () => { if (!cancelled) { setCenter(DEFAULT_CENTER); setLabel(fallbackLabel); } },
          { timeout: 5000 }
        );
      }
    })();
    return () => { cancelled = true; };
  }, [location, centerCoords, fallbackLabel]);

  // ── initialise map once ──────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || mapRef.current) return;

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });

    const map = L.map(containerRef.current, {
      zoomControl: false,  // we add a custom positioned one below
    }).setView(DEFAULT_CENTER, 6);
    mapRef.current = map;

    // ── Voyager tiles (looks like Google Maps) ───────────────────────────
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);

    // ── Controls ─────────────────────────────────────────────────────────
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

    farmsLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);

    // user marker
    userMarkerRef.current = L.marker(DEFAULT_CENTER, { icon: userPin(fallbackLabel) }).addTo(map);

    // load marker cluster
    loadMarkerCluster().then(() => {
      try {
        if (window.L?.markerClusterGroup) {
          clusterRef.current = L.markerClusterGroup({ maxClusterRadius: 60 });
          map.addLayer(clusterRef.current);
        } else {
          clusterRef.current = farmsLayerRef.current;
        }
      } catch { clusterRef.current = farmsLayerRef.current; }
    }).catch(() => { clusterRef.current = farmsLayerRef.current; });

    return () => {
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
    };
  }, [fallbackLabel]);

  // ── update user marker when center changes ───────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, 9, { animate: true });
    userMarkerRef.current?.setLatLng(center).setIcon(userPin(centerLabel));
  }, [center, centerLabel]);

  // ── render farm markers ──────────────────────────────────────────────────
  useEffect(() => {
    if (!farmsLayerRef.current) return;
    const layer = clusterRef.current || farmsLayerRef.current;
    if (typeof layer.clearLayers === "function") layer.clearLayers();

    farms.forEach((farm) => {
      if (!Array.isArray(farm.coords) || farm.coords.length < 2) return;

      const score = farm.trustScore ?? 20;
      const scoreColor = score >= 70 ? "#1B5E20" : score >= 40 ? "#F57F17" : "#B71C1C";

      const popup = `
        <div style="font-family:sans-serif;font-size:12px;min-width:160px;padding:4px 0">
          <div style="font-weight:800;color:#1B5E20;font-size:13px;margin-bottom:4px">${farm.name}</div>
          <div style="color:#5D4037;margin-bottom:2px">👨‍🌾 ${farm.farmer}</div>
          <div style="color:#5D4037;margin-bottom:6px">🌾 ${farm.crops}</div>
          <div style="display:inline-flex;align-items:center;gap:4px;background:${scoreColor}18;
               color:${scoreColor};font-weight:700;padding:3px 8px;border-radius:99px;font-size:10px">
            ⭐ ${score}% Trust
          </div>
        </div>`;

      L.marker(farm.coords, { icon: farmPin(score) })
        .bindPopup(popup, { maxWidth: 200 })
        .addTo(layer);
    });
  }, [farms]);

  // ── draw route when routeFrom/routeTo supplied ───────────────────────────
  useEffect(() => {
    if (!routeLayerRef.current) return;
    routeLayerRef.current.clearLayers();
    setRouteInfo(null);
    if (!routeFrom || !routeTo) return;

    setIsRouting(true);
    fetchRoute(routeFrom, routeTo).then((result) => {
      setIsRouting(false);
      if (!result || !mapRef.current) return;

      const routeLine = L.geoJSON(result.geojson, {
        style: {
          color: "#2E7D32",
          weight: 4,
          opacity: 0.85,
          dashArray: null,
        },
      }).addTo(routeLayerRef.current);

      // Fit map to show the full route
      mapRef.current.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
      setRouteInfo({ distanceKm: result.distanceKm, durationMin: result.durationMin });
    });
  }, [routeFrom, routeTo]);

  // ── find nearest farm ────────────────────────────────────────────────────
  const haversine = (a, b) => {
    const R = 6371, toRad = v => v * Math.PI / 180;
    const dLat = toRad(b[0] - a[0]), dLon = toRad(b[1] - a[1]);
    return 2 * R * Math.asin(Math.sqrt(
      Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2
    ));
  };

  const highlightNearest = () => {
    if (!mapRef.current || !farms.length) return;
    const c = mapRef.current.getCenter();
    let best = null;
    for (const f of farms) {
      if (!Array.isArray(f.coords) || f.coords.length < 2) continue;
      const d = haversine([c.lat, c.lng], f.coords);
      if (!best || d < best.d) best = { farm: f, d };
    }
    if (best) {
      mapRef.current.setView(best.farm.coords, 13, { animate: true });
      L.popup()
        .setLatLng(best.farm.coords)
        .setContent(`<strong>${best.farm.name}</strong><br/><span style="font-size:11px">📍 ${best.d.toFixed(1)} km away</span>`)
        .openOn(mapRef.current);
    }
  };

  const locateMe = () => {
    if (!navigator?.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const coords = [p.coords.latitude, p.coords.longitude];
        setCenter(coords);
        setLabel("You are here");
        mapRef.current.setView(coords, 12, { animate: true });
      },
      () => {}
    );
  };

  return (
    <div className="w-full h-full min-h-[300px] relative rounded-3xl overflow-hidden shadow-inner">

      {/* Toolbar */}
      <div className="absolute left-3 top-3 z-30 flex flex-col gap-2">
        <button
          type="button"
          onClick={highlightNearest}
          className="bg-white dark:bg-zinc-900 text-gray-800 dark:text-white px-3 py-2 rounded-xl shadow-md border border-gray-200 dark:border-zinc-700 font-semibold text-xs hover:bg-gray-50 transition flex items-center gap-1.5"
        >
          🌾 Find nearest farm
        </button>
        <button
          type="button"
          onClick={locateMe}
          className="bg-white dark:bg-zinc-900 text-gray-800 dark:text-white px-3 py-2 rounded-xl shadow-md border border-gray-200 dark:border-zinc-700 font-semibold text-xs hover:bg-gray-50 transition flex items-center gap-1.5"
        >
          📍 Locate me
        </button>
      </div>

      {/* Route info badge */}
      {isRouting && (
        <div className="absolute top-3 right-3 z-30 bg-white dark:bg-zinc-900 px-3 py-2 rounded-xl shadow-md text-xs font-semibold text-agri-brown animate-pulse">
          Calculating route…
        </div>
      )}
      {routeInfo && !isRouting && (
        <div className="absolute top-3 right-3 z-30 bg-white dark:bg-zinc-900 px-3 py-2 rounded-xl shadow-md text-xs font-semibold flex gap-3 border border-agri-green/20">
          <span>🛣️ {routeInfo.distanceKm} km</span>
          <span>⏱ {routeInfo.durationMin} min drive</span>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full absolute inset-0 z-10" />
    </div>
  );
}
