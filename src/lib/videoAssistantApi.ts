// Client for the AI assistant. Two endpoints, both served by the Claude bridge
// (server/claudeBridge.mjs via vite-claude-plugin.ts):
//   - /api/video-edit     : edit/generate scenes (project JSON)
//   - /api/template-edit  : create/edit a template's TSX code (vibe coding)
// All AI output is sanitized/validated on the client before it's offered to the
// user (mirrors the old canvas assistant's sanitize/merge discipline).

import type { CopyModel } from "./copywriterApi";
import {
  SCENE_TRANSITIONS,
  type PropField,
  type PropFieldType,
  type PropValues,
  type PropsSchema,
  type Project,
  type Scene,
  type ScenesProject,
  type SceneTransition,
  type Template,
} from "./remotion/types";
import { uid } from "./remotion/defaults";
import { completedArrayElements, extractJsonObject, streamAgentEdit, type AgentStreamHandlers } from "./jsonStream";
import { parseTemplate, compileTemplate } from "./remotion/compileTemplate";
import { EASINGS, defaultBackground, type Animatable, type Easing, type Layer, type SceneBackground } from "./remotion/layers";

const EASING_SET = new Set<string>(EASINGS);

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export type VideoEditScope = "scene" | "project" | "append";

const MEDIA_TYPES: PropFieldType[] = ["image", "video"];
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// ---------- prop / scene sanitization ----------

function coerceValue(field: PropField, raw: unknown, prev: string | number | undefined): string | number {
  switch (field.type) {
    case "number": {
      const n = Number(raw);
      if (!Number.isFinite(n)) return (prev as number) ?? (field.default as number);
      const lo = field.min ?? -1e9;
      const hi = field.max ?? 1e9;
      return clamp(n, lo, hi);
    }
    case "color": {
      const s = String(raw);
      return HEX.test(s) ? s : (prev as string) ?? (field.default as string);
    }
    case "select": {
      const s = String(raw);
      return field.options?.includes(s) ? s : (prev as string) ?? (field.default as string);
    }
    case "image":
    case "video": {
      // Never let the AI invent/alter media — keep what the user set.
      return (prev as string) ?? "";
    }
    default: {
      const s = raw == null ? (prev as string) ?? String(field.default) : String(raw);
      return s.slice(0, 4000);
    }
  }
}

function coerceProps(raw: Record<string, unknown>, schema: PropsSchema, prev?: PropValues): PropValues {
  const out: PropValues = {};
  for (const field of schema) {
    out[field.key] = coerceValue(field, raw?.[field.key], prev?.[field.key]);
  }
  return out;
}

// ---------- layer-graph sanitization (Milestone 3) ----------

const numOr = (v: unknown, fb: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};
const hexOr = (v: unknown, fb: string): string => (HEX.test(String(v)) ? String(v) : fb);

type AnyRec = Record<string, unknown>;

/** Validate a value that may be a plain number/color OR an Animatable track. */
function sanitizeAnimatable(
  raw: unknown,
  kind: "number" | "color",
  dur: number,
  fb: number | string,
  range?: [number, number]
): Animatable<number | string> {
  const coerce = (v: unknown): number | string =>
    kind === "color" ? hexOr(v, fb as string) : (range ? clamp(numOr(v, fb as number), range[0], range[1]) : numOr(v, fb as number));
  if (raw && typeof raw === "object" && Array.isArray((raw as AnyRec).keyframes)) {
    const kfs = ((raw as AnyRec).keyframes as AnyRec[])
      .map((k) => ({
        frame: clamp(Math.round(numOr(k?.frame, 0)), 0, dur),
        value: coerce(k?.value),
        easing: (EASING_SET.has(String(k?.easing)) ? String(k?.easing) : "easeInOut") as Easing,
      }))
      .sort((a, b) => a.frame - b.frame);
    return kfs.length ? { keyframes: kfs } : (fb as number | string);
  }
  return coerce(raw);
}

