// Migration between the legacy scene model (v2) and the flat-timeline model (v3).
//
//  - migrateToFlat(v2):   scenes[]  ->  tracks/clips/background/sections
//  - flattenToScenes(v3): clips     ->  scenes[]   (inverse, for the AI shim)
//
// The CRITICAL subtlety is the keyframe origin. In v2, a layer renders inside a
// per-SCENE <Sequence>, so its keyframes are SCENE-local. In v3, a clip renders
// inside a per-CLIP <Sequence from={globalStart}>, so its keyframes are
// CLIP-local. A layer windowed to start at scene-frame `localStart` becomes a
// clip whose local frame 0 == scene frame `localStart`; we therefore shift its
// keyframes by -localStart on the way in (and +localStart on the way out).

import type {
  BackgroundSegment,
  Clip,
  MediaRef,
  Project,
  Scene,
  Section,
  Template,
  Track,
} from "./types";
import {
  defaultBackground,
  evalNumber,
  getAnimatable,
  isAnimated,
  KEYFRAMABLE_PROPS,
  newComponentLayer,
  setAnimatableOnLayer,
  uid,
  type Easing,
  type Keyframe,
  type Layer,
} from "./layers";
import { clampedTransitionFrames, sceneStartFrame, totalDurationInFrames } from "./timing";
import { autoArrange, newClip, newTrack } from "./clips";

/** Loose shape of a stored/in-memory v2 project (only the fields migration reads). */
export type LegacyProject = {
  id?: string;
  name?: string;
  fps?: number;
  width?: number;
  height?: number;
  scenes?: Scene[];
  templates?: Template[];
  assets?: MediaRef[];
};

function isKeyframed(a: unknown): a is { keyframes: Keyframe<number | string>[] } {
  return typeof a === "object" && a !== null && Array.isArray((a as { keyframes?: unknown }).keyframes);
}

/** Shift every keyframe of every animatable prop on a layer by `delta` frames
 *  (clamped ≥ 0). Plain (un-keyframed) values pass through untouched. */
export function shiftLayerKeyframes(layer: Layer, delta: number): Layer {
  if (!delta) return layer;
  let out = layer;
  for (const kp of KEYFRAMABLE_PROPS(out)) {
    const a = getAnimatable(out, kp.key);
    if (!isKeyframed(a)) continue;
    const shifted = { keyframes: a.keyframes.map((k) => ({ ...k, frame: Math.max(0, k.frame + delta) })) };
    out = setAnimatableOnLayer(out, kp.key, shifted);
  }
  return out;
}

/** Apply a clip-local fade-in (opacity 0 → static) over `frames`. Skips audio
 *  and any layer whose opacity is already animated (so we never clobber). */
function applyFadeIn(layer: Layer, frames: number): Layer {
  if (frames <= 0 || layer.type === "audio") return layer;
  if (isAnimated(layer.transform.opacity)) return layer;
  const end = evalNumber(layer.transform.opacity, 0);
  const easing: Easing = "easeInOut";
  return setAnimatableOnLayer(layer, "transform.opacity", {
    keyframes: [
      { frame: 0, value: 0, easing },
      { frame: Math.max(1, Math.round(frames)), value: end, easing },
    ],
  });
}

/** A scene's layers — or, for an un-migrated legacy scene, a single full-frame
 *  ComponentLayer (mirrors VideoComposition.sceneLayers). */
function sceneLayers(scene: Scene, width: number, height: number): Layer[] {
  if (scene.layers !== undefined) return scene.layers;
  if (scene.templateId) return [newComponentLayer(width, height, scene.templateId, scene.props ?? {})];
  return [];
}

/**
 * Convert ONE scene's layers into placed clips at `sceneStart` (global frames),
 * plus its background segment. Each layer's scene-local window becomes the clip's
 * timing and its keyframes are shifted to clip-local (−localStart). Optionally
 * applies a fade-in (for a `fade` transition into this scene). Shared by
 * migrateToFlat (per scene) and the AI shim (apply a proposed/streamed scene).
 */
export function sceneToClips(
  scene: Scene,
  sceneStart: number,
  width: number,
  height: number,
  trackIds: { video: string; audio: string },
  fadeInFrames = 0
): { clips: Clip[]; bg: BackgroundSegment } {
  const sceneDur = Math.max(1, scene.durationInFrames);
  const clips: Clip[] = [];
  for (const layer of sceneLayers(scene, width, height)) {
    const localStart = layer.startFrame ?? 0;
    const localEnd = layer.endFrame ?? sceneDur;
    const clipDur = Math.max(1, localEnd - localStart);
    let payload: Layer = { ...layer, startFrame: undefined, endFrame: undefined };
    payload = shiftLayerKeyframes(payload, -localStart);
    if (fadeInFrames) payload = applyFadeIn(payload, fadeInFrames);
    const trackId = layer.type === "audio" ? trackIds.audio : trackIds.video;
    clips.push(newClip(payload, trackId, sceneStart + localStart, clipDur));
  }
  const bg: BackgroundSegment = {
    id: uid("bg"),
    startFrame: sceneStart,
    durationInFrames: sceneDur,
    background: scene.background ?? defaultBackground(),
  };
  return { clips, bg };
}

