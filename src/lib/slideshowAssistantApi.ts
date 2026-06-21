import { API_BASE } from "./api";
import { uid } from "./contentStudio";
import { CopyModel } from "./copywriterApi";
import { streamAgentEdit, extractJsonObject, type AgentStreamHandlers } from "./jsonStream";
import {
  DeckSettings,
  ImageFit,
  ShapeKind,
  Slide,
  SlideBackground,
  SlideElement,
  SlideImageElement,
  SlideShapeElement,
  SlideTextElement,
  Slideshow,
  TextAlign,
  defaultBackground,
  isValidTransition,
  newShapeElement,
  newSlide,
  newTextElement,
  normalizeAnimation,
} from "./slideshow";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export type DeckEditScope = "slide" | "deck";

const FONT_SET = new Set(["Montserrat", "Inter", "Roboto", "Open Sans", "Lato", "Poppins", "Playfair Display", "Oswald"]);
const ALIGNS = new Set(["left", "center", "right"]);
const SHAPES = new Set<ShapeKind>(["rect", "circle", "line"]);

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

// Strip heavy image data URLs before sending the deck to the model.
function sanitizeDeck(deck: Slideshow) {
  return {
    settings: { width: deck.settings.width, height: deck.settings.height, aspectRatio: deck.settings.aspectRatio, fps: deck.settings.fps },
    slides: deck.slides.map((s) => ({
      id: s.id,
      name: s.name,
      durationMs: s.durationMs,
      transitionIn: s.transitionIn,
      transitionMs: s.transitionMs,
      background: { ...s.background, src: s.background.src ? "[image]" : null },
      elements: s.elements.map((e) =>
        e.type === "image" ? { ...e, src: "[image]" } : e
      ),
    })),
  };
}

type RawElement = Partial<Record<string, unknown>> & { id?: string; type?: string };
interface RawSlide {
  id?: string;
  name?: string;
  durationMs?: number;
  transitionIn?: string;
  transitionMs?: number;
  background?: Partial<SlideBackground>;
  elements?: RawElement[];
}

function mergeBackground(raw: Partial<SlideBackground> | undefined, current: SlideBackground): SlideBackground {
  const bg = raw ?? {};
  return {
    type: bg.type === "gradient" || bg.type === "image" ? bg.type : "solid",
    color: hex(bg.color, current.color),
    gradientFrom: hex(bg.gradientFrom, current.gradientFrom),
    gradientTo: hex(bg.gradientTo, current.gradientTo),
    gradientAngle: clamp(num(bg.gradientAngle, current.gradientAngle), 0, 360),
    src: current.src, // never let the model invent image data
    opacity: clamp(num(bg.opacity, current.opacity), 0, 1),
  };
}

function mergeCommon(raw: RawElement, base: SlideElement, settings: DeckSettings) {
  return {
    id: base.id,
    x: num(raw.x, base.x),
    y: num(raw.y, base.y),
    width: clamp(num(raw.width, base.width), 4, settings.width * 3),
    height: clamp(num(raw.height, base.height), 4, settings.height * 3),
    rotation: clamp(num(raw.rotation, base.rotation), -360, 360),
    opacity: clamp(num(raw.opacity, base.opacity), 0, 1),
    zIndex: num(raw.zIndex, base.zIndex),
    animation: normalizeAnimation((raw.animation as never) ?? base.animation),
  };
}

