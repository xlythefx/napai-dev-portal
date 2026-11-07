import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { TOWNS, type TownId } from "@/lib/weather/towns";
import type { WarningStatus } from "@/lib/weatherApi";
import { cn } from "@/lib/utils";
import { Dot } from "./Dot";
import { type Tone } from "./tone";

const STATUS_TONE: Record<WarningStatus, Tone | null> = {
  none: null,
  advisory: "advisory",
  yellow: "yellow",
  orange: "orange",
  red: "red",
};

interface Props {
  value: TownId;
  onChange: (id: TownId) => void;
  /** PAGASA warning status per town name, when available. */
  statuses?: Record<string, { status: WarningStatus }>;
}

export const TownSwitcher = ({ value, onChange, statuses }: Props) => (
  <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Select a town">
    <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden />
    {TOWNS.map((town) => {
      const active = town.id === value;
      const tone = STATUS_TONE[statuses?.[town.name]?.status ?? "none"];
      return (
        <button
          key={town.id}
          role="tab"
          aria-selected={active}
          onClick={() => onChange(town.id)}
          className={cn(
            "relative inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            active ? "text-background" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {active && (
            <motion.span
              layoutId="town-pill"
              className="absolute inset-0 -z-10 rounded-full bg-foreground"
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            />
          )}
          {town.name}
          {tone && <Dot tone={tone} />}
        </button>
      );
    })}
  </div>
);
