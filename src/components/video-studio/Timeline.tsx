// Premiere-style multi-track timeline (v3, flat global frames). Rows = tracks;
// clips are draggable rectangles (move in time, trim edges, drag across same-kind
// tracks). Ruler scrubs the global playhead and holds section markers. Right-click
// a clip for duplicate/delete/ripple/hide-lock/z-order/split/apply-preset. Accepts
// drops of templates (→ new component clip) and presets (→ apply to a clip).
// Reuses the EditOverlay/KeyframeTimeline pointer pattern (refs + single move/up).

import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Trash2,
  Type,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  Square,
  Box,
  Flag,
  Layers,
} from "lucide-react";
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
import { ANIMATION_PRESETS } from "@/lib/remotion/animationPresets";
import type { Clip, Section, Track, TrackKind } from "@/lib/remotion/types";
import type { Layer } from "@/lib/remotion/layers";

const RULER_H = 24;
const TRACK_H = 46;
const GUTTER_W = 150;
const CLIP_PAD = 7; // vertical inset of a clip within its lane

interface TimelineProps {
  tracks: Track[];
  clips: Clip[];
  sections: Section[];
  fps: number;
  frame: number; // global playhead
  durationInFrames: number;
  selectedClipIds: string[];
  snapping: boolean;
  configuring?: boolean; // AI is applying edits — animate clips into place
  onSelectClips: (ids: string[], additive: boolean) => void;
  onScrub: (frame: number) => void;
  onMoveClip: (clipId: string, startFrame: number, trackId?: string) => void;
  onTrimClip: (clipId: string, startFrame: number, durationInFrames: number) => void;
  onCommitClip: (clipId: string) => void;
  onSplitClip: (clipId: string) => void;
  onDuplicateClip: (clipId: string) => void;
  onDeleteClip: (clipId: string) => void;
  onRippleDelete: (clipId: string) => void;
  onToggleClipHidden: (clipId: string) => void;
  onToggleClipLocked: (clipId: string) => void;
  onBringForward: (clipId: string) => void;
  onSendBackward: (clipId: string) => void;
  onAddTrack: (kind: TrackKind) => void;
  onDeleteTrack: (trackId: string) => void;
  onRenameTrack: (trackId: string, name: string) => void;
  onAutoArrange: () => void;
  onToggleTrackHidden: (trackId: string) => void;
  onToggleTrackLocked: (trackId: string) => void;
  onToggleTrackMuted: (trackId: string) => void;
  onAddSection: (frame: number) => void;
  onMoveSection: (id: string, frame: number) => void;
  onRenameSection: (id: string, name: string) => void;
  onDeleteSection: (id: string) => void;
  onSaveSectionAsPreset: (id: string) => void;
  onDropTemplate: (templateId: string, trackId: string, frame: number) => void;
  onDropAsset?: (url: string, kind: "image" | "video", trackId: string, frame: number) => void;
  onApplyPreset: (clipId: string, presetId: string) => void;
}

type Op =
  | { type: "scrub" }
  | { type: "move"; clipId: string; ids: string[]; starts: Record<string, number>; startX: number; moved: boolean }
  | { type: "trim"; clipId: string; edge: "start" | "end"; origStart: number; origDur: number }
  | { type: "section"; id: string };

const layerIcon = (l: Layer) => {
  switch (l.type) {
    case "text": return <Type className="h-3 w-3" />;
    case "image": return <ImageIcon className="h-3 w-3" />;
    case "video": return <VideoIcon className="h-3 w-3" />;
    case "audio": return <Music className="h-3 w-3" />;
    case "shape": return <Square className="h-3 w-3" />;
    default: return <Box className="h-3 w-3" />;
  }
};

const clipKind = (clip: Clip): TrackKind => (clip.layer.type === "audio" ? "audio" : "video");

