/**
 * Maps a severity tone onto the PAGASA warning tokens defined in index.css.
 *
 * Severity is shown with dots, bars, borders and faint washes — never as a flat
 * filled panel — so the page stays inside the repo's monochrome design while
 * still reporting a red warning as red.
 */

export type Tone = "calm" | "advisory" | "yellow" | "orange" | "red";

/** `hsl(var(--warn-x) / alpha)` for inline styles (bars, washes, custom SVG). */
export const toneColor = (tone: Tone, alpha = 1) =>
  alpha === 1 ? `hsl(var(--warn-${tone}))` : `hsl(var(--warn-${tone}) / ${alpha})`;

export const toneText: Record<Tone, string> = {
  calm: "text-warn-calm",
  advisory: "text-warn-advisory",
  yellow: "text-warn-yellow",
  orange: "text-warn-orange",
  red: "text-warn-red",
};

export const toneDot: Record<Tone, string> = {
  calm: "bg-warn-calm",
  advisory: "bg-warn-advisory",
  yellow: "bg-warn-yellow",
  orange: "bg-warn-orange",
  red: "bg-warn-red",
};
