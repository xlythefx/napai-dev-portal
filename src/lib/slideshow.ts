// Slideshow Studio — data model, animation presets, and framer-motion derivation.
//
// This is a SEPARATE model from Content Studio's canvas painter (contentStudio.ts).
// Slides render as DOM + framer-motion (live animation), so coordinates use the CSS
// box model (top-left origin in deck pixels) and animations are stored as NAMED
// presets + numeric params — never raw framer-motion objects — so both the runtime
// renderer and a future server/MP4 renderer can interpret them.

import { uid, type CanvasItem } from "./contentStudio";
export { uid };

// ---- Aspect / resolution (shared concept with Content Studio) ---------------

export type AspectRatio = "1:1" | "16:9" | "9:16";

export const DECK_SIZES: Record<AspectRatio, { w: number; h: number; label: string }> = {
  "1:1": { w: 1080, h: 1080, label: "Square 1:1" },
  "16:9": { w: 1920, h: 1080, label: "Landscape 16:9" },
  "9:16": { w: 1080, h: 1920, label: "Vertical 9:16" },
};

export const ASPECT_RATIOS: AspectRatio[] = ["1:1", "16:9", "9:16"];

export const FONT_FAMILIES = [
  "Montserrat",
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Poppins",
  "Playfair Display",
  "Oswald",
];

export const FONT_WEIGHTS = ["300", "400", "500", "600", "700", "800", "900"];

// ---- Animation primitives (declarative presets) -----------------------------

export type Easing =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "anticipate"
  | "backOut";

export const EASINGS: Easing[] = ["linear", "easeIn", "easeOut", "easeInOut", "anticipate", "backOut"];

export type EnterAnimation =
  | "none"
  | "fadeIn"
  | "slideInLeft"
  | "slideInRight"
  | "slideInUp"
  | "slideInDown"
  | "scaleIn"
  | "popIn"
  | "blurIn"
  | "rotateIn"
  | "typewriter"; // phase 2 — falls back to fadeIn in the renderer

export const ENTER_ANIMATIONS: EnterAnimation[] = [
  "none",
  "fadeIn",
  "slideInLeft",
  "slideInRight",
  "slideInUp",
  "slideInDown",
  "scaleIn",
  "popIn",
  "blurIn",
  "rotateIn",
  "typewriter",
];

export type ExitAnimation =
  | "none"
  | "fadeOut"
  | "slideOutLeft"
  | "slideOutRight"
  | "slideOutUp"
  | "slideOutDown"
  | "scaleOut"
  | "blurOut";

export const EXIT_ANIMATIONS: ExitAnimation[] = [
  "none",
  "fadeOut",
  "slideOutLeft",
  "slideOutRight",
  "slideOutUp",
  "slideOutDown",
  "scaleOut",
  "blurOut",
];

export type EmphasisAnimation =
  | "none"
  | "pulse"
  | "float"
  | "shake"
  | "wiggle"
  | "glow"
  | "kenBurns";

export const EMPHASIS_ANIMATIONS: EmphasisAnimation[] = [
  "none",
  "pulse",
  "float",
  "shake",
  "wiggle",
  "glow",
  "kenBurns",
];

export type SlideTransition =
  | "none"
  | "fade"
  | "slideLeft"
  | "slideUp"
  | "zoom"
  | "wipeLeft"
  | "dissolve";

export const SLIDE_TRANSITIONS: SlideTransition[] = [
  "none",
  "fade",
  "slideLeft",
  "slideUp",
  "zoom",
  "wipeLeft",
  "dissolve",
];

export interface ElementAnimation {
  enter: EnterAnimation;
  enterDurationMs: number; // default 600
  enterDelayMs: number; // default 0 (relative to slide start)
  enterEasing: Easing; // default "easeOut"
  emphasis: EmphasisAnimation; // loops while the element is on screen
  emphasisDurationMs: number; // default 2000 (one cycle)
  exit: ExitAnimation; // default "none"
  exitDurationMs: number; // default 400
}

// ---- Element types (discriminated union) ------------------------------------

