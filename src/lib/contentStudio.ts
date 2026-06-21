// Content Studio — data model, canvas sizes, and localStorage persistence.
// Frontend-only; no backend involved.

export type AspectRatio = "1:1" | "16:9" | "9:16";

export const CANVAS_SIZES: Record<AspectRatio, { w: number; h: number; label: string }> = {
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

export type TextAlign = "left" | "center" | "right" | "justify";
export type OriginX = "left" | "center" | "right";
export type OriginY = "top" | "center" | "bottom";

export interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  fontWeight: string;
  align: TextAlign;
  originX: OriginX;
  originY: OriginY;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  locked?: boolean; // when true: not editable by the user or the AI
}

export interface ImageElement {
  id: string;
  src: string; // data URL
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  naturalRatio: number; // width / height of the source, for aspect-locked resize
  locked?: boolean; // when true: not editable by the user or the AI
}

export type ShapeType = "rect" | "rounded-rect" | "ellipse" | "triangle" | "line" | "star";

export interface ShapeElement {
  id: string;
  shapeType: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;   // used by rounded-rect
  opacity: number;
  locked?: boolean;
}

export interface Background {
  type: "solid" | "gradient" | "image";
  color: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number; // degrees
  src: string | null; // data URL for image backgrounds
  opacity: number;
}

export interface CanvasItem {
  id: string;
  name: string;
  aspectRatio: AspectRatio;
  width: number;
  height: number;
  textElements: TextElement[];
  imageElements: ImageElement[];
  shapeElements: ShapeElement[];
  background: Background;
}

export interface Project {
  id: string;
  name: string;
  canvases: CanvasItem[];
  createdAt: number;
  updatedAt: number;
}

export function uid(prefix = "id"): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `${prefix}_${crypto.randomUUID()}`;
    }
  } catch {
    /* noop */
  }
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function defaultBackground(): Background {
  return {
    type: "solid",
    color: "#0f172a",
    gradientFrom: "#6366f1",
    gradientTo: "#ec4899",
    gradientAngle: 135,
    src: null,
    opacity: 1,
  };
}

export function newTextElement(canvas: CanvasItem, text = "Double-click to edit"): TextElement {
  const fontSize = Math.round(canvas.width * 0.06);
  return {
    id: uid("text"),
    text,
    x: canvas.width / 2,
    y: canvas.height / 2,
    fontSize,
    color: "#ffffff",
    fontFamily: "Montserrat",
    fontWeight: "700",
    align: "center",
    originX: "center",
    originY: "center",
    width: Math.round(canvas.width * 0.8),
    height: 0,
    opacity: 1,
    rotation: 0,
    locked: false,
  };
}

export function newImageElement(
  canvas: CanvasItem,
  src: string,
  naturalW: number,
  naturalH: number
): ImageElement {
  const ratio = naturalH > 0 ? naturalW / naturalH : 1;
  let width = canvas.width * 0.5;
  let height = width / ratio;
  if (height > canvas.height * 0.8) {
    height = canvas.height * 0.8;
    width = height * ratio;
  }
  return {
    id: uid("img"),
    src,
    x: (canvas.width - width) / 2,
    y: (canvas.height - height) / 2,
    width,
    height,
    opacity: 1,
    naturalRatio: ratio,
    locked: false,
  };
}

export function newShapeElement(canvas: CanvasItem, shapeType: ShapeType = "rect"): ShapeElement {
  const size = Math.round(Math.min(canvas.width, canvas.height) * 0.3);
  return {
    id: uid("shape"),
    shapeType,
    x: Math.round((canvas.width - size) / 2),
    y: Math.round((canvas.height - size) / 2),
    width: shapeType === "line" ? size * 2 : size,
    height: shapeType === "line" ? Math.round(size * 0.02) + 8 : size,
    fill: "#6366f1",
    fillOpacity: 1,
    stroke: "#ffffff",
    strokeWidth: 0,
    cornerRadius: 24,
    opacity: 1,
    locked: false,
  };
}

export function newCanvas(aspectRatio: AspectRatio, name?: string): CanvasItem {
  const size = CANVAS_SIZES[aspectRatio];
  return {
    id: uid("canvas"),
    name: name || size.label,
    aspectRatio,
    width: size.w,
    height: size.h,
    textElements: [],
    imageElements: [],
    shapeElements: [],
    background: defaultBackground(),
  };
}

export function newProject(name = "Untitled project", aspectRatio: AspectRatio = "1:1"): Project {
  const now = Date.now();
  return {
    id: uid("project"),
    name,
    canvases: [newCanvas(aspectRatio)],
    createdAt: now,
    updatedAt: now,
  };
}

// Build a fresh canvas from a stored template's canvas JSON (new ids throughout).
export function canvasFromTemplate(tpl: Partial<CanvasItem>, name?: string): CanvasItem {
  const ratio = (ASPECT_RATIOS.includes(tpl.aspectRatio as AspectRatio)
    ? (tpl.aspectRatio as AspectRatio)
    : "1:1") as AspectRatio;
  const size = CANVAS_SIZES[ratio];
  const base: CanvasItem = {
    id: uid("canvas"),
    name: name ?? tpl.name ?? size.label,
    aspectRatio: ratio,
    width: tpl.width || size.w,
    height: tpl.height || size.h,
    textElements: [],
    imageElements: [],
    shapeElements: [],
    background: { ...defaultBackground(), ...(tpl.background ?? {}) },
  };
  base.textElements = (tpl.textElements ?? []).map((e) => ({
    ...newTextElement(base),
    ...e,
    id: uid("text"),
    locked: false,
  }));
  base.imageElements = (tpl.imageElements ?? []).map((e) => ({ ...e, id: uid("img"), locked: false }));
  base.shapeElements = ((tpl as Partial<CanvasItem>).shapeElements ?? []).map((e) => ({ ...e, id: uid("shape"), locked: false }));
  return base;
}
