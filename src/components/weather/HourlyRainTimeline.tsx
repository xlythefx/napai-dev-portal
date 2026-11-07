import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Clock } from "lucide-react";
import type { OpenMeteoResponse } from "@/lib/weatherApi";
import { currentHourIndex, rainIntensity } from "@/lib/weather/derive";
import { WeatherCard } from "./WeatherCard";
import { toneColor } from "./tone";

const HOURS = 48;

/**
 * 48 hours of forecast rainfall, as bars scaled against PAGASA's intensity
 * bands. The probability line rides on top so a tall bar with a low chance
 * reads differently from a tall bar that is near-certain.
 */
export const HourlyRainTimeline = ({ data }: { data: OpenMeteoResponse }) => {
  const reduceMotion = useReducedMotion();
  const rows = useMemo(() => {
    const i0 = currentHourIndex(data.hourly.time);
    const out = [];
    for (let i = i0; i < Math.min(i0 + HOURS, data.hourly.time.length); i++) {
      const mm = data.hourly.precipitation[i] ?? 0;
      out.push({
        time: new Date(data.hourly.time[i]),
        mm,
        probability: data.hourly.precipitation_probability[i] ?? 0,
        intensity: rainIntensity(mm),
        isNow: i === i0,
      });
    }
    return out;
  }, [data]);

  // Scale to the tallest bar but never below 5 mm, so a drizzle-only day does
  // not render as if it were a downpour.
  const peak = Math.max(5, ...rows.map((r) => r.mm));
  const total = rows.reduce((a, r) => a + r.mm, 0);

  return (
    <WeatherCard
      title="Next 48 hours"
      subtitle={`${total.toFixed(0)} mm of rain forecast in total`}
      icon={<Clock className="h-4 w-4 text-muted-foreground" />}
      aside={
        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          {(["light", "moderate", "heavy", "intense", "torrential"] as const).map((k) => {
            const sample = { light: 1, moderate: 5, heavy: 10, intense: 20, torrential: 40 }[k];
            const tone = rainIntensity(sample).tone;
            return (
              <span key={k} className="inline-flex items-center gap-1 capitalize">
                <span className="h-2 w-2 rounded-sm" style={{ background: toneColor(tone) }} />
                {k}
              </span>
            );
          })}
        </div>
      }
    >
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex items-end gap-[3px] min-w-[640px] h-40">
          {rows.map((r, i) => {
            const heightPct = Math.max(r.mm > 0 ? 3 : 1, (r.mm / peak) * 100);
            return (
              <div key={i} className="group relative flex-1 flex flex-col justify-end h-full">
                {/* Probability tick */}
                <span
                  aria-hidden
                  className="absolute left-0 right-0 border-t border-dashed border-foreground/25"
                  style={{ bottom: `${r.probability}%` }}
                />
                {/* Bars grow from the baseline in a left-to-right sweep. Height
                    is the data; scaleY carries the entrance so the layout is
                    stable from the first frame. */}
                <motion.div
                  className="origin-bottom rounded-t-sm transition-opacity group-hover:opacity-100"
                  initial={reduceMotion ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 220,
                    damping: 24,
                    delay: reduceMotion ? 0 : Math.min(i * 0.012, 0.6),
                  }}
                  style={{
                    height: `${heightPct}%`,
                    background: r.mm > 0 ? toneColor(r.intensity.tone, 0.85) : "hsl(var(--muted-foreground) / 0.18)",
                    outline: r.isNow ? "1px solid hsl(var(--foreground) / 0.5)" : undefined,
                  }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2 py-1 text-[11px] shadow-md group-hover:block">
                  <span className="font-medium">
                    {r.time.toLocaleTimeString("en-PH", { hour: "numeric", hour12: true })}
                  </span>{" "}
                  · {r.mm.toFixed(1)} mm · {r.probability}%
                  <br />
                  <span className="text-muted-foreground">{r.intensity.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex min-w-[640px] justify-between pt-2 text-[10px] text-muted-foreground">
          {rows
            .filter((_, i) => i % 6 === 0)
            .map((r, i) => (
              <span key={i}>
                {r.time.toLocaleTimeString("en-PH", { hour: "numeric", hour12: true })}
              </span>
            ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Bar height is rainfall per hour; the dashed line is the chance of rain in that hour.
      </p>
    </WeatherCard>
  );
};
