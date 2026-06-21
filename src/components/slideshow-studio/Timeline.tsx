import { Slide, SlideElement } from "@/lib/slideshow";

interface TimelineProps {
  slide: Slide;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function elementLabel(el: SlideElement): string {
  if (el.type === "text") return el.text.slice(0, 24) || "Text";
  if (el.type === "image") return "Image";
  return el.shape.charAt(0).toUpperCase() + el.shape.slice(1);
}

const Timeline = ({ slide, selectedId, onSelect }: TimelineProps) => {
  const total = Math.max(1, slide.durationMs);
  const pct = (ms: number) => `${Math.min(100, Math.max(0, (ms / total) * 100))}%`;

  // Tick marks every 500ms.
  const ticks: number[] = [];
  for (let t = 0; t <= total; t += 500) ticks.push(t);

  return (
    <div className="flex h-40 flex-col border-t border-border bg-background">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs font-semibold">Timeline · {slide.name}</span>
        <span className="text-[10px] text-muted-foreground">{(total / 1000).toFixed(1)}s</span>
      </div>

      {/* Ruler */}
      <div className="relative ml-32 mr-3 h-4 border-b border-border/60">
        {ticks.map((t) => (
          <div key={t} className="absolute top-0 h-full" style={{ left: pct(t) }}>
            <div className="h-1.5 w-px bg-border" />
            <span className="absolute left-1 top-0 text-[8px] text-muted-foreground">{(t / 1000).toFixed(1)}</span>
          </div>
        ))}
      </div>

      {/* Lanes */}
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {slide.elements.length === 0 && (
          <p className="px-2 text-xs text-muted-foreground">No elements on this slide yet.</p>
        )}
        {slide.elements.map((el) => {
          const a = el.animation;
          const enterStart = a.enterDelayMs;
          const enterEnd = a.enterDelayMs + a.enterDurationMs;
          const exitStart = a.exit !== "none" ? Math.max(enterEnd, total - a.exitDurationMs) : total;
          const selected = el.id === selectedId;
          return (
            <div key={el.id} className="flex items-center gap-2">
              <button
                onClick={() => onSelect(el.id)}
                className={`w-28 shrink-0 truncate rounded px-2 py-1 text-left text-[11px] ${
                  selected ? "bg-primary/15 text-primary" : "hover:bg-muted"
                }`}
                title={elementLabel(el)}
              >
                {elementLabel(el)}
              </button>
              <div
                className={`relative h-5 flex-1 cursor-pointer rounded bg-muted/40 ${selected ? "ring-1 ring-primary/50" : ""}`}
                onClick={() => onSelect(el.id)}
              >
                {/* on-screen fill */}
                <div
                  className="absolute top-0 h-full rounded bg-primary/15"
                  style={{ left: pct(enterEnd), width: `calc(${pct(exitStart)} - ${pct(enterEnd)})` }}
                />
                {/* enter bar */}
                <div
                  className="absolute top-0 h-full rounded bg-primary/70"
                  style={{ left: pct(enterStart), width: pct(a.enterDurationMs) }}
                  title={`Enter: ${a.enter} (${a.enterDurationMs}ms, delay ${a.enterDelayMs}ms)`}
                />
                {/* exit bar */}
                {a.exit !== "none" && (
                  <div
                    className="absolute top-0 h-full rounded bg-amber-500/70"
                    style={{ left: pct(exitStart), width: pct(a.exitDurationMs) }}
                    title={`Exit: ${a.exit} (${a.exitDurationMs}ms)`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;
