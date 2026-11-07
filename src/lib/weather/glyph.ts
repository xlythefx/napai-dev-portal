/**
 * Weather glyph vocabulary shared by the icon component and the data layer.
 */
export type WeatherGlyph =
  | "sun"
  | "moon"
  | "partly"
  | "cloud"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy-rain"
  | "storm";

/** Map a WMO weather code onto a glyph. `isDay` swaps sun for moon. */
export function glyphForCode(code: number, isDay = true): WeatherGlyph {
  if (code === 0 || code === 1) return isDay ? "sun" : "moon";
  if (code === 2) return "partly";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 55) return "drizzle";
  if (code === 65 || code === 82) return "heavy-rain";
  if ((code >= 61 && code <= 63) || code === 80 || code === 81) return "rain";
  if (code >= 95) return "storm";
  return "cloud";
}
