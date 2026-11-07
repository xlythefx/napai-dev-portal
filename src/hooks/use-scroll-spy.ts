import { useEffect, useState } from "react";

/**
 * Tracks which of the given section ids is currently the "active" one in the
 * viewport, so the navbar can highlight it as the user scrolls.
 *
 * Sections are measured against a line sitting just under the fixed navbar
 * rather than against pure intersection ratios — long sections and short
 * sections then behave the same way, which ratio-based observers get wrong.
 *
 * @param ids       Section element ids, in document order.
 * @param enabled   Pass false on routes that have no sections (skips all work).
 * @param offset    Distance from the top of the viewport treated as the
 *                  activation line — roughly the navbar height.
 */
export function useScrollSpy(ids: string[], enabled = true, offset = 96) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Depend on a stable string rather than the array identity, so callers may
  // pass an inline literal without re-running the effect on every render.
  const key = ids.join("|");

  useEffect(() => {
    const sectionIds = key ? key.split("|") : [];

    if (!enabled || sectionIds.length === 0) {
      setActiveId(null);
      return;
    }

    let frame: number | null = null;

    const measure = () => {
      frame = null;

      // Bottom of the page: always favour the last section, otherwise a short
      // final section can never win the activation line.
      const scrolledToBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;

      if (scrolledToBottom) {
        const last = [...sectionIds]
          .reverse()
          .find((id) => document.getElementById(id));
        if (last) setActiveId(last);
        return;
      }

      let current: string | null = null;

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= offset) current = id;
      }

      setActiveId(current);
    };

    const onScroll = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [key, enabled, offset]);

  return activeId;
}
