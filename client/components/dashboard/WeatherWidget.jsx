"use client";

import React, { useEffect, useState } from "react";
import { CloudRain, AlertCircle, Droplets, Gauge, ThermometerSun, Wind, RefreshCw } from "lucide-react";
import { apiService } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";

const DEFAULT_REGION = {
  name: "Your region",
  lat: 19.9975,
  lon: 73.7898,
};

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(new Date(dateString));
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [region, setRegion] = useState(DEFAULT_REGION.name);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuthStore();
  const profileLocation = user?.location?.trim() || "";
  const profileLat = user?.latitude ?? null;
  const profileLon = user?.longitude ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadWeather(locationText, latitude, longitude) {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();

        if (locationText) {
          params.set("location", locationText);
        } else {
          params.set("lat", String(latitude));
          params.set("lon", String(longitude));
        }

        const response = await fetch(`/api/weather?${params.toString()}`, { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load weather.");
        }

        if (!cancelled) {
          setWeather(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load weather.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (profileLat !== null && profileLon !== null) {
      setRegion(profileLocation || "Your saved location");
      loadWeather(null, profileLat, profileLon);
      return () => {
        cancelled = true;
      };
    }

    if (profileLocation) {
      setRegion(profileLocation);
      loadWeather(profileLocation, DEFAULT_REGION.lat, DEFAULT_REGION.lon);
      return () => {
        cancelled = true;
      };
    }

    if (user?.id) {
      apiService
        .getUserProfile(user.id)
        .then((response) => {
          const profileLocation = response?.data?.location?.trim();
          if (!cancelled && profileLocation) {
            setRegion(profileLocation);
            loadWeather(profileLocation, DEFAULT_REGION.lat, DEFAULT_REGION.lon);
            return;
          }
          if (!cancelled && navigator?.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                if (!cancelled) {
                  setRegion("Your current location");
                  loadWeather(null, position.coords.latitude, position.coords.longitude);
                }
              },
              () => {
                if (!cancelled) {
                  setRegion(DEFAULT_REGION.name);
                  loadWeather(null, DEFAULT_REGION.lat, DEFAULT_REGION.lon);
                }
              },
              { timeout: 5000 }
            );
            return;
          }
          if (!cancelled) {
            setRegion(DEFAULT_REGION.name);
            loadWeather(null, DEFAULT_REGION.lat, DEFAULT_REGION.lon);
          }
        })
        .catch(() => {
          if (!cancelled && navigator?.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                if (!cancelled) {
                  setRegion("Your current location");
                  loadWeather(null, position.coords.latitude, position.coords.longitude);
                }
              },
              () => {
                if (!cancelled) {
                  setRegion(DEFAULT_REGION.name);
                  loadWeather(null, DEFAULT_REGION.lat, DEFAULT_REGION.lon);
                }
              },
              { timeout: 5000 }
            );
            return;
          }
          if (!cancelled) {
            setRegion(DEFAULT_REGION.name);
            loadWeather(null, DEFAULT_REGION.lat, DEFAULT_REGION.lon);
          }
        });
      return () => {
        cancelled = true;
      };
    }

    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!cancelled) {
            setRegion("Your current location");
            loadWeather(null, position.coords.latitude, position.coords.longitude);
          }
        },
        () => {
          if (!cancelled) {
            setRegion(DEFAULT_REGION.name);
            loadWeather(null, DEFAULT_REGION.lat, DEFAULT_REGION.lon);
          }
        },
        { timeout: 5000 }
      );
      return () => {
        cancelled = true;
      };
    }

    setRegion(DEFAULT_REGION.name);
    loadWeather(null, DEFAULT_REGION.lat, DEFAULT_REGION.lon);

    return () => {
      cancelled = true;
    };
  }, [profileLocation, profileLat, profileLon, user?.id, refreshKey]);

  const current = weather?.current;
  const forecast = weather?.forecast || [];

  return (
    <Card className="border-agri-green/5 bg-gradient-to-br from-white/80 to-agri-green/5 dark:from-[#121F16]/80 dark:to-agri-green/5">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-none">
        <div>
          <CardTitle className="text-sm font-bold text-agri-green">Weather & Crop Advisor</CardTitle>
          <span className="text-[10px] text-agri-brown font-bold uppercase">{region}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            title="Refresh weather"
            className="p-2 rounded-xl bg-white/70 dark:bg-black/60 hover:bg-white/90"
          >
            <RefreshCw className="w-4 h-4 text-agri-green" />
          </button>
          <CloudRain className="w-8 h-8 text-agri-wheat opacity-60" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="p-3.5 bg-agri-green/5 rounded-2xl border border-agri-green/10 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-agri-green shrink-0" />
            <p className="text-xs text-agri-brown">Fetching live weather for {region}...</p>
          </div>
        ) : error ? (
          <div className="p-3.5 bg-agri-green/5 rounded-2xl border border-agri-green/10 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-agri-green shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black uppercase text-agri-green">Weather unavailable</p>
              <p className="text-xs text-agri-brown dark:text-gray-300 mt-1 leading-relaxed">
                {error}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-agri-green/10 bg-agri-green/5 p-3">
                <p className="text-[10px] uppercase font-black text-agri-green">Now</p>
                <p className="mt-1 text-2xl font-black text-agri-brown">
                  {Math.round(current?.temperature ?? 0)}°C
                </p>
                <p className="text-[11px] text-gray-500">Feels like {Math.round(current?.feelsLike ?? 0)}°C</p>
              </div>
              <div className="rounded-2xl border border-agri-green/10 bg-agri-green/5 p-3">
                <p className="text-[10px] uppercase font-black text-agri-green">Condition</p>
                <p className="mt-1 text-sm font-bold text-agri-brown">{current?.condition || "Unknown"}</p>
                <p className="text-[11px] text-gray-500">Updated {current?.time ? new Date(current.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric icon={Droplets} label="Humidity" value={`${Math.round(current?.humidity ?? 0)}%`} />
              <Metric icon={Wind} label="Wind" value={`${Math.round(current?.windSpeed ?? 0)} km/h`} />
              <Metric icon={ThermometerSun} label="Rain" value={`${Number(current?.precipitation ?? 0).toFixed(1)} mm`} />
              <Metric icon={Gauge} label="Direction" value={`${Math.round(current?.windDirection ?? 0)}°`} />
            </div>

            {forecast.length > 0 ? (
              <div className="rounded-2xl border border-agri-green/10 bg-white/50 dark:bg-black/10 p-3">
                <p className="text-[10px] uppercase font-black text-agri-green">3-day forecast</p>
                <div className="mt-2 space-y-2">
                  {forecast.map((day) => (
                    <div key={day.date} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-agri-brown">{formatDate(day.date)}</span>
                      <span className="text-gray-500">
                        {Math.round(day.maxTemp ?? 0)}° / {Math.round(day.minTemp ?? 0)}° · {day.condition}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-agri-green/10 bg-white/50 dark:bg-black/10 p-3 text-xs text-agri-brown">
                <p className="font-bold">No forecast available</p>
                <p className="mt-1">Short-term forecast not available for this location.</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-agri-green/10 bg-white/50 dark:bg-black/10 p-3 flex items-start gap-2">
      <Icon className="w-4 h-4 text-agri-green mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] uppercase font-black text-agri-green">{label}</p>
        <p className="text-xs font-semibold text-agri-brown">{value}</p>
      </div>
    </div>
  );
}
