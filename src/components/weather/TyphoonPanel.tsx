import { useState } from "react";
import { ChevronDown, Tornado } from "lucide-react";
import type { Cyclone } from "@/lib/weather/derive";
import type { Town } from "@/lib/weather/towns";
import { cn } from "@/lib/utils";
import { WeatherCard } from "./WeatherCard";
import { Dot } from "./Dot";
import { toneColor, toneText, type Tone } from "./tone";

const categoryTone = (c: Cyclone): Tone => {
  if (!c.insidePar) return "calm";
  const kt = c.windKt ?? 0;
  if (kt >= 100) return "red";
  if (kt >= 64) return "orange";
  return "yellow";
};

interface Props {
  cyclones: Cyclone[];
  bulletin?: string;
  town: Town;
  isLoading?: boolean;
  error?: unknown;
}

/**
 * Active tropical cyclones from JTWC's western-Pacific advisory.
 *
 * JMA's targetTc.json only lists systems it has named, so it can read empty
 * while a depression is active — the JTWC text bulletin is the fuller source,
 * and it is the only one of the two that is CORS-open and always populated.
 */
export const TyphoonPanel = ({ cyclones, bulletin, town, isLoading, error }: Props) => {
  const [showRaw, setShowRaw] = useState(false);
  const inPar = cyclones.filter((c) => c.insidePar);
  const outside = cyclones.filter((c) => !c.insidePar);

  return (
    <WeatherCard
      title="Tropical cyclones"
      subtitle="Joint Typhoon Warning Center, western North Pacific"
      icon={<Tornado className="h-4 w-4 text-muted-foreground" />}
      isLoading={isLoading}
      error={error}
      errorMessage="The JTWC advisory could not be reached."
      aside={
        <div className="flex items-center gap-2">
          <Dot tone={inPar.length ? "orange" : "calm"} pulse={inPar.length > 0} />
          <span className={cn("text-xs font-semibold", inPar.length ? toneText.orange : toneText.calm)}>
            {inPar.length ? `${inPar.length} inside PAR` : "None inside PAR"}
          </span>
        </div>
      }
    >
      {cyclones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tropical cyclones are currently active in the western North Pacific.
        </p>
      ) : (
        <div className="space-y-3">
          {inPar.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing inside the Philippine Area of Responsibility. {outside.length} system
              {outside.length === 1 ? "" : "s"} active elsewhere in the basin:
            </p>
          )}

          {[...inPar, ...outside].map((c) => {
            const tone = categoryTone(c);
            return (
              <div
                key={c.designation}
                className="rounded-xl border border-border p-3"
                style={{ background: toneColor(tone, c.insidePar ? 0.07 : 0) }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Dot tone={tone} />
                    {c.category} {c.name}
                    <span className="text-xs font-normal text-muted-foreground">{c.designation}</span>
                  </span>
                  <span className={cn("text-xs font-medium", c.insidePar ? toneText[tone] : "text-muted-foreground")}>
                    {c.insidePar ? "Inside PAR" : "Outside PAR"}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {c.distanceKm.toLocaleString()} km {c.bearing} of {town.name} · {c.lat.toFixed(1)}°N{" "}
                  {c.lon.toFixed(1)}°E
                  {c.windKt !== null && (
                    <>
                      {" "}· {c.windKt} kt sustained
                      {c.gustKt !== null && `, gusting ${c.gustKt} kt`}
                    </>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        Philippine storm names and wind signals are issued by PAGASA and are not carried by JTWC.
        Check PAGASA's tropical cyclone bulletin for the local name and signal number.
      </p>

      {bulletin && (
        <>
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showRaw && "rotate-180")} />
            {showRaw ? "Hide" : "Show"} the raw JTWC advisory
          </button>
          {showRaw && (
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap glass-inset rounded-xl p-3 text-[11px] leading-relaxed text-muted-foreground">
              {bulletin}
            </pre>
          )}
        </>
      )}
    </WeatherCard>
  );
};
