// Direct-manipulation overlay on top of the Remotion <Player>. Click to select,
// Shift/Ctrl-click to multi-select, drag-on-empty to marquee-select, drag to move
// (all selected together), 8 handles to resize, top handle to rotate. Snaps to
// canvas + other layers with guide lines (Alt bypasses). Resize is rotation-
// correct. In M2+, transform writes route through the editor's keyframe logic.

import React, { useEffect, useRef, useState } from "react";
import { evalColor, evalNumber, type Layer } from "@/lib/remotion/layers";
import type { Scene } from "@/lib/remotion/types";

export type TransformPatch = Partial<{
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  scale: number;
  width: number;
  height: number;
}>;

interface EditOverlayProps {
  scene: Scene;
  selectedIds: string[];
  frame: number;
  compWidth: number;
  compHeight: number;
  onSelect: (id: string | null, additive: boolean) => void;
  onMarquee: (ids: string[], additive: boolean) => void;
  onChange: (id: string, patch: TransformPatch) => void; // live
  onCommit: () => void;
  onTextChange?: (id: string, text: string) => void; // double-click a text layer to edit inline
}

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const DRAG_THRESHOLD = 4;

const HANDLES: { dir: ResizeDir; cx: number; cy: number; cursor: string }[] = [
  { dir: "nw", cx: 0, cy: 0, cursor: "nwse-resize" },
  { dir: "n", cx: 0.5, cy: 0, cursor: "ns-resize" },
  { dir: "ne", cx: 1, cy: 0, cursor: "nesw-resize" },
  { dir: "e", cx: 1, cy: 0.5, cursor: "ew-resize" },
  { dir: "se", cx: 1, cy: 1, cursor: "nwse-resize" },
  { dir: "s", cx: 0.5, cy: 1, cursor: "ns-resize" },
  { dir: "sw", cx: 0, cy: 1, cursor: "nesw-resize" },
  { dir: "w", cx: 0, cy: 0.5, cursor: "ew-resize" },
];

