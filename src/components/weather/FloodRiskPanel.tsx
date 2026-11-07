import { useState } from "react";
import { ChevronDown, Waves } from "lucide-react";
import type { FloodRiskResult } from "@/lib/weather/derive";
import { RISK_META } from "@/lib/weather/derive";
import type { Town } from "@/lib/weather/towns";
import { cn } from "@/lib/utils";
import { WeatherCard } from "./WeatherCard";
import { Dot } from "./Dot";
import { toneColor, toneText } from "./tone";

interface Props {
  risk: FloodRiskResult;
  town: Town;
}

const LEVELS = ["low", "watch", "elevated", "high", "critical"] as const;

/**
 * The flood answer. The reasoning is kept behind a toggle — showing five
 * weighted signals up front buries the one thing most people came to read.
 */
export const FloodRiskPanel = ({ risk, town }: Props) => {
  const [showWhy, setShowWhy] = useState(false);
  const meta = RISK_META[risk.level];
  const activeIndex = LEVELS.indexOf(risk.level);

  return (
    <WeatherCard
      title="Flood risk"
      icon={<Waves className="h-4 w-4 text-muted-foreground" />}
      aside={
        <div className="flex items-center gap-2">
          <Dot tone={meta.tone} pulse={risk.level === "high" || risk.level === "critical"} />
          <span className={cn("text-sm font-semibold", toneText[meta.tone])}>{meta.label}</span>
        </div>
      }
    >
      <p className="text-base font-medium leading-snug">{risk.headline}</p>

      {/* Five discrete steps read faster than a continuous bar, and they map
          onto the words used elsewhere on the page. */}
      <div className="mt-4 flex gap-1.5" role="img" aria-label={`Flood risk: ${meta.label}`}>
        {LEVELS.map((lvl, i) => (
          <div
            key={lvl}
            className="h-1.5 flex-1 rounded-full transition-colors duration-300"
            style={{
              background:
                i <= activeIndex ? toneColor(meta.tone, 1 - i * 0.12) : "hsl(var(--muted-foreground) / 0.15)",
            }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>Low</span>
        <span>Critical</span>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{town.baseline}</p>

      <button
        onClick={() => setShowWhy((v) => !v)}
        aria-expanded={showWhy}
        className="mt-4 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", showWhy && "rotate-180")} />
        {showWhy ? "Hide reasoning" : "Why this rating?"}
      </button>

      {showWhy && (
        <>
          <ul className="mt-3 space-y-3">
            {risk.drivers.map((d) => (
              <li key={d.label} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    background: d.available
                      ? toneColor(meta.tone, Math.max(0.3, d.score / 100))
                      : "hsl(var(--muted-foreground) / 0.35)",
                  }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium">
                    {d.label}
                    {!d.available && (
                      <span className="ml-1.5 font-normal text-muted-foreground">— not used</span>
                    )}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{d.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-4 rounded-xl glass-inset px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            {town.floodContext}
          </p>
        </>
      )}

      {risk.degraded && (
        <p className="mt-4 rounded-xl glass-inset px-3 py-2 text-xs text-muted-foreground">
          PAGASA's gauge network is unreachable, so this is based on forecast rain alone. Check
          PAGASA directly before acting on it.
        </p>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        Automated estimate, not an official warning. For evacuation decisions follow PAGASA and your
        local DRRMO.
      </p>
    </WeatherCard>
  );
};