const ALIGNS = ["left", "center", "right"];
const FITS = ["cover", "contain"];
const SHAPES = ["rect", "ellipse", "line"];
const LAYER_TYPES = ["text", "image", "video", "shape", "component", "audio"];

function sanitizeLayer(raw: AnyRec, project: Project, dur: number, prev?: Layer): Layer | null {
  const type = LAYER_TYPES.includes(String(raw?.type)) ? String(raw?.type) : prev?.type;
  if (!type) return null;
  const id = prev?.id ?? uid("layer");
  const name = String(raw?.name ?? prev?.name ?? type);
  const width = Math.max(1, Math.round(numOr(raw?.width, prev?.width ?? 200)));
  const height = Math.max(1, Math.round(numOr(raw?.height, prev?.height ?? 200)));
  const tr = (raw?.transform as AnyRec) ?? {};
  const pt = prev?.transform;
  const base = {
    id,
    name,
    type: type as Layer["type"],
    width,
    height,
    transform: {
      x: sanitizeAnimatable(tr.x, "number", dur, (pt?.x as number) ?? 0, [-project.width * 2, project.width * 3]) as Animatable<number>,
      y: sanitizeAnimatable(tr.y, "number", dur, (pt?.y as number) ?? 0, [-project.height * 2, project.height * 3]) as Animatable<number>,
      scale: sanitizeAnimatable(tr.scale, "number", dur, (pt?.scale as number) ?? 1, [0.05, 10]) as Animatable<number>,
      rotation: sanitizeAnimatable(tr.rotation, "number", dur, (pt?.rotation as number) ?? 0, [-3600, 3600]) as Animatable<number>,
      opacity: sanitizeAnimatable(tr.opacity, "number", dur, (pt?.opacity as number) ?? 1, [0, 1]) as Animatable<number>,
    },
  } as Layer;
  if (raw?.startFrame != null) (base as Layer).startFrame = clamp(Math.round(numOr(raw.startFrame, 0)), 0, dur);
  if (raw?.endFrame != null) (base as Layer).endFrame = clamp(Math.round(numOr(raw.endFrame, dur)), 0, dur);
  if (raw?.hidden != null) (base as Layer).hidden = !!raw.hidden;

  if (type === "text") {
    return {
      ...base,
      type: "text",
      text: String(raw?.text ?? (prev?.type === "text" ? prev.text : "") ?? "Text").slice(0, 2000),
      fontFamily: String(raw?.fontFamily ?? (prev?.type === "text" ? prev.fontFamily : "Poppins")),
      fontSize: sanitizeAnimatable(raw?.fontSize, "number", dur, 64, [4, 2000]) as Animatable<number>,
      color: sanitizeAnimatable(raw?.color, "color", dur, "#ffffff") as Animatable<string>,
      weight: String(raw?.weight ?? (prev?.type === "text" ? prev.weight : "700")),
      align: (ALIGNS.includes(String(raw?.align)) ? String(raw?.align) : prev?.type === "text" ? prev.align : "center") as "left" | "center" | "right",
      lineHeight: numOr(raw?.lineHeight, prev?.type === "text" ? prev.lineHeight : 1.1),
      letterSpacing: numOr(raw?.letterSpacing, prev?.type === "text" ? prev.letterSpacing : 0),
    };
  }
  if (type === "image") {
    return {
      ...base,
      type: "image",
      src: prev?.type === "image" ? prev.src : "", // media preserved by id; new layers empty
      fit: (FITS.includes(String(raw?.fit)) ? String(raw?.fit) : prev?.type === "image" ? prev.fit : "cover") as "cover" | "contain",
      radius: numOr(raw?.radius, prev?.type === "image" ? prev.radius : 0),
      naturalRatio: prev?.type === "image" ? prev.naturalRatio : undefined,
    };
  }
  if (type === "video") {
    return {
      ...base,
      type: "video",
      src: prev?.type === "video" ? prev.src : "",
      fit: (FITS.includes(String(raw?.fit)) ? String(raw?.fit) : prev?.type === "video" ? prev.fit : "cover") as "cover" | "contain",
      trimStart: numOr(raw?.trimStart, prev?.type === "video" ? prev.trimStart : 0),
      volume: clamp(numOr(raw?.volume, 1), 0, 1),
    };
  }
  if (type === "shape") {
    return {
      ...base,
      type: "shape",
      shape: (SHAPES.includes(String(raw?.shape)) ? String(raw?.shape) : prev?.type === "shape" ? prev.shape : "rect") as "rect" | "ellipse" | "line",
      fill: sanitizeAnimatable(raw?.fill, "color", dur, "#6366f1") as Animatable<string>,
      stroke: hexOr(raw?.stroke, prev?.type === "shape" ? prev.stroke : "#ffffff"),
      strokeWidth: numOr(raw?.strokeWidth, prev?.type === "shape" ? prev.strokeWidth : 0),
      radius: numOr(raw?.radius, prev?.type === "shape" ? prev.radius : 0),
    };
  }
  if (type === "audio") {
    return {
      ...base,
      type: "audio",
      src: prev?.type === "audio" ? prev.src : "", // media preserved by id
      trimStart: numOr(raw?.trimStart, prev?.type === "audio" ? prev.trimStart : 0),
      volume: sanitizeAnimatable(raw?.volume, "number", dur, 1, [0, 1]) as Animatable<number>,
    };
  }
  // component
  const tpl =
    project.templates.find((t) => t.id === String(raw?.templateId)) ??
    (prev?.type === "component" ? project.templates.find((t) => t.id === prev.templateId) : undefined);
  if (!tpl) return null;
  return {
    ...base,
    type: "component",
    templateId: tpl.id,
    props: coerceProps((raw?.props as AnyRec) ?? {}, tpl.propsSchema, prev?.type === "component" ? prev.props : undefined),
  };
}

