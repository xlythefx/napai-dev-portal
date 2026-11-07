import { useState } from "react";
import { ChevronDown, ShieldAlert } from "lucide-react";
import type { PagasaData, WarningStatus } from "@/lib/weatherApi";
import type { Town } from "@/lib/weather/towns";
import { cn } from "@/lib/utils";
import { WeatherCard } from "./WeatherCard";
import { Dot } from "./Dot";
import { toneColor, toneText, type Tone } from "./tone";

const STATUS: Record<WarningStatus, { label: string; tone: Tone; blurb: string }> = {
  none: {
    label: "No warning",
    tone: "calm",
    blurb: "PAGASA's current rainfall warning does not cover this town.",
  },
  advisory: {
    label: "Advisory",
    tone: "advisory",
    blurb: "PAGASA expects rain here, below warning level.",
  },
  yellow: {
    label: "Yellow warning",
    tone: "yellow",
    blurb: "Flooding is possible in low-lying areas. Monitor the next bulletin.",
  },
  orange: {
    label: "Orange warning",
    tone: "orange",
    blurb: "Flooding is threatening. Be ready to evacuate low-lying areas.",
  },
  red: {
    label: "Red warning",
    tone: "red",
    blurb: "Serious flooding expected. Act on your local DRRMO's instructions.",
  },
};

interface Props {
  data: PagasaData | null;
  town: Town;
  isLoading?: boolean;
  error?: unknown;
  stale?: boolean;
  fetchedAt?: string;
}

/**
 * PAGASA's own words. Everything else on this page is a model or a derivation;
 * this panel is the official advisory, quoted rather than summarised.
 */
export const PagasaPanel = ({ data, town, isLoading, error, stale }: Props) => {
  const [showFull, setShowFull] = useState(false);

  const status = data?.town_status?.[town.name]?.status ?? "none";
  const meta = STATUS[status];
  const warning = data?.warning ?? null;

  return (
    <WeatherCard
      title="PAGASA advisory"
      subtitle={warning?.title ?? "Official rainfall warning for the NCR-PRSD region"}
      icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" />}
      isLoading={isLoading}
      error={error}
      stale={stale}
      errorMessage="PAGASA could not be reached. The forecast panels above are unaffected."
      aside={
        warning?.issued_at ? (
          <span className="text-[11px] text-muted-foreground">Issued {warning.issued_at}</span>
        ) : undefined
      }
    >
      {!data ? (
        <p className="text-sm text-muted-foreground">
          PAGASA's bulletin could not be parsed right now. The rain and flood panels above still
          work — they come from other sources.
        </p>
      ) : (
        <div className="space-y-4">
          <div
            className="rounded-xl border border-border p-4"
            style={{ background: toneColor(meta.tone, 0.07) }}
          >
            <div className="flex items-center gap-2">
              <Dot tone={meta.tone} pulse={status === "orange" || status === "red"} />
              <span className={cn("text-sm font-semibold", toneText[meta.tone])}>
                {town.name}: {meta.label}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{meta.blurb}</p>
            {warning?.hazard && (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Associated hazard: </span>
                {warning.hazard}
              </p>
            )}
          </div>

          {data.weather_system && (
            <p className="text-sm">
              <span className="text-muted-foreground">Prevailing weather system: </span>
              <span className="font-medium">{data.weather_system}</span>
            </p>
          )}

          {data.thunderstorm && (
            <p className="text-xs text-muted-foreground">{data.thunderstorm}</p>
          )}

          {warning && warning.levels.length > 0 && (
            <div className="space-y-2">
              {warning.levels.map((lvl) => (
                <div key={lvl.level} className="glass-inset rounded-xl p-3">
                  <div className="mb-1.5 flex items-center gap-2">
                    <Dot tone={lvl.level as Tone} />
                    <span className={cn("text-xs font-semibold uppercase", toneText[lvl.level as Tone])}>
                      {lvl.level} warning level
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{lvl.areas}</p>
                </div>
              ))}
            </div>
          )}

          {warning && (
            <>
              <button
                onClick={() => setShowFull((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showFull && "rotate-180")} />
                {showFull ? "Hide" : "Read"} the full bulletin
              </button>
              {showFull && (
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap glass-inset rounded-xl p-3 text-[11px] leading-relaxed text-muted-foreground">
                  {warning.text}
                </pre>
              )}
            </>
          )}

          {warning?.next_warning && (
            <p className="text-xs text-muted-foreground">
              Next bulletin due at <span className="font-medium text-foreground">{warning.next_warning}</span>.
            </p>
          )}
        </div>
      )}
    </WeatherCard>
  );
};

/** PAGASA's provincial outlook for Rizal — their forecast, not the model's. */
export const PagasaOutlook = ({ data }: { data: PagasaData | null }) => {
  if (!data?.outlook?.length) return null;

  return (
    <WeatherCard
      title="PAGASA outlook for Rizal"
      subtitle={
        data.outlook_issued_at
          ? `Provincial forecast issued ${data.outlook_issued_at}`
          : "Provincial forecast"
      }
      icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" />}
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {data.outlook.map((d, i) => (
          <div key={d.date ?? i} className="glass-inset rounded-xl p-3">
            <p className="text-xs font-semibold">
              {d.date
                ? i === 0
                  ? "Today"
                  : new Date(d.date).toLocaleDateString("en-PH", { weekday: "short" })
                : `Day ${i + 1}`}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground min-h-[3rem]">
              {d.day_description ?? "—"}
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {d.day_high !== null ? `${Math.round(d.day_high)}°` : "—"}
              {d.day_low !== null && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  / {Math.round(d.day_low)}°
                </span>
              )}
            </p>
            {d.day_wind_direction && (
              <p className="mt-1 text-[11px] capitalize text-muted-foreground">
                {d.day_wind_speed?.toLowerCase()} · {d.day_wind_direction}
              </p>
            )}
          </div>
        ))}
      </div>
    </WeatherCard>
  );
};
