// Factory + timing helpers for the Remotion video model.

import {
  ASPECT_DIMENSIONS,
  DEFAULT_FPS,
  type AspectRatio,
  type Project,
  type PropField,
  type PropValues,
  type Scene,
  type Template,
} from "./types";
import { defaultBackground, newComponentLayer, type Layer, type SceneBackground } from "./layers";
import { SEED_TEMPLATES } from "./seedTemplates";
import { migrateToFlat } from "./migrateV3";

// Re-export the pure timing helpers so existing imports from "./defaults" keep
// working. The render bundle imports them from "./timing" directly (it must not
// pull in seedTemplates / ?raw).
export { clampedTransitionFrames, totalDurationInFrames, sceneStartFrame } from "./timing";
// v3 flat-model factories (live in ./clips so the render bundle can use them).
export { newTrack, newSection, newClip } from "./clips";

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

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

/** Default prop values straight from a template's schema. */
export function defaultPropsFor(schema: PropField[]): PropValues {
  const out: PropValues = {};
  for (const f of schema) out[f.key] = f.default;
  return out;
}

/** A blank layer scene (no layers yet) with a default gradient background. */
export function newScene(durationInFrames = 90, background?: SceneBackground): Scene {
  return {
    id: uid("scene"),
    durationInFrames,
    transition: "none",
    transitionDurationInFrames: 15,
    background: background ?? defaultBackground(),
    layers: [],
  };
}

/** A scene containing a single full-frame ComponentLayer for a template
 *  (the "code-layer" half of the hybrid model). */
export function componentScene(template: Template, width: number, height: number, durationInFrames = 90): Scene {
  const scene = newScene(durationInFrames);
  const layer: Layer = newComponentLayer(width, height, template.id, { ...template.previewProps }, template.name);
  scene.layers = [layer];
  return scene;
}

export function newProject(
  name = "Untitled video",
  aspect: AspectRatio = "9:16",
  starterTemplateId: string | null = "tpl_kinetic_title"
): Project {
  const dims = ASPECT_DIMENSIONS[aspect];
  const templates: Template[] = SEED_TEMPLATES.map((t) => clone(t));
  // starterTemplateId === null -> blank project (no scenes; build via library/AI).
  const scenes: Scene[] = [];
  if (starterTemplateId) {
    const starter = templates.find((t) => t.id === starterTemplateId) ?? templates[0];
    if (starter) scenes.push(componentScene(starter, dims.width, dims.height));
  }
  // Emit the v3 flat model (tracks/clips/background) via the migrator so new
  // projects are structurally identical to migrated ones; `scenes` is retained
  // for the transitional editor.
  return migrateToFlat({
    id: uid("video"),
    name,
    fps: DEFAULT_FPS,
    width: dims.width,
    height: dims.height,
    scenes,
    templates,
    assets: [],
  });
}
