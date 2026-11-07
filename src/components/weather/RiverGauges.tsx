import { Activity, ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { RainGauge, RiverStation } from "@/lib/weatherApi";
import type { Basin } from "@/lib/weather/towns";
import { WeatherCard } from "./WeatherCard";
import { toneColor, toneText, type Tone } from "./tone";

const stationTone = (s: RiverStation): Tone => {
  if (s.level === null) return "calm";
  if (s.critical !== null && s.level >= s.critical) return "red";
  if (s.alarm !== null && s.level >= s.alarm) return "orange";
  if (s.alert !== null && s.level >= s.alert) return "yellow";
  return "calm";
};

const stationLabel = (s: RiverStation) => {
  if (s.level === null) return "No reading";
  if (s.critical !== null && s.level >= s.critical) return "Critical";
  if (s.alarm !== null && s.level >= s.alarm) return "Alarm";
  if (s.alert !== null && s.level >= s.alert) return "Alert";
  if (s.alert === null) return "No thresholds";
  return "Normal";
};

interface Props {
  stations?: RiverStation[];
  /** Only show gauges from the selected town's own water system. */
  basin?: Basin;
  isLoading?: boolean;
  error?: unknown;
  stale?: boolean;
}

/** Live PAGASA gauges, each read against its own alert/alarm/critical marks. */
export const RiverGauges = ({ stations, basin, isLoading, error, stale }: Props) => {
  const isLake = basin === "laguna";
  const shown = (stations ?? []).filter(
    (s) =>
      (!basin || s.basin === basin) &&
      (s.relevance === "primary" || s.relevance === "upstream")
  );

  return (
    <WeatherCard
      title={isLake ? "Lake levels" : "River levels"}
      subtitle={
        isLake
          ? "Laguna de Bay and its outflow, from PAGASA's flood forecasting network"
          : "Marikina system gauges from PAGASA's flood forecasting network, updated every 10 minutes"
      }
      icon={<Activity className="h-4 w-4 text-muted-foreground" />}
      isLoading={isLoading}
      error={error}
      stale={stale}
      errorMessage="PAGASA's flood forecasting system could not be reached."
    >
      <div className="space-y-4">
        {shown.map((s) => {
          const tone = stationTone(s);
          const label = stationLabel(s);
          // Bar spans from 3 m below alert up to critical, so the alert band fills
          // the right-hand portion and normal readings sit low.
          const lo = s.alert !== null ? s.alert - 3 : null;
          const hi = s.critical ?? (s.alert !== null ? s.alert + 2 : null);
          const pct =
            s.level !== null && lo !== null && hi !== null && hi > lo
              ? Math.min(100, Math.max(0, ((s.level - lo) / (hi - lo)) * 100))
              : null;

          return (
            <div key={s.code}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium">{s.label}</span>
                <span className="flex items-center gap-1.5 text-xs tabular-nums">
                  {s.trend_1h !== null && s.trend_1h !== 0 &&
                    (s.trend_1h > 0 ? (
                      <ArrowUp className="h-3 w-3 text-warn-orange" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-warn-calm" />
                    ))}
                  {s.trend_1h === 0 && <Minus className="h-3 w-3 text-muted-foreground" />}
                  <span className="font-semibold">
                    {s.level !== null ? `${s.level.toFixed(2)} m` : "—"}
                  </span>
                  <span className={toneText[tone]}>{label}</span>
                </span>
              </div>

              {pct !== null ? (
                <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${Math.max(2, pct)}%`, background: toneColor(tone) }}
                  />
                  {/* Threshold ticks */}
                  {[s.alert, s.alarm].map((t, i) =>
                    t !== null && lo !== null && hi !== null ? (
                      <span
                        key={i}
                        aria-hidden
                        className="absolute top-0 h-full w-px bg-foreground/30"
                        style={{ left: `${((t - lo) / (hi - lo)) * 100}%` }}
                      />
                    ) : null
                  )}
                </div>
              ) : (
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted" />
              )}

              <p className="mt-1 text-[11px] text-muted-foreground">
                {s.alert !== null ? (
                  <>
                    Alert {s.alert.toFixed(2)} · Alarm {s.alarm?.toFixed(2)} · Critical{" "}
                    {s.critical?.toFixed(2)} m
                  </>
                ) : (
                  s.note
                )}
                {s.stale_reading && <span className="ml-1">· reading not refreshed</span>}
              </p>
            </div>
          );
        })}

        {shown.length === 0 && (
          <p className="text-sm text-muted-foreground">No gauge readings available.</p>
        )}
      </div>
    </WeatherCard>
  );
};

/** Rain already measured on the ground, split by where it fell. */
export const RainGauges = ({
  gauges,
  isLoading,
  error,
  stale,
}: {
  gauges?: RainGauge[];
  isLoading?: boolean;
  error?: unknown;
  stale?: boolean;
}) => {
  const live = (gauges ?? []).filter((g) => !g.offline);
  const peak = Math.max(10, ...live.map((g) => g.mm_24h ?? 0));

  return (
    <WeatherCard
      title="Rain already measured"
      subtitle="Watershed gauges lead the lowlands by hours — this is rain that has already fallen, not a forecast"
      icon={<Activity className="h-4 w-4 text-muted-foreground" />}
      isLoading={isLoading}
      error={error}
      stale={stale}
      errorMessage="PAGASA's rain gauge network could not be reached."
    >
      <div className="space-y-2.5">
        {live.map((g) => (
          <div key={g.code} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-xs">
              {g.label}
              <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {g.zone === "watershed" ? "upstream" : "local"}
              </span>
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(1, ((g.mm_24h ?? 0) / peak) * 100)}%`,
                  background: toneColor(g.zone === "watershed" ? "advisory" : "calm", 0.8),
                }}
              />
            </div>
            <span className="w-28 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {(g.mm_1h ?? 0).toFixed(1)} / {(g.mm_24h ?? 0).toFixed(0)} mm
            </span>
          </div>
        ))}
        {live.length === 0 && (
          <p className="text-sm text-muted-foreground">All gauges are currently offline.</p>
        )}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Figures are last hour / last 24 hours.</p>
    </WeatherCard>
  );
};
