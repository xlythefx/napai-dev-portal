// Drag-on animation presets. Each preset writes keyframes onto one or more of a
// clip's animatable transform props, anchored to the clip's local range (so they
// follow the clip when it moves/trims). Pure module (layers + types only).
//
// Apply semantics (confirmed): REPLACE the targeted property — for each prop a
// preset touches, its existing keyframes are overwritten; untouched props are
// left as-is. A "fade in" only rewrites opacity, etc.

import type { Clip } from "./types";
import {
  getAnimatable,
  setAnimatableOnLayer,
  staticNumber,
  type Easing,
  type Layer,
} from "./layers";

/** One animated property of a preset.
 *  - mode "scaleBase": value is a multiple of the clip's current static value
 *    (e.g. opacity 0→1, scale 0.6→1) — keeps the resting value faithful.
 *  - mode "offset": value is added to the current static value, scaled by a
 *    reference dimension (the layer's width/height) — used for slides. */
export interface PresetTrack {
  key: "transform.opacity" | "transform.scale" | "transform.x" | "transform.y";
  mode: "scaleBase" | "offset";
  ref?: "w" | "h"; // offset mode: multiply value by layer width/height (default by axis)
  anchor: "start" | "end"; // place the window at the clip's start or end
  windowSec?: number; // window length in seconds (default 0.45)
  fullClip?: boolean; // window = the whole clip (e.g. Ken Burns)
  kfs: { at: number; value: number; easing?: Easing }[]; // `at` in [0,1] within the window
}

export interface AnimationPreset {
  id: string;
  label: string;
  group: "in" | "out" | "emphasis";
  hint?: string;
  tracks: PresetTrack[];
}

export const ANIMATION_PRESETS: AnimationPreset[] = [
  {
    id: "fadeIn",
    label: "Fade In",
    group: "in",
    hint: "opacity 0 → 1",
    tracks: [{ key: "transform.opacity", mode: "scaleBase", anchor: "start", kfs: [{ at: 0, value: 0 }, { at: 1, value: 1, easing: "easeOut" }] }],
  },
  {
    id: "fadeOut",
    label: "Fade Out",
    group: "out",
    hint: "opacity 1 → 0",
    tracks: [{ key: "transform.opacity", mode: "scaleBase", anchor: "end", kfs: [{ at: 0, value: 1 }, { at: 1, value: 0, easing: "easeIn" }] }],
  },
  {
    id: "slideInLeft",
    label: "Slide In Left",
    group: "in",
    hint: "from the left",
    tracks: [{ key: "transform.x", mode: "offset", ref: "w", anchor: "start", kfs: [{ at: 0, value: -1 }, { at: 1, value: 0, easing: "backOut" }] }],
  },
  {
    id: "slideInRight",
    label: "Slide In Right",
    group: "in",
    hint: "from the right",
    tracks: [{ key: "transform.x", mode: "offset", ref: "w", anchor: "start", kfs: [{ at: 0, value: 1 }, { at: 1, value: 0, easing: "backOut" }] }],
  },
  {
    id: "slideInUp",
    label: "Slide In Up",
    group: "in",
    hint: "rise into place",
    tracks: [{ key: "transform.y", mode: "offset", ref: "h", anchor: "start", kfs: [{ at: 0, value: 0.35 }, { at: 1, value: 0, easing: "backOut" }] }],
  },
  {
    id: "popIn",
    label: "Pop / Scale In",
    group: "in",
    hint: "scale 0.6 → 1",
    tracks: [
      { key: "transform.scale", mode: "scaleBase", anchor: "start", kfs: [{ at: 0, value: 0.6 }, { at: 1, value: 1, easing: "backOut" }] },
      { key: "transform.opacity", mode: "scaleBase", anchor: "start", kfs: [{ at: 0, value: 0 }, { at: 1, value: 1, easing: "easeOut" }] },
    ],
  },
  {
    id: "kenBurns",
    label: "Ken Burns",
    group: "emphasis",
    hint: "slow zoom in",
    tracks: [{ key: "transform.scale", mode: "scaleBase", anchor: "start", fullClip: true, kfs: [{ at: 0, value: 1 }, { at: 1, value: 1.12, easing: "linear" }] }],
  },
  {
    id: "pulse",
    label: "Pulse",
    group: "emphasis",
    hint: "scale bump",
    tracks: [{ key: "transform.scale", mode: "scaleBase", anchor: "start", windowSec: 0.6, kfs: [{ at: 0, value: 1 }, { at: 0.5, value: 1.08, easing: "easeInOut" }, { at: 1, value: 1, easing: "easeInOut" }] }],
  },
  {
    id: "slideOutDown",
    label: "Slide Out Down",
    group: "out",
    hint: "drop & fade",
    tracks: [
      { key: "transform.y", mode: "offset", ref: "h", anchor: "end", kfs: [{ at: 0, value: 0 }, { at: 1, value: 0.35, easing: "easeIn" }] },
      { key: "transform.opacity", mode: "scaleBase", anchor: "end", kfs: [{ at: 0, value: 1 }, { at: 1, value: 0, easing: "easeIn" }] },
    ],
  },
];

export function getPreset(id: string): AnimationPreset | undefined {
  return ANIMATION_PRESETS.find((p) => p.id === id);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Apply a preset to a clip, replacing keyframes on the props it targets. Audio
 *  clips (no meaningful transform) are returned unchanged. Immutable. */
export function applyPreset(clip: Clip, presetId: string, fps: number): Clip {
  const preset = getPreset(presetId);
  if (!preset || clip.layer.type === "audio") return clip;

  const dur = Math.max(1, clip.durationInFrames);
  const lastFrame = Math.max(0, dur - 1);
  let layer: Layer = clip.layer;

  for (const track of preset.tracks) {
    const base = staticNumber((getAnimatable(layer, track.key) as never) ?? 0);
    const win = track.fullClip ? dur : clamp(Math.round((track.windowSec ?? 0.45) * fps), 1, dur);
    const anchorStart = track.anchor === "start" ? 0 : dur - win;
    const refSize = track.ref === "h" ? layer.height : layer.width;

    const byFrame = new Map<number, { frame: number; value: number; easing: Easing }>();
    for (const k of track.kfs) {
      const frame = clamp(Math.round(anchorStart + k.at * win), 0, lastFrame);
      const value = track.mode === "scaleBase" ? k.value * base : base + k.value * refSize;
      byFrame.set(frame, { frame, value, easing: k.easing ?? "easeInOut" });
    }
    const keyframes = [...byFrame.values()].sort((a, b) => a.frame - b.frame);
    layer = setAnimatableOnLayer(layer, track.key, { keyframes });
  }

  return { ...clip, layer };
}