function mergeElement(raw: RawElement, base: SlideElement, settings: DeckSettings): SlideElement {
  const common = mergeCommon(raw, base, settings);
  if (base.type === "text") {
    return {
      ...base,
      ...common,
      type: "text",
      text: typeof raw.text === "string" ? raw.text : base.text,
      fontSize: clamp(num(raw.fontSize, base.fontSize), 4, 1200),
      color: hex(raw.color, base.color),
      fontFamily: FONT_SET.has(raw.fontFamily as string) ? (raw.fontFamily as string) : base.fontFamily,
      fontWeight: raw.fontWeight ? String(raw.fontWeight) : base.fontWeight,
      align: (ALIGNS.has(raw.align as string) ? raw.align : base.align) as TextAlign,
      lineHeight: clamp(num(raw.lineHeight, base.lineHeight), 0.5, 4),
      letterSpacing: clamp(num(raw.letterSpacing, base.letterSpacing), -20, 100),
    };
  }
  if (base.type === "image") {
    return {
      ...base,
      ...common,
      type: "image",
      src: base.src, // restore real pixels by id
      fit: (raw.fit === "contain" || raw.fit === "cover" ? raw.fit : base.fit) as ImageFit,
      borderRadius: clamp(num(raw.borderRadius, base.borderRadius), 0, 1000),
      naturalRatio: base.naturalRatio,
    };
  }
  return {
    ...base,
    ...common,
    type: "shape",
    shape: (SHAPES.has(raw.shape as ShapeKind) ? raw.shape : base.shape) as ShapeKind,
    fill: hex(raw.fill, base.fill),
    stroke: hex(raw.stroke, base.stroke),
    strokeWidth: clamp(num(raw.strokeWidth, base.strokeWidth), 0, 200),
    borderRadius: clamp(num(raw.borderRadius, base.borderRadius), 0, 1000),
  };
}

function newFromRaw(raw: RawElement, settings: DeckSettings): SlideElement | null {
  // The model may only add text or shape elements (never images).
  if (raw.type === "shape") {
    const shape = (SHAPES.has(raw.shape as ShapeKind) ? raw.shape : "rect") as ShapeKind;
    const base = newShapeElement(settings, shape);
    return mergeElement(raw, base, settings);
  }
  if (raw.type === "text" || raw.text !== undefined) {
    const base = newTextElement(settings);
    return mergeElement(raw, { ...base, id: uid("el") }, settings);
  }
  return null;
}

function mergeSlide(rawSlide: RawSlide, current: Slide, settings: DeckSettings): Slide {
  const currentById = new Map(current.elements.map((e) => [e.id, e]));
  const returnedIds = new Set<string>();
  const merged: SlideElement[] = [];

  for (const raw of rawSlide.elements ?? []) {
    const existing = raw.id ? currentById.get(raw.id) : undefined;
    if (existing) {
      returnedIds.add(existing.id);
      merged.push(mergeElement(raw, existing, settings));
    } else {
      const created = newFromRaw(raw, settings);
      if (created) merged.push(created);
    }
  }

  // Never drop existing images the model forgot to echo back.
  for (const el of current.elements) {
    if (el.type === "image" && !returnedIds.has(el.id)) merged.push(el);
  }

  return {
    ...current,
    name: typeof rawSlide.name === "string" && rawSlide.name.trim() ? rawSlide.name : current.name,
    durationMs: clamp(num(rawSlide.durationMs, current.durationMs), 500, 60000),
    transitionIn: isValidTransition(rawSlide.transitionIn) ? rawSlide.transitionIn : current.transitionIn,
    transitionMs: clamp(num(rawSlide.transitionMs, current.transitionMs), 0, 5000),
    background: mergeBackground(rawSlide.background, current.background),
    elements: merged.length ? merged : current.elements,
  };
}

// Build a brand-new slide from the model's raw output (deck-scope creation).
function newSlideFromRaw(raw: RawSlide, settings: DeckSettings): Slide {
  const base = newSlide(settings, typeof raw.name === "string" && raw.name.trim() ? raw.name : undefined);
  const elements: SlideElement[] = [];
  for (const rel of raw.elements ?? []) {
    const created = newFromRaw(rel, settings);
    if (created) elements.push(created);
  }
  return {
    ...base,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : base.name,
    durationMs: clamp(num(raw.durationMs, base.durationMs), 500, 60000),
    transitionIn: isValidTransition(raw.transitionIn) ? raw.transitionIn : base.transitionIn,
    transitionMs: clamp(num(raw.transitionMs, base.transitionMs), 0, 5000),
    background: mergeBackground(raw.background, base.background),
    elements: elements.length ? elements : base.elements,
  };
}

export type DeckProposal = { summary: string; proposedSlides: Slide[]; changedSlideIds: string[]; replace: boolean };

