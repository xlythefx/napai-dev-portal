/**
 * The four Rizal towns this page covers, west to east along the
 * Cainta–Taytay–Angono–Binangonan corridor.
 */

export type TownId = "cainta" | "taytay" | "angono" | "binangonan";

/**
 * Which water system actually floods this town.
 *
 * Cainta and Taytay take water from the Marikina system, which rises and falls
 * in hours. Angono and Binangonan sit on Laguna de Bay, which floods by staying
 * high for days. Reading a lakeshore town off a Marikina headwater gauge points
 * at the wrong river, so the gauges are filtered by this.
 */
export type Basin = "marikina" | "laguna";

export interface Town {
  id: TownId;
  name: string;
  province: string;
  lat: number;
  lon: number;
  basin: Basin;
  /** Why this town floods, in one line — shown under the flood panel. */
  floodContext: string;
  /**
   * How exposed the town is to water arriving rather than rain falling.
   * Cainta sits in the Manggahan Floodway corridor and floods from water that
   * came from somewhere else; Binangonan largely does not flood at all.
   */
  exposure: number;
  /**
   * Baseline expectation, so a moderate score is not read as alarm in a town
   * where flooding is genuinely rare.
   */
  baseline: string;
}

export const TOWNS: readonly Town[] = [
  {
    id: "cainta",
    name: "Cainta",
    province: "Rizal",
    lat: 14.5786,
    lon: 121.1222,
    basin: "marikina",
    floodContext:
      "Low-lying and hemmed in by the Manggahan Floodway and the Cainta River. Floods from water arriving off the Marikina watershed as much as from rain falling overhead.",
    exposure: 1,
    baseline: "Cainta floods relatively often — this is a town where the warning matters.",
  },
  {
    id: "taytay",
    name: "Taytay",
    province: "Rizal",
    lat: 14.5573,
    lon: 121.1325,
    basin: "marikina",
    floodContext:
      "Drains toward the Manggahan Floodway and Laguna de Bay. Creek overflow in the lower barangays tends to follow sustained upstream rain.",
    exposure: 0.85,
    baseline: "Flooding is usually confined to the low barangays near the creeks and floodway.",
  },
  {
    id: "angono",
    name: "Angono",
    province: "Rizal",
    lat: 14.5265,
    lon: 121.1531,
    basin: "laguna",
    floodContext:
      "On the Laguna de Bay shore. Flooding here tracks the lake level, which stays high for days after heavy monsoon or typhoon rain rather than spiking with a single downpour.",
    exposure: 0.7,
    baseline: "Lakeshore flooding builds over days, not hours — the lake level is what to watch.",
  },
  {
    id: "binangonan",
    name: "Binangonan",
    province: "Rizal",
    lat: 14.4642,
    lon: 121.1919,
    basin: "laguna",
    floodContext:
      "Lakeshore town on the Laguna de Bay peninsula, and mostly elevated. Only the shoreline barangays are exposed, and then only when the lake has been high for a sustained period.",
    exposure: 0.45,
    baseline: "Binangonan does not usually flood. Most of the town sits above the lake, so a raised reading here means shoreline barangays, not the whole town.",
  },
] as const;

export const DEFAULT_TOWN: TownId = "cainta";

export const getTown = (id: TownId): Town =>
  TOWNS.find((t) => t.id === id) ?? TOWNS[0];