/**
 * Flatten a scene-based project onto a single video track (V1) + single audio
 * track (A1), then stack simultaneous clips onto separate video tracks
 * (Premiere-style) via autoArrange. z-order is preserved (scene-then-layer order).
 */
export function migrateToFlat(v2: LegacyProject): Project {
  const width = Number(v2.width) || 1080;
  const height = Number(v2.height) || 1920;
  const scenes = Array.isArray(v2.scenes) ? v2.scenes : [];

  const video: Track = newTrack("video", "V1");
  const audio: Track = newTrack("audio", "A1");
  const trackIds = { video: video.id, audio: audio.id };
  const clips: Clip[] = [];
  const sections: Section[] = [];
  const bg: BackgroundSegment[] = [];

  scenes.forEach((scene, i) => {
    const sceneStart = sceneStartFrame({ scenes }, i);
    const transFrames = clampedTransitionFrames(scene, scenes[i - 1]);
    const fadeIn = i > 0 && scene.transition === "fade" ? transFrames : 0;
    // slide/wipe can't be reproduced clip-locally — dropped (section marker kept).
    sections.push({ id: uid("sec"), name: `Scene ${i + 1}`, startFrame: sceneStart });
    const r = sceneToClips(scene, sceneStart, width, height, trackIds, fadeIn);
    clips.push(...r.clips);
    bg.push(r.bg);
  });

  const arranged = autoArrange([video, audio], clips);

  return {
    schemaVersion: 3,
    id: v2.id ? String(v2.id) : uid("video"),
    name: String(v2.name ?? "Untitled video"),
    fps: Number(v2.fps) || 30,
    width,
    height,
    durationInFrames: Math.max(1, totalDurationInFrames({ scenes })),
    tracks: arranged.tracks,
    clips: arranged.clips,
    background: { segments: bg },
    sections,
    templates: (v2.templates ?? []) as Template[],
    assets: (v2.assets ?? []) as MediaRef[],
  };
}

/** Master length = explicit duration, clamped up to the latest clip end. */
function flatDuration(p: Pick<Project, "durationInFrames" | "clips">): number {
  const maxEnd = (p.clips ?? []).reduce((m, c) => Math.max(m, c.startFrame + Math.max(1, c.durationInFrames)), 0);
  return Math.max(1, p.durationInFrames || 0, maxEnd);
}

/**
 * Inverse of migrateToFlat: rebuild a scene-per-section view from the flat
 * model, for the AI assistant shim (which speaks scenes + scene-local layers).
 * Each section spans up to the next section's start; every clip joins the
 * section containing its start frame, converted back to a scene-local layer.
 */
export function flattenToScenes(p: Project): Scene[] {
  const dur = flatDuration(p);
  const markers =
    p.sections && p.sections.length
      ? [...p.sections].sort((a, b) => a.startFrame - b.startFrame)
      : [{ id: uid("sec"), name: "Scene 1", startFrame: 0 }];

  const bounds = markers.map((m, i) => ({
    marker: m,
    start: m.startFrame,
    end: i + 1 < markers.length ? markers[i + 1].startFrame : dur,
  }));

  const segFor = (frame: number) =>
    (p.background?.segments ?? []).find((s) => frame >= s.startFrame && frame < s.startFrame + s.durationInFrames);

  // render z-order is clip array order within a track; preserve it per section
  const ordered = [...p.clips];

  return bounds.map(({ marker, start, end }) => {
    const sceneDur = Math.max(1, end - start);
    const layers: Layer[] = [];
    for (const clip of ordered) {
      if (clip.startFrame < start || clip.startFrame >= end) continue;
      const localStart = clip.startFrame - start;
      const localEnd = Math.min(sceneDur, localStart + clip.durationInFrames);
      // clip-local keyframes -> scene-local: shift by +localStart
      const layer = shiftLayerKeyframes({ ...clip.layer }, localStart);
      layers.push({ ...layer, startFrame: localStart, endFrame: localEnd });
    }
    return {
      id: marker.id,
      durationInFrames: sceneDur,
      transition: "none",
      transitionDurationInFrames: 0,
      background: segFor(start)?.background ?? defaultBackground(),
      layers,
    };
  });
}
