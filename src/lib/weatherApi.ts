/**
 * Weather / flood data sources for the Rizal corridor page.
 *
 * Three of these hit our own PHP proxy because the upstream either serves HTML
 * or sends no CORS headers (see controllers/tools/weather/ in napai-api). The
 * rest are keyless, CORS-open APIs called straight from the browser.
 *
 * Attribution is mandatory for Open-Meteo (CC-BY 4.0) — see SourceStrip.
 */

import { API_BASE } from "./api";
import type { Town } from "./weather/towns";

const url = (path: string) => `${API_BASE}/controllers/tools/weather/${path}`;

/** Envelope shared by every proxied endpoint. */
export interface Proxied<T> {
  ok: boolean;
  fetched_at: string;
  /** True when the upstream was unreachable and this is the last good copy. */
  stale: boolean;
  data: T | null;
  parse_failed?: boolean;
  source?: string;
  error?: string;
}

async function getJson<T>(endpoint: string): Promise<T> {
  const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Open-Meteo — the numeric backbone                                   */
/* ------------------------------------------------------------------ */

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    rain: number;
    showers: number;
    weather_code: number;
    cloud_cover: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  hourly: {
    time: string[];
    precipitation: number[];
    precipitation_probability: (number | null)[];
    rain: number[];
    showers: number[];
    weather_code: number[];
    temperature_2m: number[];
    apparent_temperature: number[];
    relative_humidity_2m: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
    cape: (number | null)[];
    soil_moisture_0_to_1cm: (number | null)[];
    soil_moisture_1_to_3cm: (number | null)[];
    soil_moisture_3_to_9cm: (number | null)[];
    soil_moisture_9_to_27cm: (number | null)[];
    cloud_cover: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    rain_sum: number[];
    precipitation_hours: number[];
    precipitation_probability_max: (number | null)[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    wind_direction_10m_dominant: number[];
  };
}

// NOTE: `minutely_15` is deliberately absent. Over the Philippines Open-Meteo has
// no native sub-hourly model, so it just repeats each hourly value four times —
// summing it would quadruple-count rainfall. `precipitation_hours` is daily-only.
const HOURLY_VARS = [
  "precipitation",
  "precipitation_probability",
  "rain",
  "showers",
  "weather_code",
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "cape",
  "soil_moisture_0_to_1cm",
  "soil_moisture_1_to_3cm",
  "soil_moisture_3_to_9cm",
  "soil_moisture_9_to_27cm",
  "cloud_cover",
].join(",");

const DAILY_VARS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "rain_sum",
  "precipitation_hours",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
].join(",");

const CURRENT_VARS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "precipitation",
  "rain",
  "showers",
  "weather_code",
  "cloud_cover",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
].join(",");

export function fetchForecast(town: Town): Promise<OpenMeteoResponse> {
  // Left on the default (best_match) model on purpose: pinning ecmwf_ifs gives a
  // sharper grid but returns null for every soil-moisture band, which the flood
  // score needs.
  const q = new URLSearchParams({
    latitude: String(town.lat),
    longitude: String(town.lon),
    hourly: HOURLY_VARS,
    daily: DAILY_VARS,
    current: CURRENT_VARS,
    timezone: "Asia/Manila",
    forecast_days: "7",
    past_days: "1",
  });
  return getJson<OpenMeteoResponse>(`https://api.open-meteo.com/v1/forecast?${q}`);
}

/* ------------------------------------------------------------------ */
/* Open-Meteo Flood (GloFAS) — basin context only                      */
/* ------------------------------------------------------------------ */

/**
 * GloFAS runs on a ~5 km grid and returns the largest river in the cell.
 * Querying a town's own coordinates looks right and is meaningless: the cell
 * under Cainta is hillslope, not river — it barely moved during Ulysses. These
 * are the nearest cells that actually sit on the Marikina/Pasig channel, so the
 * page reports basin discharge and says so, rather than implying a local gauge.
 */
export const DISCHARGE_POINTS = [
  { key: "marikina_upstream", label: "Marikina River (upstream, San Mateo)", lat: 14.675, lon: 121.075 },
  { key: "pasig_confluence", label: "Pasig–Marikina confluence", lat: 14.575, lon: 121.075 },
] as const;

