// Layer graph model for the comprehensive editor. A Scene becomes a list of
// freely-positioned LAYERS (text/image/video/shape/component). Every animatable
// value is `Animatable<T>` — a plain value (Milestone 1) OR a keyframed track
// (Milestone 2). `evalProp` resolves a value at a given frame and is shared by
// both the in-browser <Player> and the Node render bundle, so preview === export.
//
// Pure-ish: imports only `remotion` (available in both environments) and the
// PropValues type. NO seedTemplates / ?raw imports (so the webpack render bundle
// can compile it, same rule as timing.ts).

import { interpolate, interpolateColors, Easing as RemotionEasing } from "remotion";
import type { CSSProperties } from "react";
import type { PropValues } from "./types";

export type LayerType = "text" | "image" | "video" | "shape" | "component" | "audio";

export type Easing = "linear" | "easeIn" | "easeOut" | "easeInOut" | "spring" | "backOut";
export const EASINGS: Easing[] = ["linear", "easeIn", "easeOut", "easeInOut", "spring", "backOut"];

export interface Keyframe<T> {
  frame: number;
  value: T;
  easing: Easing;
}

/** A plain value (no animation) or a keyframed track. */
export type Animatable<T> = T | { keyframes: Keyframe<T>[] };

export interface Transform {
  x: Animatable<number>; // top-left X in composition px
  y: Animatable<number>; // top-left Y in composition px
  scale: Animatable<number>;
  rotation: Animatable<number>; // degrees, about the box center
  opacity: Animatable<number>; // 0..1
}

export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  hidden?: boolean;
  locked?: boolean;
  groupId?: string; // organizational folder (see SceneGroup); no render effect
  width: number; // layer box, composition px
  height: number;
  startFrame?: number; // visibility window within the scene (frames)
  endFrame?: number;
  transform: Transform;
}

/** A folder grouping layers in the editor (organizational; not rendered). */
export interface SceneGroup {
  id: string;
  name: string;
  collapsed?: boolean;
}

export interface TextLayer extends BaseLayer {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: Animatable<number>;
  color: Animatable<string>;
  weight: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: number;
}

export interface ImageLayer extends BaseLayer {
  type: "image";
  src: string;
  fit: "cover" | "contain";
  radius: number;
  naturalRatio?: number;
}

export interface VideoLayer extends BaseLayer {
  type: "video";
  src: string;
  trimStart: number;
  volume: number;
  fit: "cover" | "contain";
}

export interface ShapeLayer extends BaseLayer {
  type: "shape";
  shape: "rect" | "ellipse" | "line";
  fill: Animatable<string>;
  stroke: string;
  strokeWidth: number;
  radius: number;
}

export interface ComponentLayer extends BaseLayer {
  type: "component";
  templateId: string;
  props: PropValues;
}

/** Non-visual audio track (music/voiceover). transform/width/height are unused
 *  (kept for a uniform BaseLayer shape); rendered via Remotion <Audio>. */
export interface AudioLayer extends BaseLayer {
  type: "audio";
  src: string;
  trimStart: number; // frames trimmed from the start of the source
  volume: Animatable<number>; // 0..1, keyframable (fades)
}

export type Layer = TextLayer | ImageLayer | VideoLayer | ShapeLayer | ComponentLayer | AudioLayer;

export interface SceneBackground {
  type: "solid" | "gradient" | "image";
  color: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  src?: string | null;
}

/** CSS for a background (scene background OR a v3 BackgroundSegment). Shared by
 *  the old per-scene LayerStack and the new TimelineComposition; no bg → black. */
