import { useReducedMotion } from "framer-motion";
import { toneColor, type Tone } from "./tone";

/**
 * Soft colour field behind the page.
 *
 * `backdrop-filter` has nothing to do on a flat background — glass only reads
 * as glass when there is something behind it to refract. This supplies that,
 * tinted by the current severity so the whole page shifts mood as conditions
 * change, without ever painting a large saturated surface.
 *
 * Fixed and non-interactive, so it never affects layout or hit testing.
 */
export const AmbientBackdrop = ({ tone }: { tone: Tone }) => {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base wash so light mode is not pure flat white behind the glass. */}
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0 opacity-[0.55] dark:opacity-40"
        style={{
          background: `radial-gradient(60rem 40rem at 12% -10%, ${toneColor(tone, 0.22)} 0%, transparent 60%),
                       radial-gradient(50rem 35rem at 88% 8%, hsl(var(--foreground) / 0.07) 0%, transparent 55%),
                       radial-gradient(45rem 30rem at 50% 105%, ${toneColor(tone, 0.14)} 0%, transparent 60%)`,
          transition: reduceMotion ? "none" : "background 900ms ease-out",
        }}
      />
      {/* Fine grain stops the gradients from banding on wide displays. */}
      <div
        className="absolute inset-0 opacity-[0.15] dark:opacity-[0.2] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
};
