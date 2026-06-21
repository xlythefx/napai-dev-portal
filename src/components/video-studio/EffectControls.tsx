// After-Effects-style "Effect Controls": per-property keyframe lanes for the
// SELECTED CLIP, in clip-local frames. Lifted from the old KeyframeTimeline lanes;
// the multi-track Timeline no longer shows keyframes. Lives in the left panel.

import React, { useEffect, useRef, useState } from "react";
import { Diamond } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { KEYFRAMABLE_PROPS, getAnimatable, getKeyframes, EASINGS, type Easing, type KeyProp } from "@/lib/remotion/layers";
import type { Clip } from "@/lib/remotion/types";

const ROW_H = 22;
const LABEL_W = 64;

interface EffectControlsProps {
  clip: Clip | null;
  fps: number;
  localFrame: number; // clip-local playhead
  autoKeyframe: boolean;
  onToggleAutoKeyframe: () => void;
  onScrubLocal: (localFrame: number) => void;
  onAddKeyframe: (key: string, frame: number) => void;
  onMoveKeyframe: (key: string, from: number, to: number) => void;
  onDeleteKeyframe: (key: string, frame: number) => void;
  onSetEasing: (key: string, frame: number, easing: Easing) => void;
}

type Op = { type: "scrub" } | { type: "kf"; key: string; frame: number };

const EffectControls: React.FC<EffectControlsProps> = ({
  clip, fps, localFrame, autoKeyframe, onToggleAutoKeyframe, onScrubLocal,
  onAddKeyframe, onMoveKeyframe, onDeleteKeyframe, onSetEasing,
}) => {
  const laneWrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const op = useRef<Op | null>(null);

  useEffect(() => {
    const el = laneWrapRef.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!clip) {
    return <div className="px-3 py-4 text-[11px] text-muted-foreground">Select a clip to edit its animation.</div>;
  }

  const dur = Math.max(1, clip.durationInFrames);
  const pxPerFrame = w > 0 ? w / dur : 1;
  const frameToX = (f: number) => f * pxPerFrame;
  const xToFrame = (x: number) => Math.max(0, Math.min(dur, Math.round(x / Math.max(0.0001, pxPerFrame))));
  const localX = (clientX: number) => {
    const r = laneWrapRef.current?.getBoundingClientRect();
    return r ? clientX - r.left : 0;
  };

  const props = KEYFRAMABLE_PROPS(clip.layer);

  const onMove = (e: React.PointerEvent) => {
    const o = op.current;
    if (!o) return;
    const f = xToFrame(localX(e.clientX));
    if (o.type === "scrub") onScrubLocal(f);
    else if (o.type === "kf" && f !== o.frame) { onMoveKeyframe(o.key, o.frame, f); o.frame = f; }
  };
  const endOp = () => { op.current = null; };

  return (
    <div className="flex flex-col border-t border-border">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Effect Controls</span>
        <button
          type="button"
          onClick={onToggleAutoKeyframe}
          className={`ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${autoKeyframe ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}
          title="Auto-keyframe: edits set a keyframe at the playhead"
        >
          <Diamond className={`h-3 w-3 ${autoKeyframe ? "fill-current" : ""}`} /> Auto-key
        </button>
      </div>

      <div className="flex">
        {/* labels */}
        <div className="shrink-0" style={{ width: LABEL_W }}>
          <div style={{ height: ROW_H }} />
          {props.map((p: KeyProp) => (
            <div key={p.key} className="flex items-center px-2 text-[10px] text-muted-foreground" style={{ height: ROW_H }}>
              {p.label}
            </div>
          ))}
        </div>

        {/* lanes */}
        <div
          ref={laneWrapRef}
          className="relative flex-1 select-none"
          style={{ touchAction: "none" }}
          onPointerMove={onMove}
          onPointerUp={endOp}
          onPointerLeave={endOp}
        >
          {/* mini ruler / scrub */}
          <div
            className="relative border-b border-border"
            style={{ height: ROW_H }}
            onPointerDown={(e) => { op.current = { type: "scrub" }; onScrubLocal(xToFrame(localX(e.clientX))); (e.currentTarget as Element).setPointerCapture?.(e.pointerId); }}
            title="Drag to scrub within the clip"
          >
            <span className="absolute left-1 top-0.5 text-[8px] text-muted-foreground">0s</span>
            <span className="absolute right-1 top-0.5 text-[8px] text-muted-foreground">{(dur / fps).toFixed(1)}s</span>
          </div>

          {props.map((prop) => {
            const kfs = getKeyframes(getAnimatable(clip.layer, prop.key) ?? 0);
            return (
              <div
                key={prop.key}
                className="relative border-b border-border/30 bg-muted/20"
                style={{ height: ROW_H }}
                onDoubleClick={(e) => onAddKeyframe(prop.key, xToFrame(localX(e.clientX)))}
                title="Double-click to add a keyframe"
              >
                {kfs.map((k) => (
                  <ContextMenu key={k.frame}>
                    <ContextMenuTrigger asChild>
                      <div
                        onPointerDown={(e) => { e.stopPropagation(); op.current = { type: "kf", key: prop.key, frame: k.frame }; (e.currentTarget as Element).setPointerCapture?.(e.pointerId); }}
                        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 cursor-pointer border border-white bg-primary"
                        style={{ left: frameToX(k.frame) }}
                        title={`frame ${k.frame} · ${k.easing}`}
                      />
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-40">
                      <ContextMenuItem onClick={() => onDeleteKeyframe(prop.key, k.frame)}>Delete keyframe</ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuSub>
                        <ContextMenuSubTrigger>Easing — {k.easing}</ContextMenuSubTrigger>
                        <ContextMenuSubContent>
                          {EASINGS.map((es) => (
                            <ContextMenuItem key={es} onClick={() => onSetEasing(prop.key, k.frame, es)}>{es}</ContextMenuItem>
                          ))}
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            );
          })}

          {/* playhead */}
          <div className="pointer-events-none absolute bottom-0 z-10 w-px bg-red-500" style={{ left: frameToX(localFrame), top: 0 }} />
        </div>
      </div>
    </div>
  );
};

export default EffectControls;