export type ElementType = "text" | "image" | "shape";
export type TextAlign = "left" | "center" | "right";
export type ShapeKind = "rect" | "circle" | "line";
export type ImageFit = "cover" | "contain";

interface BaseElement {
  id: string;
  type: ElementType;
  x: number; // top-left, deck pixel coords (CSS box model)
  y: number;
  width: number;
  height: number;
  rotation: number; // deg
  opacity: number; // 0..1 base opacity (animations multiply on top)
  zIndex: number; // explicit paint order
  animation: ElementAnimation;
}

export interface SlideTextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
  color: string;
  fontFamily: string;
  fontWeight: string;
  align: TextAlign;
  lineHeight: number; // default 1.2
  letterSpacing: number; // px, default 0
}

export interface SlideImageElement extends BaseElement {
  type: "image";
  src: string; // data URL
  fit: ImageFit;
  borderRadius: number;
  naturalRatio: number; // width / height of source, for aspect-locked resize
}

export interface SlideShapeElement extends BaseElement {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number; // for rect
}

export type SlideElement = SlideTextElement | SlideImageElement | SlideShapeElement;

// ---- Slide & deck -----------------------------------------------------------

export interface SlideBackground {
  type: "solid" | "gradient" | "image";
  color: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number; // degrees
  src: string | null; // data URL for image backgrounds
  opacity: number;
}

export interface Slide {
  id: string;
  name: string;
  durationMs: number; // time on screen, default 4000
  background: SlideBackground;
  elements: SlideElement[];
  transitionIn: SlideTransition; // transition used when entering this slide
  transitionMs: number; // default 600
}

export interface DeckSettings {
  aspectRatio: AspectRatio;
  width: number; // derived from aspectRatio (denormalized like CanvasItem)
  height: number;
  fps: 24 | 30 | 60; // render hint used by the exporter
  backgroundAudio: string | null; // reserved (null in v1)
}

export interface Slideshow {
  id: string;
  name: string;
  settings: DeckSettings;
  slides: Slide[];
  createdAt: number;
  updatedAt: number;
}

// ---- Preset -> framer-motion derivation -------------------------------------

type MotionTarget = Record<string, number | string | number[] | string[]>;

export interface ElementMotion {
  initial: MotionTarget;
  animate: MotionTarget;
  exit: MotionTarget;
  transition: Record<string, unknown>;
  /** Looping emphasis applied on a nested layer so it never conflicts with enter. */
  emphasis: { animate: MotionTarget; transition: Record<string, unknown> } | null;
}

const EASE_MAP: Record<Easing, string | number[]> = {
  linear: "linear",
  easeIn: "easeIn",
  easeOut: "easeOut",
  easeInOut: "easeInOut",
  anticipate: "anticipate",
  backOut: [0.34, 1.56, 0.64, 1],
};

function enterTargets(a: ElementAnimation): { initial: MotionTarget; animate: MotionTarget } {
  const enter = a.enter === "typewriter" ? "fadeIn" : a.enter; // phase-2 fallback
  switch (enter) {
    case "fadeIn":
      return { initial: { opacity: 0 }, animate: { opacity: 1 } };
    case "slideInLeft":
      return { initial: { opacity: 0, x: -80 }, animate: { opacity: 1, x: 0 } };
    case "slideInRight":
      return { initial: { opacity: 0, x: 80 }, animate: { opacity: 1, x: 0 } };
    case "slideInUp":
      return { initial: { opacity: 0, y: 80 }, animate: { opacity: 1, y: 0 } };
    case "slideInDown":
      return { initial: { opacity: 0, y: -80 }, animate: { opacity: 1, y: 0 } };
    case "scaleIn":
      return { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 } };
    case "popIn":
      return { initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1 } };
    case "blurIn":
      return { initial: { opacity: 0, filter: "blur(12px)" }, animate: { opacity: 1, filter: "blur(0px)" } };
    case "rotateIn":
      return { initial: { opacity: 0, rotate: -12, scale: 0.9 }, animate: { opacity: 1, rotate: 0, scale: 1 } };
    case "none":
    default:
      return { initial: {}, animate: {} };
  }
}