// Build the proposal from the model's parsed { summary, slides } against the deck.
// Shared by the non-streaming editDeck and the streaming editDeckStream.
function buildDeckProposal(
  data: { summary?: unknown; slides?: unknown },
  payload: { scope: DeckEditScope; targetSlideId: string; deck: Slideshow },
): DeckProposal {
  const settings = payload.deck.settings;
  const currentById = new Map(payload.deck.slides.map((s) => [s.id, s]));
  const currentIds = new Set(currentById.keys());
  const rawSlides: RawSlide[] = Array.isArray(data.slides) ? data.slides : [];

  // Slide scope: only the target slide may change; edit-by-id (never create).
  if (payload.scope === "slide") {
    const proposedSlides: Slide[] = [];
    const changedSlideIds: string[] = [];
    for (const raw of rawSlides) {
      if (raw.id !== payload.targetSlideId) continue;
      const current = currentById.get(raw.id);
      if (!current) continue;
      proposedSlides.push(mergeSlide(raw, current, settings));
      changedSlideIds.push(raw.id);
    }
    return {
      summary: typeof data.summary === "string" ? data.summary : "Updated the slide.",
      proposedSlides,
      changedSlideIds,
      replace: false,
    };
  }

  // Deck scope: the model returns the full intended ordered list. New slides
  // (ids not in the current deck, or missing ids) are created.
  const hasNew = rawSlides.some((r) => !r.id || !currentIds.has(r.id));
  const summary = typeof data.summary === "string" ? data.summary : "Updated the slideshow.";

  if (hasNew) {
    // Restructure: build the full new deck in the returned order.
    const proposedSlides = rawSlides.map((raw) => {
      const current = raw.id ? currentById.get(raw.id) : undefined;
      return current ? mergeSlide(raw, current, settings) : newSlideFromRaw(raw, settings);
    });
    return { summary, proposedSlides, changedSlideIds: proposedSlides.map((s) => s.id), replace: true };
  }

  // Edit-only: merge existing slides by id; never drop slides the model omitted.
  const proposedSlides: Slide[] = [];
  const changedSlideIds: string[] = [];
  for (const raw of rawSlides) {
    const current = raw.id ? currentById.get(raw.id) : undefined;
    if (!current) continue;
    proposedSlides.push(mergeSlide(raw, current, settings));
    changedSlideIds.push(current.id);
  }
  return { summary, proposedSlides, changedSlideIds, replace: false };
}

export async function editDeck(payload: {
  instruction: string;
  scope: DeckEditScope;
  targetSlideId: string;
  deck: Slideshow;
  history: AssistantMessage[];
  model: CopyModel;
  images?: string[];
}): Promise<DeckProposal> {
  // Dev: local Claude CLI bridge (free, via Vite plugin). Prod: PHP + Anthropic API.
  const endpoint = import.meta.env.DEV
    ? "/api/slideshow-edit"
    : `${API_BASE}/controllers/tools/content_slideshows/ai_edit.php`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instruction: payload.instruction,
      scope: payload.scope,
      targetSlideId: payload.targetSlideId,
      deck: sanitizeDeck(payload.deck),
      history: payload.history,
      model: payload.model,
      images: payload.images ?? [],
    }),
  });
  const data = await res.json().catch(() => null);
  if (!data) throw new Error("No response from the assistant service.");
  if (!data.ok) throw new Error(data.error || "Assistant request failed.");
  return buildDeckProposal(data, payload);
}

// Streaming variant (dev bridge): surfaces thinking + the resumable session live,
// then builds the proposal exactly like editDeck. Used by the ChatSidebar runTurn.
export async function editDeckStream(
  payload: { instruction: string; scope: DeckEditScope; targetSlideId: string; deck: Slideshow; history: AssistantMessage[]; model: CopyModel; images?: string[]; resume?: string | null },
  handlers: AgentStreamHandlers = {},
): Promise<DeckProposal & { sessionId: string | null }> {
  const { text, sessionId } = await streamAgentEdit(
    "/api/slideshow-edit",
    {
      instruction: payload.instruction,
      scope: payload.scope,
      targetSlideId: payload.targetSlideId,
      deck: sanitizeDeck(payload.deck),
      history: payload.history,
      model: payload.model,
      images: payload.images ?? [],
      resume: payload.resume ?? undefined,
    },
    handlers,
  );
  return { ...buildDeckProposal(extractJsonObject(text), payload), sessionId };
}
