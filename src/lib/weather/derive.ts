/**
 * Interpretation layer: turns raw feeds into the answers the page actually
 * makes. Pure functions only — no fetching — so the reasoning is testable and
 * the components stay presentational.
 */

import type {
  FloodResponse,
  OpenMeteoResponse,
  RainGauge,
  RiverStation,
  WarningStatus,
} from "@/lib/weatherApi";
import type { Town } from "./towns";

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

/** Linear map with clamping at both ends. */
const scale = (v: number, inLo: number, inHi: number, outLo = 0, outHi = 100) =>
  inHi === inLo ? outLo : clamp(outLo + ((v - inLo) / (inHi - inLo)) * (outHi - outLo), Math.min(outLo, outHi), Math.max(outLo, outHi));

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

export const compassPoint = (deg: number) => COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];

/** Index of the hourly slot covering `at`. The series includes past_days=1. */
export function currentHourIndex(times: string[], at: Date = new Date()): number {
  // Open-Meteo returns local (Asia/Manila) wall-clock strings without an offset.
  const target = at.getTime();
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Weather codes and rainfall intensity                                */
/* ------------------------------------------------------------------ */

export interface Condition {
  label: string;
  isRain: boolean;
  isStorm: boolean;
}

const WMO: Record<number, Condition> = {
  0: { label: "Clear", isRain: false, isStorm: false },
  1: { label: "Mostly clear", isRain: false, isStorm: false },
  2: { label: "Partly cloudy", isRain: false, isStorm: false },
  3: { label: "Overcast", isRain: false, isStorm: false },
  45: { label: "Fog", isRain: false, isStorm: false },
  48: { label: "Rime fog", isRain: false, isStorm: false },
  51: { label: "Light drizzle", isRain: true, isStorm: false },
  53: { label: "Drizzle", isRain: true, isStorm: false },
  55: { label: "Heavy drizzle", isRain: true, isStorm: false },
  61: { label: "Light rain", isRain: true, isStorm: false },
  63: { label: "Rain", isRain: true, isStorm: false },
  65: { label: "Heavy rain", isRain: true, isStorm: false },
  80: { label: "Light showers", isRain: true, isStorm: false },
  81: { label: "Showers", isRain: true, isStorm: false },
  82: { label: "Violent showers", isRain: true, isStorm: false },
  95: { label: "Thunderstorms", isRain: true, isStorm: true },
  96: { label: "Thunderstorms with hail", isRain: true, isStorm: true },
  99: { label: "Severe thunderstorms", isRain: true, isStorm: true },
};

export const wmoToCondition = (code: number): Condition =>
  WMO[code] ?? { label: "Unsettled", isRain: code >= 51, isStorm: code >= 95 };

export type IntensityKey = "none" | "light" | "moderate" | "heavy" | "intense" | "torrential";

export interface Intensity {
  key: IntensityKey;
  label: string;
  /** Design token name, without the `--` prefix. */
  tone: "calm" | "advisory" | "yellow" | "orange" | "red";
}

/**
 * PAGASA's published hourly rainfall intensity scale — the same wording used in
 * their advisories, so the numbers on this page mean what a local expects.
 */
export function rainIntensity(mmPerHour: number): Intensity {
  if (mmPerHour < 0.1) return { key: "none", label: "No rain", tone: "calm" };
  if (mmPerHour < 2.5) return { key: "light", label: "Light", tone: "calm" };
  if (mmPerHour < 7.5) return { key: "moderate", label: "Moderate", tone: "advisory" };
  if (mmPerHour < 15) return { key: "heavy", label: "Heavy", tone: "yellow" };
  if (mmPerHour < 30) return { key: "intense", label: "Intense", tone: "orange" };
  return { key: "torrential", label: "Torrential", tone: "red" };
}

/* ------------------------------------------------------------------ */
/* Rain verdict                                                        */
/* ------------------------------------------------------------------ */

export interface RainVerdictResult {
  rainingNow: boolean;
  willRain: boolean;
  headline: string;
  detail: string;
  /** Hours from now until rain starts, null if none expected or already raining. */
  startsInHours: number | null;
  startsAtLabel: string | null;
  peakMm: number;
  peakIntensity: Intensity;
  next12hTotal: number;
  next24hTotal: number;
  maxProbability: number;
}

const hourLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", hour12: true });

export function rainVerdict(
  data: OpenMeteoResponse,
  town: Town,
  now: Date = new Date()
): RainVerdictResult {
  const { hourly, current } = data;
  const i0 = currentHourIndex(hourly.time, now);
  const window = 24;
  const slice = <T,>(arr: T[]) => arr.slice(i0, i0 + window);

  const precip = slice(hourly.precipitation).map((v) => v ?? 0);
  const probs = slice(hourly.precipitation_probability).map((v) => v ?? 0);
  const times = slice(hourly.time);

  const rainingNow = (current?.precipitation ?? 0) >= 0.1;
  const next12hTotal = precip.slice(0, 12).reduce((a, b) => a + b, 0);
  const next24hTotal = precip.reduce((a, b) => a + b, 0);
  const peakMm = precip.length ? Math.max(...precip) : 0;
  const peakIntensity = rainIntensity(peakMm);
  const maxProbability = probs.length ? Math.max(...probs) : 0;

  // First hour that carries meaningful rain, not a rounding artefact.
  let startIdx = -1;
  for (let i = 0; i < precip.length; i++) {
    if (precip[i] >= 0.2) {
      startIdx = i;
      break;
    }
  }

  const willRain = startIdx !== -1 || rainingNow;

  let headline: string;
  let detail: string;

  if (rainingNow) {
    const nowIntensity = rainIntensity(current.precipitation);
    headline = `${nowIntensity.label} rain in ${town.name} right now`;
    detail =
      next12hTotal >= 0.5
        ? `About ${next12hTotal.toFixed(0)} mm more expected over the next 12 hours.`
        : "It should ease off within the hour.";
  } else if (startIdx === -1) {
    headline = `No rain expected in ${town.name}`;
    detail =
      maxProbability >= 30
        ? `Nothing in the next 24 hours, though there is up to a ${Math.round(maxProbability)}% chance of a passing shower.`
        : "The next 24 hours look dry.";
  } else if (startIdx === 0) {
    headline = `Rain starting in ${town.name} within the hour`;
    detail = `${peakIntensity.label.toLowerCase()} at its heaviest — around ${peakMm.toFixed(1)} mm/h.`;
  } else {
    headline = `Rain expected in ${town.name} around ${hourLabel(times[startIdx])}`;
    detail = `${peakIntensity.label} at its heaviest (${peakMm.toFixed(1)} mm/h), ${next24hTotal.toFixed(0)} mm total over 24 hours.`;
  }

  return {
    rainingNow,
    willRain,
    headline,
    detail,
    startsInHours: startIdx > 0 ? startIdx : null,
    startsAtLabel: startIdx > 0 ? hourLabel(times[startIdx]) : null,
    peakMm,
    peakIntensity,
    next12hTotal,
    next24hTotal,
    maxProbability,
  };
}

/* ------------------------------------------------------------------ */
/* Habagat                                                             */
/* ------------------------------------------------------------------ */

export interface HabagatResult {
  active: boolean;
  source: "pagasa" | "inferred" | "none";
  detail: string;
}

/**
 * PAGASA states the prevailing weather system in plain text, which is the only
 * authoritative signal — there is no machine-readable habagat flag anywhere.
 * When that is unavailable, infer it: a sustained southwesterly through the
 * monsoon months. Both paths are labelled so the reader knows which they got.
 */
export function detectHabagat(
  pagasaSystem: string | null,
  data: OpenMeteoResponse | undefined,
  now: Date = new Date()
): HabagatResult {
  if (pagasaSystem && /southwest monsoon|habagat/i.test(pagasaSystem)) {
    return { active: true, source: "pagasa", detail: pagasaSystem };
  }
  if (pagasaSystem) {
    // PAGASA named a different system — trust it over wind inference.
    return { active: false, source: "pagasa", detail: pagasaSystem };
  }
  if (!data) return { active: false, source: "none", detail: "No weather-system data available." };

  const month = now.getMonth() + 1; // 1-12
  const inSeason = month >= 6 && month <= 10;
  const i0 = currentHourIndex(data.hourly.time, now);
  const dirs = data.hourly.wind_direction_10m.slice(i0, i0 + 24);
  const speeds = data.hourly.wind_speed_10m.slice(i0, i0 + 24);

  let sw = 0;
  let counted = 0;
  for (let i = 0; i < dirs.length; i++) {
    if (speeds[i] < 6) continue; // ignore near-calm hours, which wander
    counted++;
    if (dirs[i] >= 180 && dirs[i] <= 270) sw++;
  }
  const share = counted ? sw / counted : 0;
  const active = inSeason && counted >= 8 && share >= 0.7;

  return {
    active,
    source: "inferred",
    detail: active
      ? `Winds are southwesterly for ${Math.round(share * 100)}% of the next 24 hours, in the June–October monsoon window.`
      : inSeason
        ? "Winds are not consistently southwesterly right now."
        : "Outside the June–October southwest monsoon season.",
  };
}

/* ------------------------------------------------------------------ */
/* Tropical cyclones                                                   */
/* ------------------------------------------------------------------ */

export interface Cyclone {
  name: string;
  designation: string;
  category: string;
  lat: number;
  lon: number;
  windKt: number | null;
  gustKt: number | null;
  /** Great-circle distance from the selected town, km. */
  distanceKm: number;
  bearing: string;
  insidePar: boolean;
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function bearingFrom(aLat: number, aLon: number, bLat: number, bLon: number) {
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
  return compassPoint((Math.atan2(y, x) * 180) / Math.PI);
}

/** Approximate Philippine Area of Responsibility bounding box. */
const inPar = (lat: number, lon: number) => lat >= 5 && lat <= 25 && lon >= 115 && lon <= 135;

/**
 * Parse JTWC's plain-text advisory. JMA's targetTc.json only lists storms it has
 * named, so it can be empty while a depression is active — the text bulletin is
 * the more complete source for "is anything out there".
 */
export function parseJtwc(text: string, town: Town): Cyclone[] {
  // The bulletin hard-wraps mid-sentence; collapse it before matching.
  const flat = text.replace(/\s+/g, " ");
  const re =
    /(SUPER TYPHOON|TYPHOON|TROPICAL STORM|TROPICAL DEPRESSION)\s+(\d{2}[A-Z])\s*\(([^)]+)\)[^.]*?NEAR\s+([\d.]+)\s*([NS])\s+([\d.]+)\s*([EW])/g;

  const out: Cyclone[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(flat)) !== null) {
    const [, category, designation, name, latRaw, ns, lonRaw, ew] = m;
    const lat = parseFloat(latRaw) * (ns === "S" ? -1 : 1);
    const lon = parseFloat(lonRaw) * (ew === "W" ? -1 : 1);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;

    // Wind figures follow the position in the same sentence block.
    const tail = flat.slice(m.index, m.index + 700);
    const wind = /SUSTAINED SURFACE WINDS WERE ESTIMATED AT (\d+)\s*KNOTS/.exec(tail);
    const gust = /GUSTING TO (\d+)\s*KNOTS/.exec(tail);

    out.push({
      name: name.trim(),
      designation,
      category: category.replace(/\b\w/g, (c) => c.toUpperCase()),
      lat,
      lon,
      windKt: wind ? parseInt(wind[1], 10) : null,
      gustKt: gust ? parseInt(gust[1], 10) : null,
      distanceKm: Math.round(haversineKm(town.lat, town.lon, lat, lon)),
      bearing: bearingFrom(town.lat, town.lon, lat, lon),
      insidePar: inPar(lat, lon),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Flood risk                                                          */
/* ------------------------------------------------------------------ */

export type RiskLevel = "low" | "watch" | "elevated" | "high" | "critical";

export interface RiskDriver {
  label: string;
  detail: string;
  /** 0-100 contribution of this signal on its own. */
  score: number;
  available: boolean;
}

export interface FloodRiskResult {
  level: RiskLevel;
  score: number;
  headline: string;
  drivers: RiskDriver[];
  /** True when nothing but forecast rain was available. */
  degraded: boolean;
}

export const RISK_META: Record<RiskLevel, { label: string; tone: Intensity["tone"] }> = {
  low: { label: "Low", tone: "calm" },
  watch: { label: "Watch", tone: "advisory" },
  elevated: { label: "Elevated", tone: "yellow" },
  high: { label: "High", tone: "orange" },
  critical: { label: "Critical", tone: "red" },
};

/** How close a gauge is to its own thresholds, as 0-100. */
function gaugeScore(s: RiverStation): number | null {
  const { level, alert, alarm, critical } = s;
  if (level === null || alert === null || alarm === null || critical === null) return null;
  if (level >= critical) return 100;
  if (level >= alarm) return scale(level, alarm, critical, 80, 100);
  if (level >= alert) return scale(level, alert, alarm, 60, 80);
  // Below alert: a 3 m band of headroom maps onto the bottom 60 points.
  return scale(level, alert - 3, alert, 0, 60);
}

export interface DischargeSummary {
  today: number;
  peak7d: number;
  /** Where today's flow sits within the surrounding 60 days, 0-100. */
  percentile: number;
  /** Peak over the coming week relative to today, as a multiplier. */
  risingBy: number;
}

/**
 * Condense the GloFAS basin forecast.
 *
 * This is the one thing the PAGASA gauges cannot provide: they read the river
 * as it is now, while this looks a month ahead. It is a ~5 km basin-scale
 * model, so it belongs here as a trend, never as a local level.
 */
export function summariseDischarge(flood: FloodResponse | undefined, now: Date = new Date()): DischargeSummary | null {
  if (!flood?.daily?.time?.length) return null;
  const series = flood.daily.river_discharge;
  const today = now.toISOString().slice(0, 10);
  const i = flood.daily.time.findIndex((t) => t >= today);
  if (i === -1) return null;

  const current = series[i];
  if (typeof current !== "number") return null;

  const week = series.slice(i, i + 8).filter((v): v is number => typeof v === "number");
  const around = series.filter((v): v is number => typeof v === "number");
  if (!week.length || !around.length) return null;

  const peak7d = Math.max(...week);
  const below = around.filter((v) => v <= current).length;

  return {
    today: current,
    peak7d,
    percentile: Math.round((below / around.length) * 100),
    risingBy: current > 0 ? peak7d / current : 1,
  };
}

export interface FloodRiskInput {
  town: Town;
  forecast?: OpenMeteoResponse;
  stations?: RiverStation[];
  gauges?: RainGauge[];
  cyclones?: Cyclone[];
  pagasaStatus?: WarningStatus;
  discharge?: DischargeSummary | null;
  now?: Date;
}

export function floodRisk(input: FloodRiskInput): FloodRiskResult {
  const { town, forecast, stations, gauges, cyclones, pagasaStatus, discharge, now = new Date() } = input;
  const drivers: RiskDriver[] = [];

  /* 1. Water level — the dominant signal, read from the town's OWN basin.
     A Marikina headwater gauge says nothing useful about a Laguna lakeshore
     town, so the candidate set is filtered before anything is scored. */
  const isLake = town.basin === "laguna";
  const candidates = (stations ?? []).filter(
    (s) =>
      s.basin === town.basin &&
      (s.relevance === "primary" || (!isLake && s.relevance === "upstream"))
  );

  let gaugeBest: { score: number; station: RiverStation } | null = null;
  for (const s of candidates) {
    const sc = gaugeScore(s);
    if (sc === null) continue;
    if (!gaugeBest || sc > gaugeBest.score) gaugeBest = { score: sc, station: s };
  }

  // The lakeshore gauge at Angono has no published thresholds, so it cannot be
  // scored against one. Its trend still carries the signal that matters for a
  // lake: sustained rise, not a spike.
  const lakeShore = isLake ? candidates.find((s) => s.key === "angono" && s.level !== null) : undefined;

  const label = isLake ? "Lake level" : "River level";

  if (gaugeBest) {
    const st = gaugeBest.station;
    const trend = st.trend_1h
      ? `, ${st.trend_1h > 0 ? "rising" : "falling"} ${Math.abs(st.trend_1h).toFixed(2)} m/h`
      : "";
    drivers.push({
      label,
      detail:
        `${st.label} is at ${st.level?.toFixed(2)} m` +
        (st.alert !== null ? ` (alert ${st.alert.toFixed(2)} m)` : "") +
        trend +
        "." +
        (lakeShore && lakeShore.code !== st.code
          ? ` The Angono lakeshore gauge reads ${lakeShore.level?.toFixed(2)} m.`
          : ""),
      score: gaugeBest.score,
      available: true,
    });
  } else if (lakeShore) {
    // Trend-only fallback: rising lake water is the signal, with no threshold
    // to compare against. Kept deliberately conservative.
    const rise = lakeShore.trend_1h ?? 0;
    drivers.push({
      label,
      detail:
        `${lakeShore.label} is at ${lakeShore.level?.toFixed(2)} m and ` +
        (rise > 0.02 ? `rising ${rise.toFixed(2)} m/h` : rise < -0.02 ? `falling ${Math.abs(rise).toFixed(2)} m/h` : "steady") +
        ". PAGASA publishes no alert level for this gauge, so it is read as a trend.",
      score: rise > 0.05 ? 60 : rise > 0.02 ? 40 : rise > 0 ? 20 : 5,
      available: true,
    });
  } else {
    drivers.push({
      label,
      detail: "PAGASA gauge readings unavailable for this basin.",
      score: 0,
      available: false,
    });
  }

  /* 2. Rain already measured over the Marikina watershed — it arrives with a lag. */
  const watershed = (gauges ?? []).filter((g) => g.zone === "watershed" && !g.offline);
  const w24 = Math.max(0, ...watershed.map((g) => g.mm_24h ?? 0));
  const w3 = Math.max(0, ...watershed.map((g) => g.mm_3h ?? 0));
  const observedScore = Math.max(scale(w24, 10, 180), scale(w3, 5, 60));
  drivers.push(
    watershed.length
      ? {
          label: "Rain already fallen upstream",
          detail:
            `${w24.toFixed(0)} mm in 24 h and ${w3.toFixed(0)} mm in the last 3 h at the heaviest watershed gauge.` +
            (isLake
              ? " The Manggahan Floodway diverts this water into Laguna de Bay, which is what raises the lake."
              : ""),
          score: observedScore,
          available: true,
        }
      : { label: "Rain already fallen upstream", detail: "Watershed rain gauges unavailable.", score: 0, available: false }
  );

  /* 3. Forecast rain load over the town itself. */
  let forecastScore = 0;
  let forecastDetail = "Forecast unavailable.";
  let forecastAvailable = false;
  if (forecast) {
    const i0 = currentHourIndex(forecast.hourly.time, now);
    const next24 = forecast.hourly.precipitation.slice(i0, i0 + 24).map((v) => v ?? 0);
    const total24 = next24.reduce((a, b) => a + b, 0);
    let peak3 = 0;
    for (let i = 0; i + 3 <= next24.length; i++) {
      peak3 = Math.max(peak3, next24[i] + next24[i + 1] + next24[i + 2]);
    }
    forecastScore = Math.max(scale(total24, 10, 150), scale(peak3, 5, 60));
    forecastDetail = `${total24.toFixed(0)} mm forecast over 24 h, peaking at ${peak3.toFixed(0)} mm in a 3-hour burst.`;
    forecastAvailable = true;
  }
  drivers.push({ label: "Forecast rain", detail: forecastDetail, score: forecastScore, available: forecastAvailable });

  /* 4. Soil saturation — saturated ground runs off instead of absorbing. */
  let soilScore = 0;
  let soilDetail = "Soil moisture unavailable.";
  let soilAvailable = false;
  if (forecast) {
    const i0 = currentHourIndex(forecast.hourly.time, now);
    const bands = [
      forecast.hourly.soil_moisture_0_to_1cm?.[i0],
      forecast.hourly.soil_moisture_1_to_3cm?.[i0],
      forecast.hourly.soil_moisture_3_to_9cm?.[i0],
      forecast.hourly.soil_moisture_9_to_27cm?.[i0],
    ].filter((v): v is number => typeof v === "number");
    if (bands.length) {
      const mean = bands.reduce((a, b) => a + b, 0) / bands.length;
      soilScore = scale(mean, 0.25, 0.45);
      soilDetail =
        soilScore > 70
          ? `Ground is close to saturated (${(mean * 100).toFixed(0)}% by volume) — new rain will mostly run off.`
          : `Soil is holding ${(mean * 100).toFixed(0)}% moisture by volume, with room to absorb more.`;
      soilAvailable = true;
    }
  }
  drivers.push({ label: "Ground saturation", detail: soilDetail, score: soilScore, available: soilAvailable });

  /* 5. Basin discharge trend — the only forward-looking river signal.
     GloFAS models the Marikina channel, so this is withheld from the lakeshore
     towns rather than dressed up as relevant to them. */
  drivers.push(
    discharge && !isLake
      ? {
          label: "Marikina basin trend",
          detail:
            discharge.risingBy >= 1.25
              ? `Modelled basin flow is ${discharge.today.toFixed(0)} m³/s and forecast to rise to ${discharge.peak7d.toFixed(0)} m³/s within a week.`
              : `Modelled basin flow is ${discharge.today.toFixed(0)} m³/s, higher than ${discharge.percentile}% of the surrounding two months, with no sharp rise forecast.`,
          score: Math.max(scale(discharge.percentile, 40, 98), scale(discharge.risingBy, 1, 3)),
          available: true,
        }
      : {
          label: "Marikina basin trend",
          detail: isLake
            ? "Not applicable — this town is on Laguna de Bay, not the Marikina channel."
            : "Basin discharge forecast unavailable.",
          score: 0,
          available: false,
        }
  );

  /* Weighted blend over whatever we actually have.
     On the lake, a single day's rain matters less and standing water matters
     more, so weight shifts from the forecast toward level and saturation. */
  const weights: Record<string, number> = isLake
    ? {
        "Lake level": 0.38,
        "Rain already fallen upstream": 0.24,
        "Forecast rain": 0.20,
        "Ground saturation": 0.18,
      }
    : {
        "River level": 0.32,
        "Rain already fallen upstream": 0.22,
        "Forecast rain": 0.26,
        "Ground saturation": 0.12,
        "Marikina basin trend": 0.08,
      };
  let weighted = 0;
  let weightSum = 0;
  for (const d of drivers) {
    if (!d.available) continue;
    const w = weights[d.label] ?? 0;
    weighted += d.score * w;
    weightSum += w;
  }
  let score = weightSum > 0 ? weighted / weightSum : 0;

  // Towns differ enormously in how much of this actually reaches streets.
  // The span is wide on purpose: identical rain and river readings mean
  // something very different in Cainta, which floods regularly, than in
  // Binangonan, which mostly sits above the lake and usually does not.
  score *= 0.6 + 0.4 * town.exposure;

  /* PAGASA's own warning outranks anything inferred. */
  if (pagasaStatus === "red") score = Math.max(score, 85);
  else if (pagasaStatus === "orange") score = Math.max(score, 68);
  else if (pagasaStatus === "yellow") score = Math.max(score, 52);

  /* A cyclone inside the PAR raises the floor. */
  const parStorm = (cyclones ?? []).find((c) => c.insidePar);
  if (parStorm) {
    score = Math.max(score, 45);
    drivers.push({
      label: "Tropical cyclone",
      detail: `${parStorm.category} ${parStorm.name} is inside the Philippine Area of Responsibility, ${parStorm.distanceKm} km ${parStorm.bearing} of ${town.name}.`,
      score: 100,
      available: true,
    });
  }

  score = clamp(Math.round(score));

  let level: RiskLevel =
    score >= 78 ? "critical" : score >= 56 ? "high" : score >= 36 ? "elevated" : score >= 16 ? "watch" : "low";

  // A gauge at or past its alarm mark is not a judgement call.
  if (gaugeBest) {
    const st = gaugeBest.station;
    if (st.level !== null && st.critical !== null && st.level >= st.critical) level = "critical";
    else if (st.level !== null && st.alarm !== null && st.level >= st.alarm && level !== "critical") level = "high";
  }

  // Lakeshore flooding is slow and confined to the shore, so the same score
  // does not warrant the same words as it would in the Marikina lowlands.
  const headlines: Record<RiskLevel, string> = isLake
    ? {
        low: `No flooding expected in ${town.name}.`,
        watch: `Lake level is worth keeping an eye on. No flooding expected in ${town.name}.`,
        elevated: `Laguna de Bay is running high — shoreline barangays of ${town.name} could see water.`,
        high: `Sustained high lake level. Shoreline barangays of ${town.name} are likely to flood.`,
        critical: `Laguna de Bay at damaging levels. Follow PAGASA and your local DRRMO in ${town.name}.`,
      }
    : {
        low: `No flooding expected in ${town.name}.`,
        watch: `Minor flooding possible in the usual low spots of ${town.name}.`,
        elevated: `Localised flooding likely in ${town.name} — watch low-lying roads.`,
        high: `Flooding likely in ${town.name}. Avoid low-lying routes and monitor advisories.`,
        critical: `Severe flooding conditions for ${town.name}. Follow PAGASA and local DRRMO instructions.`,
      };

  return {
    level,
    score,
    headline: headlines[level],
    // Least useful signals last, so the panel reads top-down by importance.
    drivers: drivers.sort((a, b) => Number(b.available) - Number(a.available)),
    degraded: !gaugeBest && !watershed.length,
  };
}
