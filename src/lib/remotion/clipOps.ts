// Editor-level clip operations that need both clip + keyframe helpers. Kept out
// of clips.ts to avoid a cycle (clips.ts ↔ migrateV3.ts). Pure functions over a
// clips array so they're easy to unit-test.

import type { Clip } from "./types";
import { shiftLayerKeyframes } from "./migrateV3";
import { uid, type Layer } from "./layers";

/** Split the clip at a GLOBAL frame into two clips. The right half's keyframes
 *  shift by -(cut) to stay clip-local (reuses the migration's shift). No-op if
 *  the frame is outside the clip. */
export function splitClipAt(clips: Clip[], clipId: string, frame: number): Clip[] {
  const idx = clips.findIndex((c) => c.id === clipId);
  if (idx < 0) return clips;
  const c = clips[idx];
  if (frame <= c.startFrame || frame >= c.startFrame + c.durationInFrames) return clips;
  const cut = frame - c.startFrame; // clip-local split point
  const leftLayer = JSON.parse(JSON.stringify(c.layer)) as Layer;
  const rightLayer = shiftLayerKeyframes(JSON.parse(JSON.stringify(c.layer)) as Layer, -cut);
  rightLayer.id = uid(c.layer.type);
  const left: Clip = { ...c, layer: leftLayer, durationInFrames: cut };
  const right: Clip = { ...c, id: uid("clip"), layer: rightLayer, startFrame: frame, durationInFrames: c.durationInFrames - cut };
  const next = [...clips];
  next.splice(idx, 1, left, right);
  return next;
}

/** Remove a clip and pull later clips on the SAME track left to close the gap. */
export function rippleDelete(clips: Clip[], clipId: string): Clip[] {
  const c = clips.find((x) => x.id === clipId);
  if (!c) return clips;
  const after = c.startFrame + c.durationInFrames;
  return clips
    .filter((x) => x.id !== clipId)
    .map((x) => (x.trackId === c.trackId && x.startFrame >= after ? { ...x, startFrame: Math.max(0, x.startFrame - c.durationInFrames) } : x));
}
