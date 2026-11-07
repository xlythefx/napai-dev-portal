import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import type { OpenMeteoResponse, PagasaData } from "@/lib/weatherApi";
import { compassPoint, rainIntensity, wmoToCondition } from "@/lib/weather/derive";
import { cn } from "@/lib/utils";
import { WeatherCard } from "./WeatherCard";
import { WeatherIcon } from "./WeatherIcon";
import { glyphForCode, type WeatherGlyph } from "@/lib/weather/glyph";
import { toneColor, toneText } from "./tone";

const dayLabel = (iso: string, index: number) =>
  index === 0
    ? "Today"
    : index === 1
      ? "Tomorrow"
      : new Date(iso).toLocaleDateString("en-PH", { weekday: "long" });

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric" });

/** PAGASA writes prose, not codes — pick a glyph from the words. */
function glyphForDescription(text: string | null): WeatherGlyph {
  const t = (text ?? "").toLowerCase();
  if (/thunder/.test(t)) return "storm";
  if (/heavy|monsoon rains/.test(t)) return "heavy-rain";
  if (/rain|shower/.test(t)) return "rain";
  if (/drizzle/.test(t)) return "drizzle";
  if (/cloudy/.test(t)) return /partly/.test(t) ? "partly" : "cloud";
  if (/fair|sunny|clear/.test(t)) return "sun";
  return "cloud";
}

type Source = "model" | "pagasa";

interface Row {
  key: string;
  day: string;
  date: string;
  glyph: WeatherGlyph;
  condition: string;
  hi: number | null;
  lo: number | null;
  rainMm: number | null;
  chance: number | null;
  wind: string | null;
  tone: ReturnType<typeof rainIntensity>["tone"];
}

interface Props {
  data?: OpenMeteoResponse;
  pagasa?: PagasaData | null;
}

/**
 * Seven days, one per row, sized for a sidebar. The toggle switches between the
 * model forecast for this exact town and PAGASA's provincial outlook for Rizal —
 * two independent sources, which is worth more than one shown twice.
 */
export const DailyOutlook = ({ data, pagasa }: Props) => {
  const reduceMotion = useReducedMotion();
  const hasPagasa = Boolean(pagasa?.outlook?.length);
  const [source, setSource] = useState<Source>("model");
  const active: Source = source === "pagasa" && hasPagasa ? "pagasa" : "model";

  let rows: Row[] = [];

  if (active === "model" && data) {
    const { daily } = data;
    const todayIso = new Date().toISOString().slice(0, 10);
    const start = Math.max(0, daily.time.findIndex((t) => t >= todayIso));
    rows = daily.time.slice(start, start + 7).map((iso, i) => {
      const k = start + i;
      const rain = daily.precipitation_sum[k] ?? 0;
      const hours = daily.precipitation_hours[k] ?? 0;
      const rate = hours > 0 ? rain / hours : 0;
      return {
        key: iso,
        day: dayLabel(iso, i),
        date: dateLabel(iso),
        glyph: glyphForCode(daily.weather_code[k]),
        condition: wmoToCondition(daily.weather_code[k]).label,
        hi: daily.temperature_2m_max[k],
        lo: daily.temperature_2m_min[k],
        rainMm: rain,
        chance: daily.precipitation_probability_max[k] ?? 0,
        wind: `${Math.round(daily.wind_speed_10m_max[k])} km/h ${compassPoint(daily.wind_direction_10m_dominant[k])}`,
        tone: rainIntensity(rate).tone,
      };
    });
  } else if (active === "pagasa" && pagasa) {
    rows = pagasa.outlook.map((d, i) => {
      const glyph = glyphForDescription(d.day_description);
      return {
        key: d.date ?? String(i),
        day: d.date ? dayLabel(d.date, i) : `Day ${i + 1}`,
        date: d.date ? dateLabel(d.date) : "",
        glyph,
        condition: d.day_description ?? "—",
        hi: d.day_high,
        lo: d.day_low,
        rainMm: null,
        chance: null,
        wind: d.day_wind_direction
          ? `${d.day_wind_speed ?? ""} ${d.day_wind_direction}`.trim()
          : null,
        tone: glyph === "storm" || glyph === "heavy-rain" ? "yellow" : glyph === "rain" ? "advisory" : "calm",
      };
    });
  }

  return (
    <WeatherCard
      title="7-day outlook"
      subtitle={
        active === "model"
          ? "Model forecast for this town"
          : `PAGASA outlook for Rizal${pagasa?.outlook_issued_at ? ` · issued ${pagasa.outlook_issued_at.slice(0, 10)}` : ""}`
      }
      icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
      aside={
        hasPagasa ? (
          <div
            role="tablist"
            aria-label="Outlook source"
            className="glass-inset relative inline-flex rounded-full p-0.5 text-[11px] font-medium"
          >
            {(["model", "pagasa"] as const).map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={active === s}
                onClick={() => setSource(s)}
                className={cn(
                  "relative z-10 cursor-pointer rounded-full px-2.5 py-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active === s ? "text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active === s && (
                  <motion.span
                    layoutId="outlook-source-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-foreground"
                    transition={
                      reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }
                    }
                  />
                )}
                {s === "model" ? "Model" : "PAGASA"}
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Outlook unavailable.</p>
      ) : (
        <motion.ul
          key={active}
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: reduceMotion ? 0 : 0.04 } },
          }}
          className="-mx-2 divide-y divide-border/60"
        >
          {rows.map((r) => (
            <motion.li
              key={r.key}
              variants={{
                hidden: { opacity: 0, x: reduceMotion ? 0 : 8 },
                show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 28 } },
              }}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors duration-200 hover:bg-foreground/[0.04]"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: toneColor(r.tone, 0.1), color: `hsl(var(--warn-${r.tone}))` }}
              >
                <WeatherIcon glyph={r.glyph} className="h-6 w-6" title={r.condition} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{r.day}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {r.hi !== null ? `${Math.round(r.hi)}°` : "—"}
                    {r.lo !== null && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {Math.round(r.lo)}°
                      </span>
                    )}
                  </span>
                </div>
                <p className="truncate text-[11px] leading-snug text-muted-foreground">
                  {r.condition}
                </p>
                <p className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] tabular-nums text-muted-foreground">
                  {r.rainMm !== null && (
                    <span className={cn(r.rainMm > 0.2 && toneText[r.tone])}>
                      {r.rainMm.toFixed(1)} mm
                      {r.chance !== null && ` · ${Math.round(r.chance)}%`}
                    </span>
                  )}
                  {r.wind && <span className="capitalize">{r.wind}</span>}
                  {r.date && <span className="text-muted-foreground/70">{r.date}</span>}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </WeatherCard>
  );
};
