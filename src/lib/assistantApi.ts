import {
  Background,
  CanvasItem,
  OriginX,
  OriginY,
  TextAlign,
  TextElement,
  newTextElement,
  uid,
} from "./contentStudio";
import { CopyModel } from "./copywriterApi";
import { streamAgentEdit, extractJsonObject, type AgentStreamHandlers } from "./jsonStream";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

const ALIGNS = ["left", "center", "right", "justify"];
const ORIGIN_X = ["left", "center", "right"];
const ORIGIN_Y = ["top", "center", "bottom"];

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
function hex(v: unknown, fallback: string): string {
  return typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim()) ? v.trim() : fallback;
}

// Strip heavy image data URLs before sending the canvas to the model.
function sanitize(canvas: CanvasItem) {
  return {
    width: canvas.width,
    height: canvas.height,
    background: canvas.background,
    textElements: canvas.textElements,
    imageElements: (canvas.imageElements ?? []).map((i) => ({
      id: i.id,
      x: i.x,
      y: i.y,
      width: i.width,
      height: i.height,
      opacity: i.opacity,
      locked: !!i.locked,
    })),
  };
}

interface RawCanvas {
  background?: Partial<Background>;
  textElements?: Partial<TextElement>[];
  imageElements?: { id?: string; x?: number; y?: number; width?: number; height?: number; opacity?: number }[];
}

// Merge the model's proposed canvas back onto the real one: restore image
// pixels by id, preserve ids, clamp values, keep dimensions/aspect ratio.
function merge(current: CanvasItem, raw: RawCanvas): CanvasItem {
  const bg = raw.background ?? {};
  const background: Background = {
    type: bg.type === "gradient" || bg.type === "image" ? bg.type : "solid",
    color: hex(bg.color, current.background.color),
    gradientFrom: hex(bg.gradientFrom, current.background.gradientFrom),
    gradientTo: hex(bg.gradientTo, current.background.gradientTo),
    gradientAngle: clamp(num(bg.gradientAngle, current.background.gradientAngle), 0, 360),
    src: current.background.src, // never let the model invent image data
    opacity: clamp(num(bg.opacity, current.background.opacity), 0, 1),
  };

  const lockedTextIds = new Set(current.textElements.filter((t) => t.locked).map((t) => t.id));
  const usedIds = new Set<string>(current.textElements.map((t) => t.id));
  // Merge the model's edits for unlocked elements (keyed by id); collect brand-new ones.
  const mergedById = new Map<string, TextElement>();
  const newTextEls: TextElement[] = [];
  for (const rt of raw.textElements ?? []) {
    const rid = typeof rt.id === "string" && rt.id ? rt.id : "";
    if (rid && lockedTextIds.has(rid)) continue; // never apply AI changes to a locked layer
    const base = current.textElements.find((t) => t.id === rid) ?? newTextElement(current);
    const isNew = !rid || !current.textElements.some((t) => t.id === rid);
    let id = rid || base.id;
    if (isNew && usedIds.has(id)) id = uid("text");
    usedIds.add(id);
    const merged: TextElement = {
      ...base,
      id,
      locked: false, // AI never produces locked layers
      text: typeof rt.text === "string" ? rt.text : base.text,
      x: num(rt.x, base.x),
      y: num(rt.y, base.y),
      fontSize: clamp(num(rt.fontSize, base.fontSize), 4, 1200),
      color: hex(rt.color, base.color),
      fontFamily: typeof rt.fontFamily === "string" ? rt.fontFamily : base.fontFamily,
      fontWeight: rt.fontWeight ? String(rt.fontWeight) : base.fontWeight,
      align: (ALIGNS.includes(rt.align as string) ? rt.align : base.align) as TextAlign,
      originX: (ORIGIN_X.includes(rt.originX as string) ? rt.originX : base.originX) as OriginX,
      originY: (ORIGIN_Y.includes(rt.originY as string) ? rt.originY : base.originY) as OriginY,
      width: clamp(num(rt.width, base.width), 0, current.width * 2),
      opacity: clamp(num(rt.opacity, base.opacity), 0, 1),
    };
    if (isNew) newTextEls.push(merged);
    else mergedById.set(id, merged);
  }
  // Rebuild preserving current order: locked stay original and are never dropped;
  // unlocked use the AI's version when present (omission = AI deleted it); new appended.
  const textElements: TextElement[] = [];
  for (const cur of current.textElements) {
    if (cur.locked) textElements.push(cur);
    else if (mergedById.has(cur.id)) textElements.push(mergedById.get(cur.id)!);
  }
  textElements.push(...newTextEls);

  // Apply geometry to existing images by id; keep images the model didn't mention.
  const byId = new Map((raw.imageElements ?? []).filter((i) => i.id).map((i) => [i.id as string, i]));
  const imageElements = (current.imageElements ?? []).map((img) => {
    if (img.locked) return img; // never apply AI changes to a locked image
    const r = byId.get(img.id);
    if (!r) return img;
    return {
      ...img,
      x: num(r.x, img.x),
      y: num(r.y, img.y),
      width: clamp(num(r.width, img.width), 20, current.width * 2),
      height: clamp(num(r.height, img.height), 20, current.height * 2),
      opacity: clamp(num(r.opacity, img.opacity), 0, 1),
    };
  });

  return { ...current, background, textElements, imageElements };
}

export async function editCanvas(payload: {
  instruction: string;
  canvas: CanvasItem;
  history: AssistantMessage[];
  model: CopyModel;
  images?: string[];
}): Promise<{ summary: string; proposed: CanvasItem }> {
  const res = await fetch("/api/canvas-edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instruction: payload.instruction,
      canvas: sanitize(payload.canvas),
      history: payload.history,
      model: payload.model,
      images: payload.images ?? [],
    }),
  });
  const data = await res.json().catch(() => null);
  if (!data) throw new Error("No response from the assistant service.");
  if (!data.ok) throw new Error(data.error || "Assistant request failed.");
  const proposed = merge(payload.canvas, (data.canvas ?? {}) as RawCanvas);
  return { summary: typeof data.summary === "string" ? data.summary : "Updated the canvas.", proposed };
}

// Streaming variant: surfaces thinking + the resumable session live, then merges
// the final proposal exactly like editCanvas. Used by the ChatSidebar runTurn.
export async function editCanvasStream(
  payload: { instruction: string; canvas: CanvasItem; history: AssistantMessage[]; model: CopyModel; images?: string[]; resume?: string | null },
  handlers: AgentStreamHandlers = {},
): Promise<{ summary: string; proposed: CanvasItem; sessionId: string | null }> {
  const { text, sessionId } = await streamAgentEdit(
    "/api/canvas-edit",
    {
      instruction: payload.instruction,
      canvas: sanitize(payload.canvas),
      history: payload.history,
      model: payload.model,
      images: payload.images ?? [],
      resume: payload.resume ?? undefined,
    },
    handlers,
  );
  const data = extractJsonObject(text) as { summary?: unknown; canvas?: RawCanvas };
  const proposed = merge(payload.canvas, (data.canvas ?? {}) as RawCanvas);
  return { summary: typeof data.summary === "string" ? data.summary : "Updated the canvas.", proposed, sessionId };
}