function sanitizeLayers(rawLayers: unknown, project: Project, dur: number, prevScene?: Scene): Layer[] {
  const prevById = new Map((prevScene?.layers ?? []).map((l) => [l.id, l]));
  const out: Layer[] = [];
  for (const raw of Array.isArray(rawLayers) ? (rawLayers as AnyRec[]) : []) {
    const prev = typeof raw?.id === "string" ? prevById.get(raw.id as string) : undefined;
    const layer = sanitizeLayer(raw, project, dur, prev);
    if (layer) out.push(layer);
  }
  return out;
}

function sanitizeBackground(raw: unknown, prev?: SceneBackground): SceneBackground | undefined {
  if (!raw || typeof raw !== "object") return prev;
  const r = raw as AnyRec;
  const type = (["solid", "gradient", "image"].includes(String(r.type)) ? String(r.type) : prev?.type ?? "gradient") as SceneBackground["type"];
  return {
    type,
    color: hexOr(r.color, prev?.color ?? "#0f172a"),
    gradientFrom: hexOr(r.gradientFrom, prev?.gradientFrom ?? "#6366f1"),
    gradientTo: hexOr(r.gradientTo, prev?.gradientTo ?? "#ec4899"),
    gradientAngle: clamp(numOr(r.gradientAngle, prev?.gradientAngle ?? 135), 0, 360),
    src: prev?.src ?? null, // never accept an AI-invented URL; keep the uploaded image
  };
}

const isMediaUrl = (v: unknown) => typeof v === "string" && v.length > 0;

