import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Droplets, Gauge, Thermometer, Waves, Wind } from "lucide-react";
import type { OpenMeteoResponse } from "@/lib/weatherApi";
import { compassPoint, wmoToCondition } from "@/lib/weather/derive";
import { WeatherIcon } from "./WeatherIcon";
import { glyphForCode } from "@/lib/weather/glyph";

/**
 * Current conditions as a single quiet row, led by a live glyph of the sky.
 * The headline answer lives in the answer cards, so this only carries the
 * numbers people scan for afterwards.
 */
export const NowStrip = ({ data }: { data: OpenMeteoResponse }) => {
  const reduceMotion = useReducedMotion();
  const c = data.current;
  const condition = wmoToCondition(c.weather_code);
  const glyph = glyphForCode(c.weather_code, c.is_day === 1);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 26, delay: reduceMotion ? 0 : 0.18 }}
      className="glass-panel flex flex-col gap-4 rounded-2xl px-5 py-4 sm:flex-row sm:items-center sm:gap-6"
    >
      <div className="flex items-center gap-3 sm:border-r sm:border-border/60 sm:pr-6">
        <WeatherIcon glyph={glyph} className="h-12 w-12 text-foreground" title={condition.label} />
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">Right now</p>
          <p className="truncate text-base font-semibold leading-tight">{condition.label}</p>
        </div>
      </div>

      <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
        <Metric icon={<Thermometer className="h-3.5 w-3.5" />} label="Temp">
          {Math.round(c.temperature_2m)}°
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            feels {Math.round(c.apparent_temperature)}°
          </span>
        </Metric>
        <Metric icon={<Droplets className="h-3.5 w-3.5" />} label="Rain now">
          {c.precipitation.toFixed(1)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">mm/h</span>
        </Metric>
        <Metric icon={<Wind className="h-3.5 w-3.5" />} label="Wind">
          {Math.round(c.wind_speed_10m)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            km/h {compassPoint(c.wind_direction_10m)}
          </span>
        </Metric>
        <Metric icon={<Gauge className="h-3.5 w-3.5" />} label="Gusts">
          {Math.round(c.wind_gusts_10m)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">km/h</span>
        </Metric>
        <Metric icon={<Waves className="h-3.5 w-3.5" />} label="Humidity">
          {Math.round(c.relative_humidity_2m)}%
        </Metric>
      </dl>
    </motion.div>
  );
};

const Metric = ({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) => (
  <div className="min-w-0">
    <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="text-muted-foreground/70">{icon}</span>
      {label}
    </dt>
    <dd className="mt-0.5 truncate text-lg font-semibold tabular-nums">{children}</dd>
  </div>
);
