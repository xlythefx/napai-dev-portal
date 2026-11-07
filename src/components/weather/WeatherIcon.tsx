import { cn } from "@/lib/utils";
import type { WeatherGlyph } from "@/lib/weather/glyph";

export type { WeatherGlyph };

/**
 * Animated weather glyphs drawn in `currentColor`, so they inherit the text
 * colour and stay on-token in both themes. Motion lives in index.css (`.wx-*`)
 * and stops under prefers-reduced-motion.
 */
interface Props {
  glyph: WeatherGlyph;
  className?: string;
  /** Turn the motion off for this instance regardless of the OS setting. */
  still?: boolean;
  title?: string;
}

const Cloud = ({ className, back = false }: { className?: string; back?: boolean }) => (
  <path
    className={cn(back ? "wx-cloud-back" : "wx-cloud", className)}
    d="M7 15.5a3.5 3.5 0 0 1-.6-6.95A5.5 5.5 0 0 1 17 8.5h.5a3.5 3.5 0 0 1 0 7H7Z"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinejoin="round"
  />
);

const Drops = ({ variant }: { variant: "drop" | "drizzle" }) => (
  <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none">
    <path className={`wx-${variant}`} d="M9 17.5v2" />
    <path className={`wx-${variant}`} d="M12 18.5v2" />
    <path className={`wx-${variant}`} d="M15 17.5v2" />
  </g>
);

export const WeatherIcon = ({ glyph, className, still, title }: Props) => (
  <svg
    viewBox="0 0 24 24"
    role="img"
    aria-label={title ?? glyph}
    className={cn(!still && "wx-icon", "shrink-0", className)}
  >
    {glyph === "sun" && (
      <>
        <g className="wx-sun" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={i}
              x1="12"
              y1="2.5"
              x2="12"
              y2="5"
              transform={`rotate(${i * 45} 12 12)`}
            />
          ))}
        </g>
        <circle className="wx-sun-core" cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </>
    )}

    {glyph === "moon" && (
      <path
        className="wx-moon"
        d="M15.5 3.5a8 8 0 1 0 5 14.5 7 7 0 0 1-5-14.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    )}

    {glyph === "partly" && (
      <>
        <g className="wx-sun" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.8">
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={i} x1="8" y1="2.5" x2="8" y2="4.2" transform={`rotate(${i * 60} 8 8)`} />
          ))}
        </g>
        <circle cx="8" cy="8" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.8" />
        <path
          className="wx-cloud"
          d="M9 18.5a3 3 0 0 1-.4-5.97A4.8 4.8 0 0 1 18 12h.4a3.25 3.25 0 0 1 0 6.5H9Z"
          fill="hsl(var(--card))"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </>
    )}

    {glyph === "cloud" && (
      <>
        <path
          className="wx-cloud-back"
          d="M10 11.5a2.6 2.6 0 0 1-.3-5.2A4 4 0 0 1 17.4 7h.3a2.6 2.6 0 0 1 0 5.2H10Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          opacity="0.45"
        />
        <path
          className="wx-cloud"
          d="M7 18.5a3.5 3.5 0 0 1-.6-6.95A5.5 5.5 0 0 1 17 11.5h.5a3.5 3.5 0 0 1 0 7H7Z"
          fill="hsl(var(--card))"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </>
    )}

    {glyph === "fog" && (
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path className="wx-fog" d="M4 9h16" />
        <path className="wx-fog" d="M6 13h12" />
        <path className="wx-fog" d="M4 17h16" />
      </g>
    )}

    {glyph === "drizzle" && (
      <>
        <Cloud />
        <Drops variant="drizzle" />
      </>
    )}

    {glyph === "rain" && (
      <>
        <Cloud />
        <Drops variant="drop" />
      </>
    )}

    {glyph === "heavy-rain" && (
      <>
        <Cloud />
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none">
          <path className="wx-drop" d="M8 17.5v3" />
          <path className="wx-drop" d="M12 18v3" />
          <path className="wx-drop" d="M16 17.5v3" />
        </g>
      </>
    )}

    {glyph === "storm" && (
      <>
        <Cloud />
        <path
          className="wx-bolt"
          d="M13 15.5l-2.2 4h2l-1 3 3.2-4.5h-2l1-2.5Z"
          fill="currentColor"
          stroke="none"
        />
      </>
    )}
  </svg>
);