const Timeline: React.FC<TimelineProps> = (props) => {
  const {
    tracks, clips, sections, fps, frame, durationInFrames, selectedClipIds, snapping, configuring,
    onSelectClips, onScrub, onMoveClip, onTrimClip, onCommitClip, onSplitClip, onDuplicateClip, onDeleteClip,
    onRippleDelete, onToggleClipHidden, onToggleClipLocked, onBringForward, onSendBackward,
    onAddTrack, onDeleteTrack, onRenameTrack, onAutoArrange, onToggleTrackHidden, onToggleTrackLocked,
    onToggleTrackMuted, onAddSection, onMoveSection, onRenameSection, onDeleteSection,
    onSaveSectionAsPreset, onDropTemplate, onDropAsset, onApplyPreset,
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [zoom, setZoom] = useState(1);
  const op = useRef<Op | null>(null);
  const [dragging, setDragging] = useState(false); // suppress clip CSS transitions mid-drag
  const [editing, setEditing] = useState<{ type: "track" | "section"; id: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dur = Math.max(1, durationInFrames);
  const pxPerFrame = (w > 0 ? w / dur : 1) * zoom; // zoom=1 fits whole project to width
  const contentW = dur * pxPerFrame;
  const frameToX = (f: number) => f * pxPerFrame;
  const xToFrame = (x: number) => Math.max(0, Math.min(dur, Math.round(x / Math.max(0.0001, pxPerFrame))));
  const localX = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    return r ? clientX - r.left : 0;
  };
  const trackIndexAtY = (clientY: number) => {
    const r = lanesRef.current?.getBoundingClientRect();
    if (!r) return -1;
    return Math.max(0, Math.min(tracks.length - 1, Math.floor((clientY - r.top) / TRACK_H)));
  };

  // keep playhead in view
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const px = frameToX(frame);
    if (px < sc.scrollLeft + 24) sc.scrollLeft = Math.max(0, px - 24);
    else if (px > sc.scrollLeft + sc.clientWidth - 24) sc.scrollLeft = px - sc.clientWidth + 24;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, pxPerFrame]);

  const trackOf = (id: string) => tracks.find((t) => t.id === id);
  const clipOf = (id: string) => clips.find((c) => c.id === id);

  // ---- snapping ----
  const snapCandidates = (excludeId: string): number[] => {
    const c = new Set<number>([frame]);
    for (const s of sections) c.add(s.startFrame);
    for (const cl of clips) {
      if (cl.id === excludeId) continue;
      c.add(cl.startFrame);
      c.add(cl.startFrame + cl.durationInFrames);
    }
    return [...c];
  };
  const snapEdge = (f: number, excludeId: string, alt: boolean): number => {
    if (alt || !snapping) return f;
    const th = 8 / Math.max(0.0001, pxPerFrame);
    let best = f;
    let bestD = th;
    for (const cand of snapCandidates(excludeId)) {
      const d = Math.abs(cand - f);
      if (d < bestD) { bestD = d; best = cand; }
    }
    return Math.round(best);
  };
  const snapMove = (proposedStart: number, clipDur: number, excludeId: string, alt: boolean): number => {
    if (alt || !snapping) return Math.max(0, proposedStart);
    const th = 8 / Math.max(0.0001, pxPerFrame);
    let best = proposedStart;
    let bestD = th;
    for (const cand of snapCandidates(excludeId)) {
      for (const edge of [proposedStart, proposedStart + clipDur]) {
        const d = Math.abs(cand - edge);
        if (d < bestD) { bestD = d; best = proposedStart + (cand - edge); }
      }
    }
    return Math.max(0, Math.round(best));
  };

  // ---- pointer handlers ----
  const onMove = (e: React.PointerEvent) => {
    const o = op.current;
    if (!o) return;
    if (o.type === "scrub") { onScrub(xToFrame(localX(e.clientX))); return; }
    if (o.type === "section") { onMoveSection(o.id, xToFrame(localX(e.clientX))); return; }
    if (o.type === "trim") {
      const f = snapEdge(xToFrame(localX(e.clientX)), o.clipId, e.altKey);
      if (o.edge === "start") {
        const ns = Math.max(0, Math.min(f, o.origStart + o.origDur - 1));
        onTrimClip(o.clipId, ns, o.origStart + o.origDur - ns);
      } else {
        const ne = Math.max(o.origStart + 1, f);
        onTrimClip(o.clipId, o.origStart, ne - o.origStart);
      }
      return;
    }
    if (o.type === "move") {
      o.moved = true;
      const deltaFrame = Math.round((e.clientX - o.startX) / Math.max(0.0001, pxPerFrame));
      if (o.ids.length === 1) {
        const clip = clipOf(o.clipId);
        if (!clip) return;
        const ns = snapMove((o.starts[o.clipId] ?? 0) + deltaFrame, clip.durationInFrames, o.clipId, e.altKey);
        const ti = trackIndexAtY(e.clientY);
        const target = tracks[ti];
        const sameKind = target && target.kind === clipKind(clip) && !target.locked;
        onMoveClip(o.clipId, ns, sameKind ? target.id : undefined);
      } else {
        for (const id of o.ids) onMoveClip(id, Math.max(0, (o.starts[id] ?? 0) + deltaFrame));
      }
    }
  };
  const endOp = () => {
    const o = op.current;
    op.current = null;
    setDragging(false);
    // After a move/trim settles, let the editor push the clip to its own row if
    // it now overlaps another clip on the same track (Premiere-style stacking).
    if (o && (o.type === "move" || o.type === "trim")) onCommitClip(o.clipId);
  };

  const startScrub = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // let right-click open context menus instead of scrubbing
    op.current = { type: "scrub" };
    onScrub(xToFrame(localX(e.clientX)));
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  const startMove = (e: React.PointerEvent, clip: Clip) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (trackOf(clip.trackId)?.locked) return;
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    if (additive) { onSelectClips([clip.id], true); return; }
    const ids = selectedClipIds.includes(clip.id) ? selectedClipIds : [clip.id];
    if (!selectedClipIds.includes(clip.id)) onSelectClips([clip.id], false);
    const starts: Record<string, number> = {};
    for (const id of ids) { const c = clipOf(id); if (c) starts[id] = c.startFrame; }
    op.current = { type: "move", clipId: clip.id, ids, starts, startX: e.clientX, moved: false };
    setDragging(true);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  const startTrim = (e: React.PointerEvent, clip: Clip, edge: "start" | "end") => {
    e.stopPropagation();
    if (trackOf(clip.trackId)?.locked) return;
    op.current = { type: "trim", clipId: clip.id, edge, origStart: clip.startFrame, origDur: clip.durationInFrames };
    setDragging(true);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  // ---- drops (template → new clip, preset → apply) ----
  const onLaneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = xToFrame(localX(e.clientX));
    const ti = trackIndexAtY(e.clientY);
    const presetId = e.dataTransfer.getData("presetId");
    if (presetId) {
      const hit = clips.find((c) => tracks[ti]?.id === c.trackId && f >= c.startFrame && f < c.startFrame + c.durationInFrames)
        ?? clips.find((c) => f >= c.startFrame && f < c.startFrame + c.durationInFrames);
      if (hit) onApplyPreset(hit.id, presetId);
      return;
    }
    const assetUrl = e.dataTransfer.getData("assetUrl");
    if (assetUrl) {
      const kind = (e.dataTransfer.getData("assetKind") as "image" | "video") || "image";
      const target = tracks[ti]?.kind === "video" ? tracks[ti] : tracks.find((t) => t.kind === "video");
      if (target) onDropAsset?.(assetUrl, kind, target.id, f);
      return;
    }
    const templateId = e.dataTransfer.getData("templateId");
    if (templateId) {
      const target = tracks[ti]?.kind === "video" ? tracks[ti] : tracks.find((t) => t.kind === "video");
      if (target) onDropTemplate(templateId, target.id, f);
    }
  };

  const commitEdit = () => {
    if (!editing) return;
    const v = editValue.trim();
    if (v) {
      if (editing.type === "track") onRenameTrack(editing.id, v);
      else onRenameSection(editing.id, v);
    }
    setEditing(null);
  };

  // ruler ticks every second
  const ticks: number[] = [];
  for (let f = 0; f <= dur; f += fps) ticks.push(f);

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* header */}
      <div className="flex items-center gap-2 border-b border-border px-2 py-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</span>
        {configuring && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary" /> Configuring…
          </span>
        )}
        <button type="button" onClick={() => onAddTrack("video")} className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted">
          <Plus className="h-3 w-3" /> Video
        </button>
        <button type="button" onClick={() => onAddTrack("audio")} className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted">
          <Plus className="h-3 w-3" /> Audio
        </button>
        <button type="button" onClick={onAutoArrange} className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted" title="Stack overlapping clips onto separate tracks">
          <Layers className="h-3 w-3" /> Auto-arrange
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => setZoom((z) => Math.max(0.25, z / 1.5))} className="rounded border border-border px-1.5 text-xs leading-5 text-muted-foreground hover:bg-muted" title="Zoom out">−</button>
          <span className="w-9 text-center text-[10px] tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((z) => Math.min(16, z * 1.5))} className="rounded border border-border px-1.5 text-xs leading-5 text-muted-foreground hover:bg-muted" title="Zoom in">+</button>
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground">frame {frame} / {dur} · {(frame / fps).toFixed(2)}s</span>
      </div>

      {/* body */}
      <div className="flex min-h-0 flex-1">
        {/* gutter */}
        <div className="shrink-0 overflow-hidden border-r border-border" style={{ width: GUTTER_W }}>
          <div style={{ height: RULER_H }} className="border-b border-border" />
          {tracks.map((t) => (
            <div key={t.id} className="flex items-center gap-1 border-b border-border/50 px-1.5" style={{ height: TRACK_H }}>
              {editing?.type === "track" && editing.id === t.id ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }}
                  className="w-16 rounded border border-border bg-background px-1 text-[11px]"
                />
              ) : (
                <span
                  className="flex-1 cursor-text truncate text-[11px] font-medium"
                  onDoubleClick={() => { setEditing({ type: "track", id: t.id }); setEditValue(t.name); }}
                  title="Double-click to rename"
                >
                  {t.name}
                </span>
              )}
              {t.kind === "video" ? (
                <button type="button" onClick={() => onToggleTrackHidden(t.id)} className="rounded p-0.5 text-muted-foreground hover:bg-muted" title={t.hidden ? "Show" : "Hide"}>
                  {t.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              ) : (
                <button type="button" onClick={() => onToggleTrackMuted(t.id)} className="rounded p-0.5 text-muted-foreground hover:bg-muted" title={t.muted ? "Unmute" : "Mute"}>
                  {t.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
              )}
              <button type="button" onClick={() => onToggleTrackLocked(t.id)} className="rounded p-0.5 text-muted-foreground hover:bg-muted" title={t.locked ? "Unlock" : "Lock"}>
                {t.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </button>
              <button type="button" onClick={() => onDeleteTrack(t.id)} className="rounded p-0.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive" title="Delete track">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* track area */}
        <div
          ref={scrollRef}
          className="relative flex-1 select-none overflow-x-auto"
          style={{ touchAction: "none" }}
          onPointerMove={onMove}
          onPointerUp={endOp}
          onPointerLeave={endOp}
        >
          <div ref={trackRef} className="relative" style={{ width: contentW, minWidth: "100%" }}>
            {/* ruler + sections */}
            <div className="relative border-b border-border" style={{ height: RULER_H }} onPointerDown={startScrub} onDoubleClick={(e) => onAddSection(xToFrame(localX(e.clientX)))} title="Drag to scrub · double-click to add a section">
              {ticks.map((f) => (
                <div key={f} className="absolute top-0 h-full" style={{ left: frameToX(f) }}>
                  <div className="h-1.5 w-px bg-border" />
                  <span className="absolute left-1 top-0 text-[8px] text-muted-foreground">{(f / fps).toFixed(0)}s</span>
                </div>
              ))}
              {sections.map((s) => (
                <ContextMenu key={s.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      className="absolute bottom-0 top-0 z-10 flex items-center"
                      style={{ left: frameToX(s.startFrame) }}
                      onPointerDown={(e) => { if (e.button !== 0) return; e.stopPropagation(); op.current = { type: "section", id: s.id }; (e.currentTarget as Element).setPointerCapture?.(e.pointerId); }}
                    >
                      <div className="h-full w-px bg-amber-500" />
                      {editing?.type === "section" && editing.id === s.id ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onPointerDown={(e) => e.stopPropagation()}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }}
                          className="ml-0.5 w-20 rounded border border-border bg-background px-1 text-[9px]"
                        />
                      ) : (
                        <span className="ml-0.5 flex cursor-grab items-center gap-0.5 rounded bg-amber-500/15 px-1 text-[9px] text-amber-600" onDoubleClick={() => { setEditing({ type: "section", id: s.id }); setEditValue(s.name); }}>
                          <Flag className="h-2.5 w-2.5" /> {s.name}
                        </span>
                      )}
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-36">
                    <ContextMenuItem onClick={() => { setEditing({ type: "section", id: s.id }); setEditValue(s.name); }}>Rename</ContextMenuItem>
                    <ContextMenuItem onClick={() => onSaveSectionAsPreset(s.id)}>Save as preset</ContextMenuItem>
                    <ContextMenuItem onClick={() => onDeleteSection(s.id)}>Delete</ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>

            {/* lanes + clips */}
            <div ref={lanesRef} className="relative" style={{ height: tracks.length * TRACK_H }} onDragOver={(e) => e.preventDefault()} onDrop={onLaneDrop}>
              {tracks.map((t, i) => (
                <div key={t.id} className={`absolute left-0 right-0 border-b border-border/40 ${i % 2 ? "bg-muted/10" : ""}`} style={{ top: i * TRACK_H, height: TRACK_H }} />
              ))}

              {clips.map((clip) => {
                const ti = tracks.findIndex((t) => t.id === clip.trackId);
                if (ti < 0) return null;
                const sel = selectedClipIds.includes(clip.id);
                const left = frameToX(clip.startFrame);
                const width = Math.max(6, frameToX(clip.durationInFrames));
                const isAudio = clip.layer.type === "audio";
                return (
                  <ContextMenu key={clip.id}>
                    <ContextMenuTrigger asChild>
                      <div
                        onPointerDown={(e) => startMove(e, clip)}
                        className={`absolute flex items-center overflow-hidden rounded-md border text-[10px] animate-in fade-in-0 zoom-in-95 ${
                          dragging ? "" : "transition-[left,top,width] duration-300 ease-out"
                        } ${sel ? "border-primary ring-1 ring-primary" : "border-border"} ${
                          isAudio ? "bg-emerald-500/25" : "bg-primary/25"
                        } ${clip.layer.hidden ? "opacity-40" : ""}`}
                        style={{ left, top: ti * TRACK_H + CLIP_PAD, width, height: TRACK_H - CLIP_PAD * 2, cursor: "grab" }}
                        title={clip.layer.name}
                      >
                        <div
                          onPointerDown={(e) => startTrim(e, clip, "start")}
                          className="absolute left-0 top-0 z-10 h-full w-1.5 cursor-ew-resize bg-foreground/20 hover:bg-primary"
                        />
                        <span className="pointer-events-none flex w-full items-center gap-1 truncate px-2 text-foreground/90">
                          {layerIcon(clip.layer)}
                          <span className="truncate">{clip.layer.name}</span>
                        </span>
                        <div
                          onPointerDown={(e) => startTrim(e, clip, "end")}
                          className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-ew-resize bg-foreground/20 hover:bg-primary"
                        />
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-44">
                      <ContextMenuItem onClick={() => onSplitClip(clip.id)}>Split at playhead</ContextMenuItem>
                      <ContextMenuItem onClick={() => onDuplicateClip(clip.id)}>Duplicate</ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => onBringForward(clip.id)}>Bring forward</ContextMenuItem>
                      <ContextMenuItem onClick={() => onSendBackward(clip.id)}>Send backward</ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => onToggleClipHidden(clip.id)}>{clip.layer.hidden ? "Show" : "Hide"}</ContextMenuItem>
                      <ContextMenuItem onClick={() => onToggleClipLocked(clip.id)}>{clip.layer.locked ? "Unlock" : "Lock"}</ContextMenuItem>
                      {!isAudio && (
                        <ContextMenuSub>
                          <ContextMenuSubTrigger>Apply preset</ContextMenuSubTrigger>
                          <ContextMenuSubContent>
                            {ANIMATION_PRESETS.map((p) => (
                              <ContextMenuItem key={p.id} onClick={() => onApplyPreset(clip.id, p.id)}>{p.label}</ContextMenuItem>
                            ))}
                          </ContextMenuSubContent>
                        </ContextMenuSub>
                      )}
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => onRippleDelete(clip.id)}>Ripple delete (close gap)</ContextMenuItem>
                      <ContextMenuItem className="text-destructive" onClick={() => onDeleteClip(clip.id)}>Delete</ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}

              {/* playhead */}
              <div className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-red-500" style={{ left: frameToX(frame) }}>
                <div className="absolute -left-1 top-0 h-2 w-2 rounded-sm bg-red-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