/** Media-stripped project (with full layer graphs + keyframes) for the model. */
function projectForModel(project: ScenesProject, scope: VideoEditScope, targetSceneId: string) {
  const serializeLayer = (l: Layer): AnyRec => {
    const base: AnyRec = { id: l.id, name: l.name, type: l.type, width: l.width, height: l.height, transform: l.transform };
    if (l.startFrame != null) base.startFrame = l.startFrame;
    if (l.endFrame != null) base.endFrame = l.endFrame;
    if (l.hidden) base.hidden = true;
    if (l.type === "text")
      return { ...base, text: l.text, fontFamily: l.fontFamily, fontSize: l.fontSize, color: l.color, weight: l.weight, align: l.align, lineHeight: l.lineHeight, letterSpacing: l.letterSpacing };
    if (l.type === "image") return { ...base, src: isMediaUrl(l.src) ? "[media]" : "", fit: l.fit, radius: l.radius };
    if (l.type === "video") return { ...base, src: isMediaUrl(l.src) ? "[media]" : "", fit: l.fit, trimStart: l.trimStart, volume: l.volume };
    if (l.type === "shape") return { ...base, shape: l.shape, fill: l.fill, stroke: l.stroke, strokeWidth: l.strokeWidth, radius: l.radius };
    if (l.type === "audio") return { ...base, src: isMediaUrl(l.src) ? "[media]" : "", trimStart: l.trimStart, volume: l.volume };
    // component
    const schema = project.templates.find((t) => t.id === l.templateId)?.propsSchema ?? [];
    const props: PropValues = { ...l.props };
    for (const f of schema) if (MEDIA_TYPES.includes(f.type) && isMediaUrl(props[f.key])) props[f.key] = "[media]";
    return { ...base, templateId: l.templateId, props };
  };
  const serializeBg = (b?: SceneBackground) =>
    b ? { type: b.type, color: b.color, gradientFrom: b.gradientFrom, gradientTo: b.gradientTo, gradientAngle: b.gradientAngle, src: b.src ? "[media]" : null } : undefined;

  return {
    fps: project.fps,
    width: project.width,
    height: project.height,
    scope,
    targetSceneId,
    templates: project.templates
      .slice(-40) // catalog cap (token safeguard for large libraries)
      .map((t) => ({ id: t.id, name: t.name, tags: t.tags ?? [], description: t.description ?? "", propsSchema: t.propsSchema })),
    scenes: project.scenes.map((s) => ({
      id: s.id,
      durationInFrames: s.durationInFrames,
      transition: s.transition,
      transitionDurationInFrames: s.transitionDurationInFrames,
      background: serializeBg(s.background),
      layers: (s.layers ?? []).map(serializeLayer),
    })),
  };
}

export interface SceneProposal {
  summary: string;
  proposedScenes: Scene[];
  replace: boolean;
}

/** Normalize one proposed scene (project scope) against the previous-by-id map. */
function sanitizeProposedScene(raw: AnyRec, project: Project, byId: Map<string, Scene>): Scene {
  const prev = byId.get(String(raw?.id));
  const dur = clamp(Math.round(numOr(raw?.durationInFrames, prev?.durationInFrames ?? 90)), 1, 36000);
  const transition = SCENE_TRANSITIONS.includes(raw?.transition as SceneTransition)
    ? (raw.transition as SceneTransition)
    : prev?.transition ?? "none";
  return {
    id: prev?.id ?? uid("scene"),
    durationInFrames: dur,
    transition,
    transitionDurationInFrames: clamp(Math.round(numOr(raw?.transitionDurationInFrames, prev?.transitionDurationInFrames ?? 15)), 0, 600),
    background: sanitizeBackground(raw?.background, prev?.background) ?? defaultBackground(),
    layers: sanitizeLayers(raw?.layers, project, dur, prev),
    // AI preset reuse: carry the picked preset id + positional text overrides
    // through to the editor, which expands it into real layers at apply time.
    ...(typeof raw?.presetId === "string" && raw.presetId.trim()
      ? { presetId: String(raw.presetId).trim(), presetTexts: Array.isArray(raw?.texts) ? raw.texts.map((t) => String(t)) : undefined }
      : {}),
  };
}

/** Sanitize a parsed `/api/video-edit` response into a proposal. Shared by the
 *  non-streaming and streaming paths. */