export function backgroundStyle(bg?: SceneBackground): CSSProperties {
  if (!bg) return { background: "#000000" };
  if (bg.type === "gradient") {
    return { background: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})` };
  }
  if (bg.type === "image" && bg.src) {
    return { backgroundImage: `url(${bg.src})`, backgroundSize: "cover", backgroundPosition: "center" };
  }
  return { background: bg.color };
}

// ---------- keyframe evaluation (shared browser + node) ----------

function isKeyframed<T>(a: Animatable<T>): a is { keyframes: Keyframe<T>[] } {
  return typeof a === "object" && a !== null && Array.isArray((a as { keyframes?: unknown }).keyframes);
}

function easingFn(e: Easing): (n: number) => number {
  switch (e) {
    case "easeIn":
      return RemotionEasing.in(RemotionEasing.ease);
    case "easeOut":
      return RemotionEasing.out(RemotionEasing.ease);
    case "easeInOut":
      return RemotionEasing.inOut(RemotionEasing.ease);
    case "backOut":
      return RemotionEasing.bezier(0.34, 1.56, 0.64, 1);
    case "spring":
      // Approximate a spring with an overshooting bezier (true spring needs fps).
      return RemotionEasing.bezier(0.34, 1.3, 0.5, 1);
    default:
      return RemotionEasing.linear;
  }
}

function sortedKfs<T>(kfs: Keyframe<T>[]): Keyframe<T>[] {
  return [...kfs].sort((a, b) => a.frame - b.frame);
}

export function evalNumber(a: Animatable<number>, frame: number): number {
  if (!isKeyframed(a)) return a as number;
  const kfs = sortedKfs(a.keyframes);
  if (kfs.length === 0) return 0;
  if (frame <= kfs[0].frame) return kfs[0].value;
  const last = kfs[kfs.length - 1];
  if (frame >= last.frame) return last.value;
  for (let i = 0; i < kfs.length - 1; i++) {
    const k0 = kfs[i];
    const k1 = kfs[i + 1];
    if (frame >= k0.frame && frame <= k1.frame) {
      return interpolate(frame, [k0.frame, k1.frame], [k0.value, k1.value], {
        easing: easingFn(k1.easing),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    }
  }
  return last.value;
}

export function evalColor(a: Animatable<string>, frame: number): string {
  if (!isKeyframed(a)) return a as string;
  const kfs = sortedKfs(a.keyframes);
  if (kfs.length === 0) return "#000000";
  if (frame <= kfs[0].frame) return kfs[0].value;
  const last = kfs[kfs.length - 1];
  if (frame >= last.frame) return last.value;
  for (let i = 0; i < kfs.length - 1; i++) {
    const k0 = kfs[i];
    const k1 = kfs[i + 1];
    if (frame >= k0.frame && frame <= k1.frame) {
      const t = interpolate(frame, [k0.frame, k1.frame], [0, 1], {
        easing: easingFn(k1.easing),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return interpolateColors(t, [0, 1], [k0.value, k1.value]);
    }
  }
  return last.value;
}

/** Read the editor-facing static value (the plain value, or the first keyframe). */
export function staticNumber(a: Animatable<number>): number {
  return isKeyframed(a) ? a.keyframes[0]?.value ?? 0 : (a as number);
}
export function staticColor(a: Animatable<string>): string {
  return isKeyframed(a) ? a.keyframes[0]?.value ?? "#000000" : (a as string);
}
export function isAnimated<T>(a: Animatable<T>): boolean {
  return isKeyframed(a) && a.keyframes.length > 0;
}

// ---------- keyframe write helpers (Milestone 2) ----------

export function getKeyframes<T>(a: Animatable<T>): Keyframe<T>[] {
  return isKeyframed(a) ? sortedKfs(a.keyframes) : [];
}

/** Insert/update a keyframe at `frame`. Updating an existing keyframe keeps its
 *  easing; a new keyframe uses the given easing. Plain values become keyframed. */
export function setKeyframe<T>(a: Animatable<T>, frame: number, value: T, easing: Easing = "easeInOut"): Animatable<T> {
  const kfs = isKeyframed(a) ? [...a.keyframes] : [];
  const idx = kfs.findIndex((k) => k.frame === frame);
  if (idx >= 0) kfs[idx] = { frame, value, easing: kfs[idx].easing };
  else kfs.push({ frame, value, easing });
  return { keyframes: kfs.sort((x, y) => x.frame - y.frame) };
}

/** Remove the keyframe at `frame`. When none remain, collapse back to a plain
 *  value (the removed keyframe's value) so the property is static again. */
export function removeKeyframe<T>(a: Animatable<T>, frame: number): Animatable<T> {
  if (!isKeyframed(a)) return a;
  const removed = a.keyframes.find((k) => k.frame === frame);
  const kfs = a.keyframes.filter((k) => k.frame !== frame);
  if (kfs.length === 0) return (removed?.value ?? a.keyframes[0]?.value) as T;
  return { keyframes: kfs.sort((x, y) => x.frame - y.frame) };
}

/** Stopwatch toggle: turn keyframing ON (seed one keyframe at `frame` with the
 *  current evaluated value) or OFF (collapse to that static value). */
export function toggleKeyframed<T>(a: Animatable<T>, frame: number, evaluatedValue: T, easing: Easing = "easeInOut"): Animatable<T> {
  if (isAnimated(a)) return evaluatedValue;
  return { keyframes: [{ frame, value: evaluatedValue, easing }] };
}

export function moveKeyframe<T>(a: Animatable<T>, from: number, to: number): Animatable<T> {
  if (!isKeyframed(a)) return a;
  const byFrame = new Map<number, Keyframe<T>>();
  for (const k of a.keyframes) byFrame.set(k.frame === from ? to : k.frame, k.frame === from ? { ...k, frame: to } : k);
  return { keyframes: [...byFrame.values()].sort((x, y) => x.frame - y.frame) };
}

export function setKeyframeEasing<T>(a: Animatable<T>, frame: number, easing: Easing): Animatable<T> {
  if (!isKeyframed(a)) return a;
  return { keyframes: a.keyframes.map((k) => (k.frame === frame ? { ...k, easing } : k)) };
}

// ---------- animatable property registry (addressed by string key) ----------

export interface KeyProp {
  key: string; // "transform.x" | "fontSize" | "color" | "fill" | ...
  label: string;
  kind: "number" | "color";
}

const BASE_KEYPROPS: KeyProp[] = [
  { key: "transform.x", label: "X", kind: "number" },
  { key: "transform.y", label: "Y", kind: "number" },
  { key: "transform.scale", label: "Scale", kind: "number" },
  { key: "transform.rotation", label: "Rotation", kind: "number" },
  { key: "transform.opacity", label: "Opacity", kind: "number" },
];

export function KEYFRAMABLE_PROPS(layer: Layer): KeyProp[] {
  if (layer.type === "audio") return [{ key: "volume", label: "Volume", kind: "number" }];
  if (layer.type === "text")
    return [...BASE_KEYPROPS, { key: "fontSize", label: "Font size", kind: "number" }, { key: "color", label: "Color", kind: "color" }];
  if (layer.type === "shape") return [...BASE_KEYPROPS, { key: "fill", label: "Fill", kind: "color" }];
  return BASE_KEYPROPS;
}

export function getAnimatable(layer: Layer, key: string): Animatable<number | string> | undefined {
  if (key === "volume" && layer.type === "audio") return layer.volume;
  if (key.startsWith("transform.")) {
    const f = key.slice("transform.".length) as keyof Transform;
    return layer.transform[f];
  }
  if (key === "fontSize" && layer.type === "text") return layer.fontSize;
  if (key === "color" && layer.type === "text") return layer.color;
  if (key === "fill" && layer.type === "shape") return layer.fill;
  return undefined;
}

export function setAnimatableOnLayer(layer: Layer, key: string, value: Animatable<number | string>): Layer {
  if (key === "volume" && layer.type === "audio") return { ...layer, volume: value as Animatable<number> };
  if (key.startsWith("transform.")) {
    const f = key.slice("transform.".length);
    return { ...layer, transform: { ...layer.transform, [f]: value } } as Layer;
  }
  if (key === "fontSize" && layer.type === "text") return { ...layer, fontSize: value as Animatable<number> };
  if (key === "color" && layer.type === "text") return { ...layer, color: value as Animatable<string> };
  if (key === "fill" && layer.type === "shape") return { ...layer, fill: value as Animatable<string> };
  return layer;
}

/** Evaluate any registered prop key at a frame (number or color). */
export function evalAnyAtFrame(layer: Layer, key: string, frame: number): number | string {
  const a = getAnimatable(layer, key);
  if (a === undefined) return 0;
  const isColor = key === "color" || key === "fill";
  return isColor ? evalColor(a as Animatable<string>, frame) : evalNumber(a as Animatable<number>, frame);
}

// ---------- factories ----------

export function uid(prefix = "layer"): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  } catch {
    /* noop */
  }
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function baseTransform(x: number, y: number): Transform {
  return { x, y, scale: 1, rotation: 0, opacity: 1 };
}

export function defaultBackground(): SceneBackground {
  return { type: "gradient", color: "#0f172a", gradientFrom: "#6366f1", gradientTo: "#ec4899", gradientAngle: 135, src: null };
}

export function newTextLayer(sceneW: number, sceneH: number, text = "Double-click to edit"): TextLayer {
  const w = Math.round(sceneW * 0.8);
  const fontSize = Math.round(sceneW * 0.07);
  const h = Math.round(fontSize * 1.4);
  return {
    id: uid("text"),
    name: "Text",
    type: "text",
    width: w,
    height: h,
    transform: baseTransform(Math.round((sceneW - w) / 2), Math.round((sceneH - h) / 2)),
    text,
    fontFamily: "Poppins",
    fontSize,
    color: "#ffffff",
    weight: "800",
    align: "center",
    lineHeight: 1.1,
    letterSpacing: 0,
  };
}

export function newImageLayer(sceneW: number, sceneH: number, src: string, naturalRatio = 1): ImageLayer {
  let w = Math.round(sceneW * 0.5);
  let h = Math.round(w / (naturalRatio || 1));
  if (h > sceneH * 0.8) {
    h = Math.round(sceneH * 0.8);
    w = Math.round(h * (naturalRatio || 1));
  }
  return {
    id: uid("image"),
    name: "Image",
    type: "image",
    width: w,
    height: h,
    transform: baseTransform(Math.round((sceneW - w) / 2), Math.round((sceneH - h) / 2)),
    src,
    fit: "cover",
    radius: 0,
    naturalRatio,
  };
}

export function newVideoLayer(sceneW: number, sceneH: number, src: string): VideoLayer {
  const w = Math.round(sceneW * 0.6);
  const h = Math.round(sceneH * 0.6);
  return {
    id: uid("video"),
    name: "Video",
    type: "video",
    width: w,
    height: h,
    transform: baseTransform(Math.round((sceneW - w) / 2), Math.round((sceneH - h) / 2)),
    src,
    trimStart: 0,
    volume: 1,
    fit: "cover",
  };
}

export function newShapeLayer(sceneW: number, sceneH: number, shape: ShapeLayer["shape"] = "rect"): ShapeLayer {
  const w = Math.round(sceneW * 0.4);
  const h = shape === "line" ? Math.round(sceneW * 0.01) : Math.round(sceneW * 0.4);
  return {
    id: uid("shape"),
    name: shape === "rect" ? "Rectangle" : shape === "ellipse" ? "Ellipse" : "Line",
    type: "shape",
    width: w,
    height: h,
    transform: baseTransform(Math.round((sceneW - w) / 2), Math.round((sceneH - h) / 2)),
    shape,
    fill: "#6366f1",
    stroke: "#ffffff",
    strokeWidth: 0,
    radius: shape === "rect" ? 16 : 0,
  };
}

export function newAudioLayer(src = "", name = "Audio"): AudioLayer {
  return {
    id: uid("audio"),
    name,
    type: "audio",
    width: 0,
    height: 0,
    transform: baseTransform(0, 0),
    src,
    trimStart: 0,
    volume: 1,
  };
}

export function newComponentLayer(
  sceneW: number,
  sceneH: number,
  templateId: string,
  props: PropValues,
  name = "Template"
): ComponentLayer {
  return {
    id: uid("cmp"),
    name,
    type: "component",
    width: sceneW,
    height: sceneH,
    transform: baseTransform(0, 0),
    templateId,
    props: { ...props },
  };
}

/** Clone a layer with a fresh id (for duplicate). */
export function cloneLayer(layer: Layer, offset = 24): Layer {
  const copy = JSON.parse(JSON.stringify(layer)) as Layer;
  copy.id = uid(layer.type);
  copy.name = `${layer.name} copy`;
  // nudge static positions so the copy is visible
  if (typeof copy.transform.x === "number") copy.transform.x += offset;
  if (typeof copy.transform.y === "number") copy.transform.y += offset;
  return copy;
}
