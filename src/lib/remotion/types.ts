// Remotion Video Studio — data model (schema v2, full rewrite of the old
// canvas/ffmpeg model). A Project is a list of Scenes; each Scene renders one
// Template (an AI-written Remotion React component) with a set of prop values.
// Templates travel *with* the project so a saved video is fully self-describing
// for re-render. As of the layer editor, a Scene is a layer graph; a template is
// one ComponentLayer (see ./layers).

import type { Layer, SceneBackground, SceneGroup } from "./layers";

export type AspectRatio = "1:1" | "16:9" | "9:16";

export type SceneTransition = "none" | "fade" | "slide" | "wipe";

export const SCENE_TRANSITIONS: SceneTransition[] = ["none", "fade", "slide", "wipe"];

/** A single editable input a template exposes (for the inspector + the AI). */
export type PropFieldType =
  | "text"
  | "longtext"
  | "color"
  | "number"
  | "image"
  | "video"
  | "select";

export interface PropField {
  key: string;
  type: PropFieldType;
  label: string;
  default: string | number;
  // number
  min?: number;
  max?: number;
  step?: number;
  // select
  options?: string[];
  // longtext
  multiline?: boolean;
}

export type PropsSchema = PropField[];

/** Resolved values passed to a template at runtime, keyed by PropField.key.
 *  Media fields (image/video) hold a URL string. */
export type PropValues = Record<string, string | number>;

/** A media asset referenced by URL (never a data URL once persisted — the
 *  render service must be able to fetch it). */
export interface MediaRef {
  id: string;
  kind: "image" | "video";
  url: string;
  name?: string;
}

// ---------- v3 flat-timeline model (Premiere-style) ----------
// A Project is a set of TRACKS (rows) holding CLIPS placed at GLOBAL frames.
// Each Clip wraps the existing Layer payload; keyframes inside layer.transform
// stay CLIP-LOCAL (0 at the clip's start), so the keyframe engine + LayerView
// render unchanged — only a clip's POSITION is global. See migrateV3.ts.

export type TrackKind = "video" | "audio";

/** A timeline row. Video tracks hold visual/component clips (z-order by track
 *  order then start); audio tracks hold audio clips. */
export interface Track {
  id: string;
  kind: TrackKind;
  name: string; // "V1" | "V2" | "A1" ...
  hidden?: boolean; // video: skip in render
  locked?: boolean; // editor: no edits
  muted?: boolean; // audio: render at volume 0
}

/** A placed clip: an existing Layer + its global timeline position. */
export interface Clip {
  id: string; // selection key; distinct from layer.id
  trackId: string;
  layer: Layer; // existing union (text/image/video/shape/component/audio)
  startFrame: number; // GLOBAL timeline frame
  durationInFrames: number; // end = startFrame + durationInFrames
}

/** A non-rendering label/marker on the ruler (the old "Scene"). */
export interface Section {
  id: string;
  name: string;
  startFrame: number;
  color?: string;
}

/** One painted background span. Gaps between segments render black. */
export interface BackgroundSegment {
  id: string;
  startFrame: number;
  durationInFrames: number;
  background: SceneBackground;
}

/** The project-level background timeline, beneath all clips. */
export interface BackgroundTrack {
  segments: BackgroundSegment[];
}

export interface Scene {
  id: string;
  durationInFrames: number;
  transition: SceneTransition;
  /** Blend INTO this scene from the previous one (frames). */
  transitionDurationInFrames: number;
  /** Scene-level background painted beneath all layers. */
  background?: SceneBackground;
  /** The editable layer graph (text/image/video/shape/component). */
  layers?: Layer[];
  /** Organizational folders over layers (M4C). */
  groups?: SceneGroup[];
  // --- transient (AI preset reuse, not persisted): when the AI reuses a saved
  // scene preset it returns just these; the editor expands them into real layers
  // at apply time. `presetTexts` replace the preset's text layers in order. ---
  presetId?: string;
  presetTexts?: string[];
  // --- legacy (schema v2.0): a scene used to be one template + props. Kept
  // optional so old rows still load; `fromRow` migrates them into a layer. ---
  templateId?: string;
  props?: PropValues;
}

export interface Template {
  id: string;
  name: string;
  /** Raw TSX: no imports, default-exports a React.FC<{ props }>. */
  code: string;
  propsSchema: PropsSchema;
  /** Self-contained values that make the library loop-preview look good. */
  previewProps: PropValues;
  /** Keywords the AI matches against when picking a template to reuse. */
  tags?: string[];
  /** One-line description (mirrors the DB column; aids AI selection). */
  description?: string;
}

export interface Project {
  schemaVersion: 3;
  id: string;
  name: string;
  fps: number;
  width: number;
  height: number;
  /** Master timeline length in frames (explicit in v3). */
  durationInFrames: number;
  /** v3 flat-timeline model — source of truth for the new editor + renderer. */
  tracks: Track[];
  clips: Clip[];
  background: BackgroundTrack;
  sections?: Section[];
  templates: Template[];
  assets?: MediaRef[];
}

/** A Project plus a derived `scenes[]` view — the shape the scene-based AI
 *  assistant consumes/returns (built via flattenToScenes). The flat model is the
 *  source of truth; scenes are a transient/serialized view, never the editor's. */
export type ScenesProject = Project & { scenes: Scene[] };

export const DEFAULT_FPS = 30;

export const ASPECT_DIMENSIONS: Record<AspectRatio, { width: number; height: number; label: string }> = {
  "1:1": { width: 1080, height: 1080, label: "Square 1:1" },
  "16:9": { width: 1920, height: 1080, label: "Landscape 16:9" },
  "9:16": { width: 1080, height: 1920, label: "Vertical 9:16" },
};

export function aspectOf(project: Pick<Project, "width" | "height">): AspectRatio {
  const r = project.width / project.height;
  if (Math.abs(r - 1) < 0.05) return "1:1";
  return r > 1 ? "16:9" : "9:16";
}