export function sanitizeVideoEditResponse(data: AnyRec, scope: VideoEditScope, targetSceneId: string, project: ScenesProject): SceneProposal {
  const byId = new Map(project.scenes.map((s) => [s.id, s]));
  const rawScenes: AnyRec[] = Array.isArray(data.scenes) ? (data.scenes as AnyRec[]) : [];
  if (scope === "scene") {
    const prev = byId.get(targetSceneId);
    if (!prev) return { summary: String(data.summary ?? "No change."), proposedScenes: [], replace: false };
    const dur = prev.durationInFrames;
    const rawLayers = (data.layers as unknown) ?? rawScenes.find((r) => String(r?.id) === targetSceneId)?.layers ?? rawScenes[0]?.layers;
    const rawBg = (data.background as unknown) ?? rawScenes.find((r) => String(r?.id) === targetSceneId)?.background;
    const layers = sanitizeLayers(rawLayers, project, dur, prev);
    const merged: Scene = {
      ...prev,
      layers: layers.length ? layers : prev.layers ?? [],
      background: sanitizeBackground(rawBg, prev.background) ?? prev.background ?? defaultBackground(),
    };
    return { summary: String(data.summary ?? "Updated the scene."), proposedScenes: [merged], replace: false };
  }
  if (scope === "append") {
    // New scenes only — empty byId forces fresh ids + empty media placeholders
    // (no carry-over from / collision with the existing timeline). replace:false.
    const proposedScenes = rawScenes.map((raw) => sanitizeProposedScene(raw, project, new Map()));
    return { summary: String(data.summary ?? "Added new scenes."), proposedScenes, replace: false };
  }
  const proposedScenes = rawScenes.map((raw) => sanitizeProposedScene(raw, project, byId));
  return { summary: String(data.summary ?? "Rebuilt the video."), proposedScenes, replace: true };
}

/** Token-light catalog entry the AI sees for reusable scene presets. */
export interface PresetCatalogEntry {
  id: string;
  name: string;
  tags?: string[];
  description?: string;
  slots?: string[]; // ordered current text of the preset's text layers
}

export async function editVideoProject(payload: {
  instruction: string;
  scope: VideoEditScope;
  targetSceneId: string;
  project: ScenesProject;
  history: AssistantMessage[];
  model: CopyModel;
  images?: string[];
  resume?: string;
  presets?: PresetCatalogEntry[];
}): Promise<SceneProposal & { sessionId?: string }> {
  const { instruction, scope, targetSceneId, project, history, model, images, resume, presets } = payload;
  const res = await fetch("/api/video-edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instruction, scope, targetSceneId, project: projectForModel(project, scope, targetSceneId), history: history.slice(-6), model, images, resume, presets }),
  });
  const data = await res.json().catch(() => null);
  if (!data) throw new Error("No response from the assistant service.");
  if (!data.ok) throw new Error(data.error || "Assistant request failed.");
  return { ...sanitizeVideoEditResponse(data, scope, targetSceneId, project), sessionId: typeof data.sessionId === "string" ? data.sessionId : undefined };
}

// ---------- streaming (token-by-token; timeline builds as the model writes) ----------

export interface StreamHandlers {
  onScene?: (scene: Scene) => void; // project scope: a completed scene
  onLayer?: (layer: Layer) => void; // scene scope: a completed layer
  onThinking?: (text: string) => void; // reasoning delta — separate from the JSON channel
  onSession?: (sessionId: string) => void; // resumable Claude session id for this chat
  onSummary?: (text: string) => void;
  onDone?: (proposal: SceneProposal) => void; // authoritative final
}

