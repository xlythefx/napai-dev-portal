import { CSSProperties, PointerEvent as ReactPointerEvent, useRef } from "react";
import { motion } from "framer-motion";
import {
  backgroundCss,
  buildVariants,
  DeckSettings,
  Slide,
  SlideElement,
} from "@/lib/slideshow";
import SlideElementView from "./SlideElementView";

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface SlideRendererProps {
  slide: Slide;
  settings: DeckSettings;
  scale: number;
  mode?: "edit" | "play";
  playKey?: number;
  selectedId?: string | null;
  interactive?: boolean;
  onSelect?: (id: string | null) => void;
  onElementChange?: (id: string, patch: Partial<SlideElement>) => void;
  onElementCommit?: () => void;
  className?: string;
}

const DRAG_THRESHOLD = 5; // client px before a drag starts

export default function SlideRenderer({
  slide,
  settings,
  scale,
  mode = "edit",
  playKey = 0,
  selectedId = null,
  interactive = false,
  onSelect,
  onElementChange,
  onElementCommit,
  className,
}: SlideRendererProps) {
  const drag = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);

  const resize = useRef<{
    id: string;
    dir: ResizeDir;
    startX: number;
    startY: number;
    box: { x: number; y: number; w: number; h: number };
    ratio: number | null;
    moved: boolean;
  } | null>(null);

  const sorted = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex);

  function handleElementDown(e: ReactPointerEvent, el: SlideElement) {
    if (!interactive) return;
    e.stopPropagation();
    onSelect?.(el.id);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = {
      id: el.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
      moved: false,
    };
  }

  function handlePointerMove(e: ReactPointerEvent) {
    if (resize.current) {
      const r = resize.current;
      const dx = (e.clientX - r.startX) / scale;
      const dy = (e.clientY - r.startY) / scale;
      if (!r.moved && Math.abs(e.clientX - r.startX) + Math.abs(e.clientY - r.startY) < DRAG_THRESHOLD) return;
      r.moved = true;
      let { x, y, w, h } = r.box;
      if (r.dir.includes("e")) w = r.box.w + dx;
      if (r.dir.includes("s")) h = r.box.h + dy;
      if (r.dir.includes("w")) { w = r.box.w - dx; x = r.box.x + dx; }
      if (r.dir.includes("n")) { h = r.box.h - dy; y = r.box.y + dy; }
      w = Math.max(20, w);
      h = Math.max(20, h);
      // Aspect-lock images on corner drags.
      if (r.ratio && r.dir.length === 2) {
        h = w / r.ratio;
        if (r.dir.includes("n")) y = r.box.y + (r.box.h - h);
        if (r.dir.includes("w")) x = r.box.x + (r.box.w - w);
      }
      const patch: Partial<SlideElement> = { x: Math.round(x), y: Math.round(y), width: Math.round(w) };
      // Text height auto-grows; only width matters for text resize.
      const el = slide.elements.find((s) => s.id === r.id);
      if (el && el.type !== "text") (patch as { height: number }).height = Math.round(h);
      onElementChange?.(r.id, patch);
      return;
    }
    if (drag.current) {
      const d = drag.current;
      const totalDx = e.clientX - d.startX;
      const totalDy = e.clientY - d.startY;
      if (!d.moved && Math.abs(totalDx) + Math.abs(totalDy) < DRAG_THRESHOLD) return;
      d.moved = true;
      onElementChange?.(d.id, {
        x: Math.round(d.origX + totalDx / scale),
        y: Math.round(d.origY + totalDy / scale),
      });
    }
  }

  function handlePointerUp() {
    if ((drag.current?.moved || resize.current?.moved) && onElementCommit) onElementCommit();
    drag.current = null;
    resize.current = null;
  }

  function startResize(e: ReactPointerEvent, el: SlideElement, dir: ResizeDir) {
    if (!interactive) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    resize.current = {
      id: el.id,
      dir,
      startX: e.clientX,
      startY: e.clientY,
      box: { x: el.x, y: el.y, w: el.width, h: el.height },
      ratio: el.type === "image" ? el.naturalRatio : null,
      moved: false,
    };
  }

  const handlePx = 12 / scale;
  const ringPx = 2 / scale;

  return (
    <div
      className={className}
      style={{ width: settings.width * scale, height: settings.height * scale, position: "relative" }}
      onPointerMove={interactive ? handlePointerMove : undefined}
      onPointerUp={interactive ? handlePointerUp : undefined}
    >
      <div
        style={{
          width: settings.width,
          height: settings.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "relative",
          overflow: "hidden",
        }}
        onPointerDown={interactive ? () => onSelect?.(null) : undefined}
      >
        {/* Background */}
        <div style={{ position: "absolute", inset: 0, ...backgroundCss(slide.background) }} />

        {/* Elements */}
        {sorted.map((el) => {
          const isText = el.type === "text";
          const wrapStyle: CSSProperties = {
            position: "absolute",
            left: el.x,
            top: el.y,
            width: el.width,
            height: isText ? "auto" : el.height,
            transform: `rotate(${el.rotation}deg)`,
            transformOrigin: "center center",
            opacity: el.opacity,
          };

          if (mode === "play") {
            const v = buildVariants(el.animation);
            const inner = <SlideElementView element={el} />;
            return (
              <motion.div
                key={`${el.id}-${playKey}`}
                style={{ ...wrapStyle, zIndex: el.zIndex }}
                initial={v.initial}
                animate={v.animate}
                exit={v.exit}
                transition={v.transition}
              >
                {v.emphasis ? (
                  <motion.div
                    style={{ width: "100%", height: "100%" }}
                    animate={v.emphasis.animate}
                    transition={v.emphasis.transition}
                  >
                    {inner}
                  </motion.div>
                ) : (
                  inner
                )}
              </motion.div>
            );
          }

          // edit mode (static, interactive)
          const selected = selectedId === el.id && interactive;
          return (
            <div
              key={el.id}
              style={{
                ...wrapStyle,
                zIndex: el.zIndex,
                cursor: interactive ? "move" : "default",
                outline: selected ? `${ringPx}px solid #6366f1` : "none",
                outlineOffset: ringPx,
              }}
              onPointerDown={(e) => handleElementDown(e, el)}
            >
              <SlideElementView element={el} />
              {selected &&
                (isText ? (["w", "e"] as ResizeDir[]) : (["nw", "ne", "sw", "se", "n", "s", "e", "w"] as ResizeDir[])).map(
                  (dir) => (
                    <div
                      key={dir}
                      onPointerDown={(e) => startResize(e, el, dir)}
                      style={handleStyle(dir, handlePx)}
                    />
                  )
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function handleStyle(dir: ResizeDir, size: number): CSSProperties {
  const base: CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    background: "#fff",
    border: `${size * 0.12}px solid #6366f1`,
    borderRadius: 2,
    boxSizing: "border-box",
    zIndex: 50,
  };
  const half = -size / 2;
  const cursorMap: Record<ResizeDir, string> = {
    n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
    ne: "nesw-resize", sw: "nesw-resize", nw: "nwse-resize", se: "nwse-resize",
  };
  base.cursor = cursorMap[dir];
  const v = dir.includes("n") ? { top: half } : dir.includes("s") ? { bottom: half } : { top: `calc(50% + ${half}px)` };
  const h = dir.includes("w") ? { left: half } : dir.includes("e") ? { right: half } : { left: `calc(50% + ${half}px)` };
  return { ...base, ...v, ...h };
}