const EditOverlay: React.FC<EditOverlayProps> = ({
  scene,
  selectedIds,
  frame,
  compWidth,
  compHeight,
  onSelect,
  onMarquee,
  onChange,
  onCommit,
  onTextChange,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [guides, setGuides] = useState<{ vx: number[]; hy: number[] }>({ vx: [], hy: [] });
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = box.w && box.h ? Math.min(box.w / compWidth, box.h / compHeight) : 0;
  const offX = (box.w - compWidth * scale) / 2;
  const offY = (box.h - compHeight * scale) / 2;
  const sx = (x: number) => offX + x * scale;
  const sy = (y: number) => offY + y * scale;

  const layers = (scene.layers ?? []).filter((l) => !l.hidden && !l.locked && l.type !== "audio");

  const layerRect = (l: Layer) => ({
    x: evalNumber(l.transform.x, frame),
    y: evalNumber(l.transform.y, frame),
    w: l.width,
    h: l.height,
    rot: evalNumber(l.transform.rotation, frame),
  });

  const computeSnap = (x: number, y: number, w: number, h: number, exclude: Set<string>) => {
    const th = 6 / (scale || 1);
    const vTargets = [0, compWidth / 2, compWidth];
    const hTargets = [0, compHeight / 2, compHeight];
    for (const l of scene.layers ?? []) {
      if (exclude.has(l.id) || l.hidden || l.type === "audio") continue;
      const lx = evalNumber(l.transform.x, frame);
      const ly = evalNumber(l.transform.y, frame);
      vTargets.push(lx, lx + l.width / 2, lx + l.width);
      hTargets.push(ly, ly + l.height / 2, ly + l.height);
    }
    const snapAxis = (lines: number[], targets: number[], base: number) => {
      let bestDelta = th;
      let bestBase: number | null = null;
      let guide: number | null = null;
      for (const ln of lines) for (const t of targets) {
        const d = Math.abs(ln - t);
        if (d < bestDelta) { bestDelta = d; bestBase = base + (t - ln); guide = t; }
      }
      return { base: bestBase, guide };
    };
    const vx = snapAxis([x, x + w / 2, x + w], vTargets, x);
    const hy = snapAxis([y, y + h / 2, y + h], hTargets, y);
    return { x: vx.base ?? x, y: hy.base ?? y, guides: { vx: vx.guide != null ? [vx.guide] : [], hy: hy.guide != null ? [hy.guide] : [] } };
  };

  // ---- pointer state ----
  const drag = useRef<{ ids: string[]; primaryId: string; starts: Record<string, { ox: number; oy: number }>; startX: number; startY: number; moved: boolean } | null>(null);
  const resize = useRef<
    | { id: string; hx: number; hy: number; rot: number; sx0: number; sy0: number; box: { x: number; y: number; w: number; h: number }; ratio: number | null; moved: boolean }
    | null
  >(null);
  const rotate = useRef<{ id: string; cx: number; cy: number; start: number; base: number; moved: boolean } | null>(null);
  const marquee = useRef<{ startX: number; startY: number; additive: boolean; moved: boolean } | null>(null);

  const onLayerPointerDown = (e: React.PointerEvent, l: Layer) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    if (additive) { onSelect(l.id, true); return; }
    const ids = selectedIds.includes(l.id) ? selectedIds : [l.id];
    if (!selectedIds.includes(l.id)) onSelect(l.id, false);
    const starts: Record<string, { ox: number; oy: number }> = {};
    for (const id of ids) {
      const ll = (scene.layers ?? []).find((x) => x.id === id);
      if (ll) starts[id] = { ox: evalNumber(ll.transform.x, frame), oy: evalNumber(ll.transform.y, frame) };
    }
    drag.current = { ids, primaryId: l.id, starts, startX: e.clientX, startY: e.clientY, moved: false };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onHandlePointerDown = (e: React.PointerEvent, l: Layer, dir: ResizeDir) => {
    e.stopPropagation();
    const r = layerRect(l);
    const ratio = l.type === "image" && l.height ? l.width / l.height : null;
    const hx = dir.includes("e") ? 1 : dir.includes("w") ? 0 : 0.5;
    const hy = dir.includes("s") ? 1 : dir.includes("n") ? 0 : 0.5;
    resize.current = { id: l.id, hx, hy, rot: r.rot, sx0: e.clientX, sy0: e.clientY, box: { x: r.x, y: r.y, w: r.w, h: r.h }, ratio, moved: false };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onRotatePointerDown = (e: React.PointerEvent, l: Layer) => {
    e.stopPropagation();
    const r = layerRect(l);
    const root = rootRef.current!.getBoundingClientRect();
    const cx = root.left + sx(r.x + r.w / 2);
    const cy = root.top + sy(r.y + r.h / 2);
    rotate.current = { id: l.id, cx, cy, start: Math.atan2(e.clientY - cy, e.clientX - cx), base: r.rot, moved: false };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onRootPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    marquee.current = { startX: e.clientX, startY: e.clientY, additive: e.shiftKey || e.ctrlKey || e.metaKey, moved: false };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (drag.current) {
      const d = drag.current;
      const dx = (e.clientX - d.startX) / scale;
      const dy = (e.clientY - d.startY) / scale;
      if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD) return;
      d.moved = true;
      const prim = d.starts[d.primaryId];
      let ax = dx;
      let ay = dy;
      const pl = (scene.layers ?? []).find((x) => x.id === d.primaryId);
      if (prim && pl && !e.altKey) {
        const s = computeSnap(prim.ox + dx, prim.oy + dy, pl.width, pl.height, new Set(d.ids));
        ax = s.x - prim.ox;
        ay = s.y - prim.oy;
        setGuides(s.guides);
      } else setGuides({ vx: [], hy: [] });
      for (const id of d.ids) {
        const st = d.starts[id];
        if (st) onChange(id, { x: Math.round(st.ox + ax), y: Math.round(st.oy + ay) });
      }
    } else if (resize.current) {
      const r = resize.current;
      const dxs = (e.clientX - r.sx0) / scale;
      const dys = (e.clientY - r.sy0) / scale;
      if (!r.moved && Math.hypot(e.clientX - r.sx0, e.clientY - r.sy0) < DRAG_THRESHOLD) return;
      r.moved = true;
      const th = (r.rot * Math.PI) / 180;
      const cos = Math.cos(th);
      const sin = Math.sin(th);
      const ldx = dxs * cos + dys * sin;
      const ldy = -dxs * sin + dys * cos;
      let w = r.box.w;
      let h = r.box.h;
      if (r.hx === 1) w = r.box.w + ldx;
      else if (r.hx === 0) w = r.box.w - ldx;
      if (r.hy === 1) h = r.box.h + ldy;
      else if (r.hy === 0) h = r.box.h - ldy;
      w = Math.max(8, w);
      h = Math.max(8, h);
      if (r.ratio && r.hx !== 0.5 && r.hy !== 0.5) h = w / r.ratio;
      const ax = 1 - r.hx;
      const ay = 1 - r.hy;
      const c0x = r.box.x + r.box.w / 2;
      const c0y = r.box.y + r.box.h / 2;
      const oax = (ax - 0.5) * r.box.w;
      const oay = (ay - 0.5) * r.box.h;
      const worldAx = c0x + (oax * cos - oay * sin);
      const worldAy = c0y + (oax * sin + oay * cos);
      const nax = (ax - 0.5) * w;
      const nay = (ay - 0.5) * h;
      const c1x = worldAx - (nax * cos - nay * sin);
      const c1y = worldAy - (nax * sin + nay * cos);
      onChange(r.id, { x: Math.round(c1x - w / 2), y: Math.round(c1y - h / 2), width: Math.round(w), height: Math.round(h) });
    } else if (rotate.current) {
      const r = rotate.current;
      const ang = Math.atan2(e.clientY - r.cy, e.clientX - r.cx);
      let deg = r.base + ((ang - r.start) * 180) / Math.PI;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      r.moved = true;
      onChange(r.id, { rotation: Math.round(deg) });
    } else if (marquee.current) {
      const m = marquee.current;
      if (!m.moved && Math.hypot(e.clientX - m.startX, e.clientY - m.startY) < DRAG_THRESHOLD) return;
      m.moved = true;
      const root = rootRef.current!.getBoundingClientRect();
      const x0 = Math.min(m.startX, e.clientX) - root.left;
      const y0 = Math.min(m.startY, e.clientY) - root.top;
      setMarqueeRect({ x: x0, y: y0, w: Math.abs(e.clientX - m.startX), h: Math.abs(e.clientY - m.startY) });
    }
  };

  const endPointer = () => {
    if (marquee.current) {
      const m = marquee.current;
      if (!m.moved) {
        onSelect(null, false); // empty click deselects
      } else if (marqueeRect) {
        // convert marquee (screen) -> comp space, select intersecting layers
        const mx = (marqueeRect.x - offX) / scale;
        const my = (marqueeRect.y - offY) / scale;
        const mw = marqueeRect.w / scale;
        const mh = marqueeRect.h / scale;
        const ids = layers
          .filter((l) => {
            const r = layerRect(l);
            return r.x < mx + mw && r.x + r.w > mx && r.y < my + mh && r.y + r.h > my;
          })
          .map((l) => l.id);
        onMarquee(ids, m.additive);
      }
    }
    const moved = drag.current?.moved || resize.current?.moved || rotate.current?.moved;
    drag.current = null;
    resize.current = null;
    rotate.current = null;
    marquee.current = null;
    setGuides({ vx: [], hy: [] });
    setMarqueeRect(null);
    if (moved) onCommit();
  };

  const selectedSet = new Set(selectedIds);
  const single = selectedIds.length === 1 ? layers.find((l) => l.id === selectedIds[0]) ?? null : null;
  const handleSize = 10;

  return (
    <div
      ref={rootRef}
      className="absolute inset-0"
      style={{ touchAction: "none" }}
      onPointerDown={onRootPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      {/* snap guide lines */}
      {guides.vx.map((vx, i) => (
        <div key={`v${i}`} className="pointer-events-none absolute bg-fuchsia-500" style={{ left: sx(vx), top: sy(0), width: 1, height: compHeight * scale }} />
      ))}
      {guides.hy.map((hy, i) => (
        <div key={`h${i}`} className="pointer-events-none absolute bg-fuchsia-500" style={{ left: sx(0), top: sy(hy), height: 1, width: compWidth * scale }} />
      ))}

      {/* per-layer hit areas + selection outlines */}
      {layers.map((l) => {
        const r = layerRect(l);
        const sel = selectedSet.has(l.id);
        return (
          <div
            key={l.id}
            onPointerDown={(e) => onLayerPointerDown(e, l)}
            onDoubleClick={(e) => { if (l.type === "text" && onTextChange) { e.stopPropagation(); onSelect(l.id, false); setEditingId(l.id); } }}
            style={{
              position: "absolute",
              left: sx(r.x),
              top: sy(r.y),
              width: r.w * scale,
              height: r.h * scale,
              transform: `rotate(${r.rot}deg)`,
              transformOrigin: "center center",
              cursor: "move",
              outline: sel ? "1.5px solid #6366f1" : "none",
            }}
          />
        );
      })}

      {/* inline text editor (double-click a text layer) */}
      {editingId && onTextChange && (() => {
        const l = layers.find((x) => x.id === editingId);
        if (!l || l.type !== "text") return null;
        const r = layerRect(l);
        const fontSize = evalNumber(l.fontSize, frame) * scale;
        return (
          <textarea
            autoFocus
            value={l.text}
            onChange={(e) => onTextChange(l.id, e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={() => { setEditingId(null); onCommit(); }}
            onKeyDown={(e) => { if (e.key === "Escape") (e.target as HTMLTextAreaElement).blur(); }}
            style={{
              position: "absolute",
              left: sx(r.x),
              top: sy(r.y),
              width: r.w * scale,
              height: r.h * scale,
              transform: `rotate(${r.rot}deg)`,
              transformOrigin: "center center",
              fontFamily: l.fontFamily,
              fontWeight: l.weight as React.CSSProperties["fontWeight"],
              fontSize,
              lineHeight: l.lineHeight,
              letterSpacing: l.letterSpacing * scale,
              color: evalColor(l.color, frame),
              textAlign: l.align,
              background: "transparent",
              border: "1.5px dashed #6366f1",
              outline: "none",
              resize: "none",
              padding: 0,
              margin: 0,
              overflow: "hidden",
              caretColor: "#6366f1",
            }}
          />
        );
      })()}

      {/* resize/rotate handles only when exactly one layer is selected */}
      {single &&
        (() => {
          const r = layerRect(single);
          return (
            <div
              style={{
                position: "absolute",
                left: sx(r.x),
                top: sy(r.y),
                width: r.w * scale,
                height: r.h * scale,
                transform: `rotate(${r.rot}deg)`,
                transformOrigin: "center center",
                pointerEvents: "none",
              }}
            >
              <div
                onPointerDown={(e) => onRotatePointerDown(e, single)}
                style={{ position: "absolute", left: "50%", top: -28, width: handleSize, height: handleSize, marginLeft: -handleSize / 2, borderRadius: "50%", background: "#6366f1", border: "2px solid #fff", cursor: "grab", pointerEvents: "auto" }}
              />
              <div style={{ position: "absolute", left: "50%", top: -18, width: 1, height: 18, background: "#6366f1" }} />
              {HANDLES.map((hd) => (
                <div
                  key={hd.dir}
                  onPointerDown={(e) => onHandlePointerDown(e, single, hd.dir)}
                  style={{ position: "absolute", left: `calc(${hd.cx * 100}% - ${handleSize / 2}px)`, top: `calc(${hd.cy * 100}% - ${handleSize / 2}px)`, width: handleSize, height: handleSize, background: "#fff", border: "1.5px solid #6366f1", borderRadius: 2, cursor: hd.cursor, pointerEvents: "auto" }}
                />
              ))}
            </div>
          );
        })()}

      {/* marquee box */}
      {marqueeRect && (
        <div className="pointer-events-none absolute border border-primary bg-primary/10" style={{ left: marqueeRect.x, top: marqueeRect.y, width: marqueeRect.w, height: marqueeRect.h }} />
      )}
    </div>
  );
};

export default EditOverlay;