export async function editVideoProjectStream(
  payload: { instruction: string; scope: VideoEditScope; targetSceneId: string; project: ScenesProject; history: AssistantMessage[]; model: CopyModel; images?: string[]; resume?: string; presets?: PresetCatalogEntry[] },
  handlers: StreamHandlers
): Promise<void> {
  const { instruction, scope, targetSceneId, project, history, model, images, resume, presets } = payload;
  const res = await fetch("/api/video-edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instruction, scope, targetSceneId, project: projectForModel(project, scope, targetSceneId), history: history.slice(-6), model, images, resume, presets, stream: true }),
  });
  if (!res.ok || !res.body) throw new Error(`Assistant stream failed (${res.status})`);

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let nd = "";        // NDJSON line buffer
  let text = "";      // accumulated assistant text
  let emitted = 0;    // count of array elements already emitted
  let errored: Error | null = null;

  const key = scope === "project" || scope === "append" ? "scenes" : "layers";
  // append: empty byId → streamed scenes get fresh ids (no collision with existing).
  const byId = scope === "append" ? new Map<string, Scene>() : new Map(project.scenes.map((s) => [s.id, s]));
  const prevScene = scope === "scene" ? project.scenes.find((s) => s.id === targetSceneId) : undefined;
  const prevById = new Map((prevScene?.layers ?? []).map((l) => [l.id, l]));

  const flush = () => {
    const els = completedArrayElements(text, key);
    for (; emitted < els.length; emitted++) {
      let raw: AnyRec;
      try { raw = JSON.parse(els[emitted]) as AnyRec; } catch { continue; }
      if (key === "scenes") handlers.onScene?.(sanitizeProposedScene(raw, project, byId));
      else {
        const prev = typeof raw?.id === "string" ? prevById.get(raw.id as string) : undefined;
        const layer = sanitizeLayer(raw, project, prevScene?.durationInFrames ?? 90, prev);
        if (layer) handlers.onLayer?.(layer);
      }
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    nd += dec.decode(value, { stream: true });
    let nl;
    while ((nl = nd.indexOf("\n")) >= 0) {
      const line = nd.slice(0, nl);
      nd = nd.slice(nl + 1);
      if (!line.trim()) continue;
      let ev: AnyRec;
      try { ev = JSON.parse(line) as AnyRec; } catch { continue; }
      if (ev.type === "thinking" && typeof ev.text === "string") {
        handlers.onThinking?.(ev.text as string);
      } else if (ev.type === "session" && typeof ev.sessionId === "string") {
        handlers.onSession?.(ev.sessionId as string);
      } else if (ev.type === "delta" && typeof ev.text === "string") {
        text += ev.text;
        flush();
      } else if (ev.type === "done") {
        if (typeof ev.sessionId === "string") handlers.onSession?.(ev.sessionId as string);
        const full = typeof ev.text === "string" && ev.text ? (ev.text as string) : text;
        try {
          const proposal = sanitizeVideoEditResponse(extractJsonObject(full), scope, targetSceneId, project);
          handlers.onSummary?.(proposal.summary);
          handlers.onDone?.(proposal);
        } catch (e) {
          errored = e instanceof Error ? e : new Error(String(e));
        }
      } else if (ev.type === "error") {
        errored = new Error(String(ev.error || "Assistant stream error"));
      }
    }
  }
  if (errored) throw errored;
}

// ---------- template (code) editing ----------

