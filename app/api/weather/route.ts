import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { weatherCache } from "@/src/db/schema";
import { and, eq, gte, lt } from "drizzle-orm";

interface DayForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  precipitationSum: number;
  weatherCode: number;
  weatherLabel: string;
  weatherIcon: string;
  riskLevel: "clear" | "caution" | "rain";
}

const WEATHER_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Foggy", icon: "🌫️" },
  48: { label: "Depositing rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Moderate drizzle", icon: "🌦️" },
  55: { label: "Dense drizzle", icon: "🌧️" },
  61: { label: "Slight rain", icon: "🌧️" },
  63: { label: "Moderate rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  71: { label: "Slight snow", icon: "🌨️" },
  73: { label: "Moderate snow", icon: "🌨️" },
  75: { label: "Heavy snow", icon: "❄️" },
  80: { label: "Slight showers", icon: "🌦️" },
  81: { label: "Moderate showers", icon: "🌧️" },
  82: { label: "Violent showers", icon: "⛈️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm with hail", icon: "⛈️" },
  99: { label: "Thunderstorm with heavy hail", icon: "⛈️" },
};

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const latitude = 29.5857;
    const longitude = -95.7601;

    const db = getDb();

    // Check cache (3 hour TTL)
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const cached = await db.select().from(weatherCache).where(
      and(
        eq(weatherCache.latitude, latitude),
        eq(weatherCache.longitude, longitude),
        gte(weatherCache.fetchedAt, threeHoursAgo)
      )
    ).orderBy().limit(1).then(r => r[0]);

    if (cached) {
      return NextResponse.json(JSON.parse(cached.data));
    }

    // Fetch from Open-Meteo
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weathercode&timezone=America/Chicago&forecast_days=7&temperature_unit=fahrenheit`;

    const weatherRes = await fetch(url);
    if (!weatherRes.ok) {
      return NextResponse.json({ error: "Failed to fetch weather" }, { status: 502 });
    }

    const weatherData = await weatherRes.json();
    const daily = weatherData.daily;

    const forecast: DayForecast[] = daily.time.map((date: string, i: number) => {
      const code = daily.weathercode[i];
      const weatherInfo = WEATHER_CODES[code] || { label: "Unknown", icon: "❓" };
      const precipProb = daily.precipitation_probability_max[i];

      return {
        date,
        tempMax: Math.round(daily.temperature_2m_max[i]),
        tempMin: Math.round(daily.temperature_2m_min[i]),
        precipitationProbability: precipProb,
        precipitationSum: daily.precipitation_sum[i],
        weatherCode: code,
        weatherLabel: weatherInfo.label,
        weatherIcon: weatherInfo.icon,
        riskLevel: precipProb >= 60 ? "rain" : precipProb >= 30 ? "caution" : "clear",
      };
    });

    const result = { forecast, fetchedAt: new Date().toISOString() };

    // Cache the result
    await db.insert(weatherCache).values({
      latitude,
      longitude,
      data: JSON.stringify(result),
    });

    // Clean old cache entries
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await db.delete(weatherCache).where(lt(weatherCache.fetchedAt, oneDayAgo));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 });
  }
}