export interface FloodResponse {
  daily: { time: string[]; river_discharge: (number | null)[]; river_discharge_max: (number | null)[] };
}

export function fetchDischarge(point: (typeof DISCHARGE_POINTS)[number]): Promise<FloodResponse> {
  const q = new URLSearchParams({
    latitude: String(point.lat),
    longitude: String(point.lon),
    daily: "river_discharge,river_discharge_max",
    forecast_days: "30",
    past_days: "30",
  });
  return getJson<FloodResponse>(`https://flood-api.open-meteo.com/v1/flood?${q}`);
}

/* ------------------------------------------------------------------ */
/* Tropical cyclones — JMA (structured) with JTWC text as a fallback   */
/* ------------------------------------------------------------------ */

export interface JmaTarget {
  tropicalCyclone?: string;
  typhoonNumber?: string;
  category?: string;
  issue?: string;
}

export interface JmaSpecification {
  [key: string]: unknown;
}

/** Active western-Pacific cyclones JMA is currently tracking. Often an empty list. */
export function fetchJmaTargets(): Promise<JmaTarget[] | Record<string, JmaTarget>> {
  return getJson(`https://www.jma.go.jp/bosai/typhoon/data/targetTc.json`);
}

export function fetchJmaSpecification(tcCode: string): Promise<JmaSpecification> {
  return getJson(`https://www.jma.go.jp/bosai/typhoon/data/${tcCode}/specifications.json`);
}

/** JTWC's plain-text western-Pacific significant weather advisory. */
export async function fetchJtwcBulletin(): Promise<string> {
  const res = await fetch("https://www.metoc.navy.mil/jtwc/products/abpwweb.txt");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/* ------------------------------------------------------------------ */
/* PAGASA — via our proxy                                              */
/* ------------------------------------------------------------------ */

export type WarningStatus = "none" | "advisory" | "yellow" | "orange" | "red";

export interface PagasaOutlookDay {
  date: string | null;
  day_description: string | null;
  day_high: number | null;
  day_low: number | null;
  day_wind_speed: string | null;
  day_wind_direction: string | null;
  night_description: string | null;
  night_high: number | null;
  night_low: number | null;
  night_wind_speed: string | null;
  night_wind_direction: string | null;
}

export interface PagasaWarning {
  number: number | null;
  title: string;
  weather_system: string | null;
  issued_at: string | null;
  hazard: string | null;
  levels: { level: "red" | "orange" | "yellow"; areas: string }[];
  advisory_lines: string[];
  next_warning: string | null;
  text: string;
}

export interface PagasaData {
  province: { name: string; psgc: string; latitude: number | null; longitude: number | null } | null;
  outlook: PagasaOutlookDay[];
  outlook_issued_at: string | null;
  warning: PagasaWarning | null;
  warning_history: PagasaWarning[];
  town_status: Record<string, { status: WarningStatus; source: string | null }>;
  weather_system: string | null;
  habagat: boolean;
  thunderstorm: string | null;
}

export const fetchPagasa = () => getJson<Proxied<PagasaData>>(url("pagasa_forecast.php"));

export interface RiverStation {
  code: string;
  name: string;
  key: string | null;
  label: string;
  /** Which water system this gauge belongs to — see towns.ts `Basin`. */
  basin: "marikina" | "laguna" | "pasig" | null;
  relevance: "primary" | "upstream" | "downstream" | null;
  note: string | null;
  level: number | null;
  level_30m: number | null;
  level_1h: number | null;
  level_2h: number | null;
  trend_1h: number | null;
  alert: number | null;
  alarm: number | null;
  critical: number | null;
  stale_reading: boolean;
}

export const fetchRiverLevels = () =>
  getJson<Proxied<{ stations: RiverStation[] }>>(url("river_levels.php"));

export interface RainGauge {
  code: string;
  key: string;
  label: string;
  zone: "local" | "watershed";
  mm_30m: number | null;
  mm_1h: number | null;
  mm_3h: number | null;
  mm_6h: number | null;
  mm_12h: number | null;
  mm_24h: number | null;
  offline: boolean;
}

export const fetchRainGauges = () =>
  getJson<Proxied<{ gauges: RainGauge[]; observed_at: string }>>(url("rain_gauges.php"));