function exitTargets(a: ElementAnimation): MotionTarget {
  switch (a.exit) {
    case "fadeOut":
      return { opacity: 0 };
    case "slideOutLeft":
      return { opacity: 0, x: -80 };
    case "slideOutRight":
      return { opacity: 0, x: 80 };
    case "slideOutUp":
      return { opacity: 0, y: -80 };
    case "slideOutDown":
      return { opacity: 0, y: 80 };
    case "scaleOut":
      return { opacity: 0, scale: 0.8 };
    case "blurOut":
      return { opacity: 0, filter: "blur(12px)" };
    case "none":
    default:
      return {};
  }
}

function emphasisSpec(a: ElementAnimation): ElementMotion["emphasis"] {
  const duration = Math.max(0.2, a.emphasisDurationMs / 1000);
  const loop = { repeat: Infinity, duration, ease: "easeInOut" as const };
  switch (a.emphasis) {
    case "pulse":
      return { animate: { scale: [1, 1.05, 1] }, transition: loop };
    case "float":
      return { animate: { y: [0, -10, 0] }, transition: loop };
    case "shake":
      return { animate: { x: [0, -6, 6, -6, 6, 0] }, transition: { ...loop, ease: "linear" } };
    case "wiggle":
      return { animate: { rotate: [0, -3, 3, -3, 3, 0] }, transition: { ...loop, ease: "linear" } };
    case "glow":
      return {
        animate: {
          filter: [
            "drop-shadow(0 0 0px rgba(99,102,241,0))",
            "drop-shadow(0 0 18px rgba(99,102,241,0.85))",
            "drop-shadow(0 0 0px rgba(99,102,241,0))",
          ],
        },
        transition: loop,
      };
    case "kenBurns":
      return { animate: { scale: [1, 1.12, 1] }, transition: { ...loop, duration: Math.max(duration, 6) } };
    case "none":
    default:
      return null;
  }
}

/** Build the enter/exit/emphasis motion for one element (play mode). */
export function buildVariants(a: ElementAnimation): ElementMotion {
  const { initial, animate } = enterTargets(a);
  return {
    initial,
    animate,
    exit: exitTargets(a),
    transition: {
      duration: Math.max(0, a.enterDurationMs / 1000),
      delay: Math.max(0, a.enterDelayMs / 1000),
      ease: EASE_MAP[a.enterEasing] ?? "easeOut",
    },
    emphasis: emphasisSpec(a),
  };
}

/** Build the slide-level transition for AnimatePresence between slides. */
export function slideTransitionSpec(t: SlideTransition, ms: number): ElementMotion {
  const transition = { duration: Math.max(0, ms / 1000), ease: "easeInOut" as const };
  const base: ElementMotion = { initial: {}, animate: {}, exit: {}, transition, emphasis: null };
  switch (t) {
    case "fade":
    case "dissolve":
      return { ...base, initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
    case "slideLeft":
      return { ...base, initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "-100%" } };
    case "slideUp":
      return { ...base, initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "-100%" } };
    case "zoom":
      return {
        ...base,
        initial: { opacity: 0, scale: 1.1 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
      };
    case "wipeLeft":
      return {
        ...base,
        initial: { clipPath: "inset(0 100% 0 0)" },
        animate: { clipPath: "inset(0 0% 0 0)" },
        exit: { opacity: 0 },
      };
    case "none":
    default:
      return base;
  }
}

