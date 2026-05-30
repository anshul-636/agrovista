import { NextResponse } from "next/server";

export const runtime = "edge";

const WEATHER_CODE_MAP = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  80: "Rain showers",
  81: "Heavy rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
};

function getWeatherLabel(code) {
  return WEATHER_CODE_MAP[Number(code)] || "Unknown";
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const latitudeParam = searchParams.get("lat");
    const longitudeParam = searchParams.get("lon");
    const location = searchParams.get("location") || "";
    const fallbackRegion = "Your region";

    let latitude = latitudeParam || "19.9975";
    let longitude = longitudeParam || "73.7898";
    let resolvedName = fallbackRegion;

    if (location) {
      const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
      geocodeUrl.searchParams.set("name", location);
      geocodeUrl.searchParams.set("count", "1");
      geocodeUrl.searchParams.set("language", "en");
      geocodeUrl.searchParams.set("format", "json");
      geocodeUrl.searchParams.set("country", "IN");

      const geocodeResponse = await fetch(geocodeUrl, { cache: "no-store" });
      if (geocodeResponse.ok) {
        const geocodeData = await geocodeResponse.json();
        const result = geocodeData?.results?.[0];
        if (result) {
          latitude = String(result.latitude);
          longitude = String(result.longitude);
          resolvedName = [result.name, result.admin1, result.country]
            .filter(Boolean)
            .join(", ");
        } else {
          resolvedName = location;
        }
      } else {
        resolvedName = location;
      }
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", latitude);
    url.searchParams.set("longitude", longitude);
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m");
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code");
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "3");

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json({ error: "Unable to fetch weather data." }, { status: 502 });
    }

    const payload = await response.json();
    const current = payload.current || {};
    const daily = payload.daily || {};

    const forecast = Array.isArray(daily.time)
      ? daily.time.slice(0, 3).map((date, index) => ({
          date,
          maxTemp: daily.temperature_2m_max?.[index],
          minTemp: daily.temperature_2m_min?.[index],
          precipitationChance: daily.precipitation_probability_max?.[index],
          condition: getWeatherLabel(daily.weather_code?.[index]),
        }))
      : [];

    return NextResponse.json({
      region: resolvedName,
      location: {
        latitude: Number(latitude),
        longitude: Number(longitude),
      },
      current: {
        temperature: current.temperature_2m,
        feelsLike: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        weatherCode: current.weather_code,
        condition: getWeatherLabel(current.weather_code),
        time: current.time,
      },
      forecast,
    });
  } catch (error) {
    return NextResponse.json({ error: "Weather service unavailable." }, { status: 500 });
  }
}