const FORBIDDEN =
  /\bimport\b|\brequire\s*\(|\bfetch\s*\(|\bXMLHttpRequest\b|\beval\s*\(|\bnew\s+Function\b|\bWebSocket\b|\bdocument\s*\.|\bwindow\s*\.|\bglobalThis\b|\bprocess\b|\blocalStorage\b/;

export function validateTemplateCode(code: string): { ok: boolean; error: string | null } {
  if (!code || !code.trim()) return { ok: false, error: "Empty template code." };
  if (FORBIDDEN.test(code))
    return { ok: false, error: "Template code may not use imports, network, eval, or DOM/process globals." };
  if (!/export\s+default/.test(code)) return { ok: false, error: "Template must `export default` a component." };
  const parsed = parseTemplate(code);
  if (!parsed.ok) return { ok: false, error: `Template doesn't parse: ${parsed.error}` };
  const compiled = compileTemplate(code);
  if (!compiled.component) return { ok: false, error: `Template failed to compile: ${compiled.error}` };
  return { ok: true, error: null };
}

const PROP_FIELD_TYPES: PropFieldType[] = ["text", "longtext", "color", "number", "image", "video", "select"];

export function normalizeSchema(raw: unknown): PropsSchema {
  if (!Array.isArray(raw)) return [];
  const out: PropsSchema = [];
  for (const f of raw) {
    if (!f || typeof f !== "object") continue;
    const key = String((f as PropField).key ?? "").trim();
    const type = (f as PropField).type;
    if (!key || !PROP_FIELD_TYPES.includes(type)) continue;
    const field: PropField = {
      key,
      type,
      label: String((f as PropField).label ?? key),
      default: type === "number" ? Number((f as PropField).default) || 0 : String((f as PropField).default ?? ""),
    };
    if (type === "number") {
      if ((f as PropField).min != null) field.min = Number((f as PropField).min);
      if ((f as PropField).max != null) field.max = Number((f as PropField).max);
      if ((f as PropField).step != null) field.step = Number((f as PropField).step);
    }
    if (type === "select" && Array.isArray((f as PropField).options)) {
      field.options = (f as PropField).options!.map((o) => String(o));
    }
    out.push(field);
  }
  return out;
}

export function defaultsOf(schema: PropsSchema): PropValues {
  const out: PropValues = {};
  for (const f of schema) out[f.key] = f.default;
  return out;
}

export interface TemplateProposal {
  summary: string;
  template: Template;
}

export async function editTemplate(payload: {
  instruction: string;
  mode: "create" | "edit";
  template?: Template; // present for edit
  history: AssistantMessage[];
  model: CopyModel;
  images?: string[];
}): Promise<TemplateProposal> {
  const { instruction, mode, template, history, model, images } = payload;

  const res = await fetch("/api/template-edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instruction,
      mode,
      template: template
        ? { id: template.id, name: template.name, code: template.code, propsSchema: template.propsSchema }
        : null,
      history: history.slice(-6),
      model,
      images,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!data) throw new Error("No response from the assistant service.");
  if (!data.ok) throw new Error(data.error || "Template request failed.");

  const t = data.template ?? {};
  const code = String(t.code ?? "");
  const check = validateTemplateCode(code);
  if (!check.ok) throw new Error(check.error || "The assistant returned invalid template code.");

  const propsSchema = normalizeSchema(t.propsSchema);
  const previewProps = {
    ...defaultsOf(propsSchema),
    ...coerceProps((t.previewProps as Record<string, unknown>) ?? {}, propsSchema),
  };

  const result: Template = {
    id: mode === "edit" && template ? template.id : uid("tpl"),
    name: String(t.name ?? template?.name ?? "Untitled template"),
    code,
    propsSchema,
    previewProps,
  };
  return { summary: String(data.summary ?? "Updated the template."), template: result };
}

// Streaming variant: surfaces thinking + the resumable session live, then parses
// + validates the final JSON client-side (the stream path skips server validation).
export async function editTemplateStream(
  payload: { instruction: string; mode: "create" | "edit"; template?: Template; history: AssistantMessage[]; model: CopyModel; images?: string[]; resume?: string | null },
  handlers: AgentStreamHandlers = {},
): Promise<TemplateProposal & { sessionId: string | null }> {
  const { instruction, mode, template, history, model, images, resume } = payload;
  const { text, sessionId } = await streamAgentEdit(
    "/api/template-edit",
    {
      instruction,
      mode,
      template: template
        ? { id: template.id, name: template.name, code: template.code, propsSchema: template.propsSchema }
        : null,
      history: history.slice(-6),
      model,
      images,
      resume: resume ?? undefined,
    },
    handlers,
  );

  const parsed = extractJsonObject(text) as { summary?: unknown; template?: Record<string, unknown> };
  const t = (parsed.template ?? {}) as Record<string, unknown>;
  const code = String(t.code ?? "");
  const check = validateTemplateCode(code);
  if (!check.ok) throw new Error(check.error || "The assistant returned invalid template code.");

  const propsSchema = normalizeSchema(t.propsSchema);
  const previewProps = {
    ...defaultsOf(propsSchema),
    ...coerceProps((t.previewProps as Record<string, unknown>) ?? {}, propsSchema),
  };
  const result: Template = {
    id: mode === "edit" && template ? template.id : uid("tpl"),
    name: String(t.name ?? template?.name ?? "Untitled template"),
    code,
    propsSchema,
    previewProps,
  };
  return { summary: String(parsed.summary ?? "Updated the template."), template: result, sessionId };
}
