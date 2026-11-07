import { Wind } from "lucide-react";
import type { HabagatResult } from "@/lib/weather/derive";
import { toneColor } from "./tone";

/**
 * Habagat — the southwest monsoon — is the usual explanation for days of rain
 * with no typhoon anywhere near. Shown only when it is actually in play.
 */
export const HabagatBanner = ({ habagat }: { habagat: HabagatResult }) => {
  if (!habagat.active) return null;

  return (
    // The tint rides on an overlay rather than the element's own background —
    // setting `background` inline would replace the glass surface and kill the blur.
    <div className="glass-panel relative flex items-start gap-3 overflow-hidden rounded-2xl px-4 py-3">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `linear-gradient(90deg, ${toneColor("advisory", 0.14)} 0%, transparent 55%)`,
        }}
      />
      <Wind className="mt-0.5 h-4 w-4 shrink-0 text-warn-advisory" />
      <div className="min-w-0 text-sm">
        <p className="font-medium">Habagat (southwest monsoon) is active</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {habagat.detail}{" "}
          {habagat.source === "pagasa" ? (
            <span>Stated by PAGASA in the current bulletin.</span>
          ) : (
            <span>Inferred from wind direction — PAGASA's bulletin was unavailable.</span>
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Expect long spells of rain rather than short storms, heaviest on the west-facing side of
          the day, and rain that can continue for several days.
        </p>
      </div>
    </div>
  );
};
