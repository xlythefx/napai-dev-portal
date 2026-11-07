import { useEffect, useState } from "react";

/**
 * Canvas 2D (`fillStyle` / `strokeStyle`) cannot parse CSS custom properties:
 * assigning `hsl(var(--primary))` is an unparseable value, so per spec it is
 * silently ignored and the style stays at its default black. Several 21st.dev
 * components take a `color` prop and hand it straight to a canvas, which means
 * they render hardcoded black instead of honouring the design tokens.
 *
 * `resolveThemeColor` renders the value through a throwaway DOM node so the
 * cascade resolves any `var(--…)` for us, then reads back the concrete
 * `rgb()` / `rgba()` string that canvas does understand.
 */
export function resolveThemeColor(value: string, fallback = "rgb(0, 0, 0)"): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback;
  }

  const probe = document.createElement("span");
  // `position: fixed` + zero size keeps the probe out of layout; it still has to
  // be attached for custom properties on :root to be inherited.
  probe.style.cssText = "position:fixed;width:0;height:0;opacity:0;pointer-events:none";
  // Sentinel: if `value` is invalid the assignment is a no-op and the computed
  // colour comes back as the sentinel, telling us to use the fallback.
  probe.style.color = "rgb(1, 2, 3)";
  probe.style.color = value;

  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();

  return computed === "rgb(1, 2, 3)" ? fallback : computed;
}

/**
 * {@link resolveThemeColor} as a `#rrggbb` string, for libraries that only
 * accept hex (e.g. `react-icon-cloud`'s `renderSimpleIcon`).
 */
export function resolveThemeColorHex(value: string, fallback = "#000000"): string {
  const rgb = resolveThemeColor(value, "");
  const match = rgb.match(/(\d+(?:\.\d+)?)/g);
  if (!match || match.length < 3) return fallback;

  return (
    "#" +
    match
      .slice(0, 3)
      .map((n) => Math.round(Number(n)).toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Same as {@link resolveThemeColor}, but re-resolves whenever the active theme
 * changes so canvas-backed visuals stay in sync with light/dark tokens.
 */
export function useThemeColor(value: string, fallback?: string): string {
  const [resolved, setResolved] = useState(() => resolveThemeColor(value, fallback));

  useEffect(() => {
    const update = () => setResolved(resolveThemeColor(value, fallback));
    update();

    // next-themes toggles `class`/`style` on <html>; some setups use data-theme.
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", update);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
    };
  }, [value, fallback]);

  return resolved;
}