/** CSS for a slide/deck background (mirrors Content Studio's gradient mapping). */
export function backgroundCss(bg: SlideBackground): React.CSSProperties {
  if (bg.type === "image" && bg.src) {
    return { backgroundImage: `url(${bg.src})`, backgroundSize: "cover", backgroundPosition: "center", opacity: bg.opacity };
  }
  if (bg.type === "gradient") {
    return { background: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})`, opacity: bg.opacity };
  }
  return { backgroundColor: bg.color, opacity: bg.opacity };
}

// ---- Factories (mirror contentStudio.ts naming) -----------------------------

export function defaultAnimation(): ElementAnimation {
  return {
    enter: "fadeIn",
    enterDurationMs: 600,
    enterDelayMs: 0,
    enterEasing: "easeOut",
    emphasis: "none",
    emphasisDurationMs: 2000,
    exit: "none",
    exitDurationMs: 400,
  };
}

export function defaultBackground(): SlideBackground {
  return {
    type: "gradient",
    color: "#0f172a",
    gradientFrom: "#1e1b4b",
    gradientTo: "#312e81",
    gradientAngle: 145,
    src: null,
    opacity: 1,
  };
}

function nextZ(elements: SlideElement[]): number {
  return elements.reduce((max, e) => Math.max(max, e.zIndex), 0) + 1;
}

export function newTextElement(deck: DeckSettings, text = "Double-click to edit"): SlideTextElement {
  const fontSize = Math.round(deck.width * 0.06);
  const width = Math.round(deck.width * 0.8);
  return {
    id: uid("el"),
    type: "text",
    text,
    x: Math.round((deck.width - width) / 2),
    y: Math.round(deck.height / 2 - fontSize),
    width,
    height: Math.round(fontSize * 1.4),
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    animation: defaultAnimation(),
    fontSize,
    color: "#ffffff",
    fontFamily: "Montserrat",
    fontWeight: "800",
    align: "center",
    lineHeight: 1.2,
    letterSpacing: 0,
  };
}

export function newImageElement(
  deck: DeckSettings,
  src: string,
  naturalW: number,
  naturalH: number
): SlideImageElement {
  const ratio = naturalH > 0 ? naturalW / naturalH : 1;
  let width = deck.width * 0.5;
  let height = width / ratio;
  if (height > deck.height * 0.8) {
    height = deck.height * 0.8;
    width = height * ratio;
  }
  return {
    id: uid("el"),
    type: "image",
    src,
    fit: "cover",
    borderRadius: 0,
    naturalRatio: ratio,
    x: Math.round((deck.width - width) / 2),
    y: Math.round((deck.height - height) / 2),
    width: Math.round(width),
    height: Math.round(height),
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    animation: defaultAnimation(),
  };
}

export function newShapeElement(deck: DeckSettings, shape: ShapeKind): SlideShapeElement {
  const size = Math.round(deck.width * 0.25);
  return {
    id: uid("el"),
    type: "shape",
    shape,
    fill: shape === "line" ? "transparent" : "#6366f1",
    stroke: "#ffffff",
    strokeWidth: shape === "line" ? 8 : 0,
    borderRadius: shape === "rect" ? 24 : 0,
    x: Math.round((deck.width - size) / 2),
    y: Math.round((deck.height - size) / 2),
    width: size,
    height: shape === "line" ? 8 : size,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    animation: defaultAnimation(),
  };
}

export function newSlide(deck: DeckSettings, name?: string): Slide {
  return {
    id: uid("slide"),
    name: name || "Slide",
    durationMs: 4000,
    background: defaultBackground(),
    elements: [],
    transitionIn: "fade",
    transitionMs: 600,
  };
}

// Convert a Content Studio template (CanvasItem) into a slide. Anchored canvas
// text (originX/originY) is mapped to the slide's top-left box model; positions
// scale if the template's aspect differs from the deck.
export function slideFromCanvasTemplate(canvas: CanvasItem, settings: DeckSettings, name?: string): Slide {
  const slide = newSlide(settings, name || canvas.name || "Slide");
  slide.background = {
    type: canvas.background.type,
    color: canvas.background.color,
    gradientFrom: canvas.background.gradientFrom,
    gradientTo: canvas.background.gradientTo,
    gradientAngle: canvas.background.gradientAngle,
    src: canvas.background.src,
    opacity: canvas.background.opacity ?? 1,
  };
  const sx = settings.width / (canvas.width || settings.width);
  const sy = settings.height / (canvas.height || settings.height);
  const elements: SlideElement[] = [];
  let z = 1;

  (canvas.imageElements ?? []).forEach((img, i) => {
    const base = newImageElement(settings, img.src, 1, 1);
    elements.push({
      ...base,
      src: img.src,
      naturalRatio: img.naturalRatio || 1,
      x: Math.round(img.x * sx),
      y: Math.round(img.y * sy),
      width: Math.round(img.width * sx),
      height: Math.round(img.height * sy),
      opacity: img.opacity ?? 1,
      zIndex: z++,
      animation: { ...defaultAnimation(), enter: "scaleIn", enterDelayMs: Math.min(800, i * 120) },
    });
  });

  (canvas.textElements ?? []).forEach((t, i) => {
    const wUnscaled = t.width > 0 ? t.width : canvas.width * 0.8;
    const lines = t.text
      .split("\n")
      .reduce((n, line) => n + Math.max(1, Math.ceil((line.length * t.fontSize * 0.5) / Math.max(1, wUnscaled))), 0);
    const blockH = t.fontSize * 1.3 * lines;
    let x = t.x;
    if (t.originX === "center") x -= wUnscaled / 2;
    else if (t.originX === "right") x -= wUnscaled;
    let y = t.y;
    if (t.originY === "center") y -= blockH / 2;
    else if (t.originY === "bottom") y -= blockH;
    const base = newTextElement(settings, t.text);
    elements.push({
      ...base,
      text: t.text,
      x: Math.round(x * sx),
      y: Math.round(y * sy),
      width: Math.round(wUnscaled * sx),
      height: Math.round(blockH * sy),
      fontSize: Math.max(8, Math.round(t.fontSize * sy)),
      color: t.color,
      fontFamily: t.fontFamily,
      fontWeight: t.fontWeight,
      align: (t.align === "justify" ? "left" : t.align) as TextAlign,
      opacity: t.opacity ?? 1,
      rotation: t.rotation ?? 0,
      zIndex: z++,
      animation: { ...defaultAnimation(), enter: i === 0 ? "slideInUp" : "fadeIn", enterDelayMs: Math.min(900, i * 150) },
    });
  });

  slide.elements = elements;
  return slide;
}

export function deckSettings(aspectRatio: AspectRatio): DeckSettings {
  const size = DECK_SIZES[aspectRatio];
  return { aspectRatio, width: size.w, height: size.h, fps: 30, backgroundAudio: null };
}

export function newDeck(name = "Untitled slideshow", aspectRatio: AspectRatio = "16:9"): Slideshow {
  const now = Date.now();
  const settings = deckSettings(aspectRatio);
  const slide = newSlide(settings, "Slide 1");
  // Give the first slide a friendly starter headline.
  slide.elements = [{ ...newTextElement(settings, "Your headline"), animation: { ...defaultAnimation(), enter: "slideInUp" } }];
  return {
    id: uid("deck"),
    name,
    settings,
    slides: [slide],
    createdAt: now,
    updatedAt: now,
  };
}

const ENTER_SET = new Set<string>(ENTER_ANIMATIONS);
const EXIT_SET = new Set<string>(EXIT_ANIMATIONS);
const EMPHASIS_SET = new Set<string>(EMPHASIS_ANIMATIONS);
const EASING_SET = new Set<string>(EASINGS);
const TRANSITION_SET = new Set<string>(SLIDE_TRANSITIONS);

/** Normalize a possibly-partial animation block into a valid ElementAnimation. */
export function normalizeAnimation(a?: Partial<ElementAnimation> | null): ElementAnimation {
  const d = defaultAnimation();
  if (!a || typeof a !== "object") return d;
  return {
    enter: ENTER_SET.has(a.enter as string) ? (a.enter as EnterAnimation) : d.enter,
    enterDurationMs: clampNum(a.enterDurationMs, 0, 10000, d.enterDurationMs),
    enterDelayMs: clampNum(a.enterDelayMs, 0, 60000, d.enterDelayMs),
    enterEasing: EASING_SET.has(a.enterEasing as string) ? (a.enterEasing as Easing) : d.enterEasing,
    emphasis: EMPHASIS_SET.has(a.emphasis as string) ? (a.emphasis as EmphasisAnimation) : d.emphasis,
    emphasisDurationMs: clampNum(a.emphasisDurationMs, 100, 20000, d.emphasisDurationMs),
    exit: EXIT_SET.has(a.exit as string) ? (a.exit as ExitAnimation) : d.exit,
    exitDurationMs: clampNum(a.exitDurationMs, 0, 10000, d.exitDurationMs),
  };
}

export function isValidTransition(t: unknown): t is SlideTransition {
  return typeof t === "string" && TRANSITION_SET.has(t);
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Build a fresh slide from a stored template (new ids throughout). */
export function slideFromTemplate(tpl: Partial<Slide>, deck: DeckSettings, name?: string): Slide {
  const base = newSlide(deck, name ?? tpl.name);
  base.durationMs = clampNum(tpl.durationMs, 500, 60000, base.durationMs);
  base.transitionIn = isValidTransition(tpl.transitionIn) ? tpl.transitionIn : base.transitionIn;
  base.transitionMs = clampNum(tpl.transitionMs, 0, 5000, base.transitionMs);
  base.background = { ...defaultBackground(), ...(tpl.background ?? {}) };
  base.elements = (tpl.elements ?? []).map((e) => ({
    ...e,
    id: uid("el"),
    animation: normalizeAnimation(e.animation),
  })) as SlideElement[];
  return base;
}

/** Total deck duration in ms (sum of slides + their transitions). */
export function deckDurationMs(deck: Slideshow): number {
  return deck.slides.reduce((sum, s) => sum + s.durationMs + s.transitionMs, 0);
}

// ---- Predetermined starter decks (client-side templates) --------------------

function tplText(over: Partial<SlideTextElement>): Partial<SlideTextElement> {
  return { type: "text", fontFamily: "Montserrat", fontWeight: "800", color: "#ffffff", align: "center", lineHeight: 1.2, letterSpacing: 0, opacity: 1, rotation: 0, ...over };
}

export interface StarterDeck {
  id: string;
  name: string;
  description: string;
  aspectRatio: AspectRatio;
  build: () => Slide[];
}

export const STARTER_DECKS: StarterDeck[] = [
  {
    id: "product-launch",
    name: "Product Launch",
    description: "3-slide hype reel: hook, feature, call-to-action.",
    aspectRatio: "16:9",
    build: () => {
      const d = deckSettings("16:9");
      const hook = slideFromTemplate(
        {
          name: "Hook",
          durationMs: 3500,
          transitionIn: "fade",
          background: { ...defaultBackground(), type: "gradient", gradientFrom: "#0f172a", gradientTo: "#4338ca", gradientAngle: 135 },
          elements: [
            tplText({ text: "Introducing", x: 160, y: 380, width: 1600, fontSize: 70, fontWeight: "600", color: "#a5b4fc", align: "left", animation: { ...defaultAnimation(), enter: "fadeIn" } }) as SlideTextElement,
            tplText({ text: "The Next Big Thing", x: 160, y: 470, width: 1600, fontSize: 150, align: "left", animation: { ...defaultAnimation(), enter: "slideInLeft", enterDelayMs: 200 } }) as SlideTextElement,
          ],
        },
        d
      );
      const feature = slideFromTemplate(
        {
          name: "Feature",
          durationMs: 4000,
          transitionIn: "slideLeft",
          background: { ...defaultBackground(), type: "gradient", gradientFrom: "#312e81", gradientTo: "#0f172a", gradientAngle: 135 },
          elements: [
            tplText({ text: "Built for speed", x: 160, y: 460, width: 1600, fontSize: 120, align: "left", animation: { ...defaultAnimation(), enter: "slideInUp" } }) as SlideTextElement,
            tplText({ text: "Ship your ideas in record time.", x: 160, y: 640, width: 1500, fontSize: 56, fontWeight: "400", color: "#cbd5e1", align: "left", animation: { ...defaultAnimation(), enter: "fadeIn", enterDelayMs: 300 } }) as SlideTextElement,
          ],
        },
        d
      );
      const cta = slideFromTemplate(
        {
          name: "CTA",
          durationMs: 3500,
          transitionIn: "zoom",
          background: { ...defaultBackground(), type: "gradient", gradientFrom: "#6366f1", gradientTo: "#ec4899", gradientAngle: 135 },
          elements: [
            tplText({ text: "Get started today", x: 140, y: 470, width: 1640, fontSize: 130, animation: { ...defaultAnimation(), enter: "popIn", enterEasing: "backOut" }, emphasis: "none" }) as SlideTextElement,
            tplText({ text: "yourdomain.com", x: 140, y: 660, width: 1640, fontSize: 60, fontWeight: "500", color: "#fdf2f8", animation: { ...defaultAnimation(), enter: "fadeIn", enterDelayMs: 400, emphasis: "pulse" } }) as SlideTextElement,
          ],
        },
        d
      );
      return [hook, feature, cta];
    },
  },
  {
    id: "story-cover",
    name: "Story Teaser",
    description: "Vertical 9:16 teaser for reels/stories.",
    aspectRatio: "9:16",
    build: () => {
      const d = deckSettings("9:16");
      const cover = slideFromTemplate(
        {
          name: "Cover",
          durationMs: 3000,
          transitionIn: "fade",
          background: { ...defaultBackground(), type: "gradient", gradientFrom: "#111827", gradientTo: "#312e81", gradientAngle: 160 },
          elements: [
            tplText({ text: "EPISODE 01", x: 90, y: 760, width: 900, fontSize: 46, fontWeight: "600", color: "#a5b4fc", fontFamily: "Oswald", animation: { ...defaultAnimation(), enter: "fadeIn" } }) as SlideTextElement,
            tplText({ text: "The Future of AI", x: 80, y: 900, width: 920, fontSize: 120, animation: { ...defaultAnimation(), enter: "scaleIn", enterDelayMs: 200 } }) as SlideTextElement,
          ],
        },
        d
      );
      const point = slideFromTemplate(
        {
          name: "Point",
          durationMs: 3500,
          transitionIn: "slideUp",
          background: { ...defaultBackground(), type: "gradient", gradientFrom: "#1e1b4b", gradientTo: "#0f172a", gradientAngle: 160 },
          elements: [
            tplText({ text: "Swipe up to learn more", x: 80, y: 920, width: 920, fontSize: 80, animation: { ...defaultAnimation(), enter: "slideInUp", emphasis: "float" } }) as SlideTextElement,
          ],
        },
        d
      );
      return [cover, point];
    },
  },
  {
    id: "quote-square",
    name: "Quote",
    description: "Single animated square quote slide.",
    aspectRatio: "1:1",
    build: () => {
      const d = deckSettings("1:1");
      const quote = slideFromTemplate(
        {
          name: "Quote",
          durationMs: 4000,
          transitionIn: "fade",
          background: { ...defaultBackground(), type: "gradient", gradientFrom: "#6366f1", gradientTo: "#ec4899", gradientAngle: 135 },
          elements: [
            tplText({ text: "Design is how it works, not just how it looks.", x: 100, y: 380, width: 880, fontSize: 74, fontWeight: "700", fontFamily: "Playfair Display", animation: { ...defaultAnimation(), enter: "blurIn", enterDurationMs: 900 } }) as SlideTextElement,
            tplText({ text: "Your Name", x: 100, y: 720, width: 880, fontSize: 36, fontWeight: "500", color: "#fdf2f8", animation: { ...defaultAnimation(), enter: "fadeIn", enterDelayMs: 500 } }) as SlideTextElement,
          ],
        },
        d
      );
      return [quote];
    },
  },
];

export function deckFromStarter(starter: StarterDeck, name?: string): Slideshow {
  const now = Date.now();
  return {
    id: uid("deck"),
    name: name || starter.name,
    settings: deckSettings(starter.aspectRatio),
    slides: starter.build(),
    createdAt: now,
    updatedAt: now,
  };
}
