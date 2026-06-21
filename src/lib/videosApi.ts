// CRUD for Remotion video projects. The PHP backend treats `video_json` as an
// opaque blob, so we store the whole Project (templates included) there and read
// it straight back. get.php passes the full JSON through; list.php derives a
// light gallery preview.

import { API_BASE } from "./api";
import {
  DEFAULT_FPS,
  type BackgroundTrack,
  type Clip,
  type Project,
  type Scene,
  type Section,
  type Template,
  type Track,
  type MediaRef,
} from "./remotion/types";
import { defaultBackground, newComponentLayer } from "./remotion/layers";
import { migrateToFlat, flattenToScenes } from "./remotion/migrateV3";

const url = (path: string) => `${API_BASE}/controllers/tools/content_videos/${path}`;

export interface VideoPreview {
  aspectRatio: string;
  background: { type: string; color: string; gradientFrom: string; gradientTo: string; gradientAngle: number };
  firstText: string;
}

export interface VideoSummary {
  id: string;
  name: string;
  sceneCount: number;
  updated_at: string;
  preview: VideoPreview | null;
}

/** The serialized form stored in video_json (everything except the row id).
 *  Clips are canonical (the timeline editor's source of truth); `scenes` is
 *  derived from them so list.php gallery previews + the AI shim keep working. */
function toVideoJson(p: Project) {
  return {
    schemaVersion: 3,
    name: p.name,
    fps: p.fps,
    width: p.width,
    height: p.height,
    durationInFrames: p.durationInFrames,
    tracks: p.tracks,
    clips: p.clips,
    background: p.background,
    sections: p.sections ?? [],
    scenes: flattenToScenes(p),
    templates: p.templates,
    assets: p.assets ?? [],
  };
}

/** Migrate a stored scene to the layer model. A legacy scene (templateId+props,
 *  no layers) becomes one full-frame ComponentLayer. */
function migrateScene(raw: Record<string, unknown>, width: number, height: number): Scene {
  const s = raw as unknown as Scene & { templateId?: string; props?: Record<string, string | number> };
  if (s.layers !== undefined) {
    return { ...s, background: s.background ?? defaultBackground() };
  }
  return {
    id: String(s.id),
    durationInFrames: Number(s.durationInFrames) || 90,
    transition: s.transition ?? "none",
    transitionDurationInFrames: Number(s.transitionDurationInFrames) || 15,
    background: s.background ?? defaultBackground(),
    layers: s.templateId ? [newComponentLayer(width, height, s.templateId, s.props ?? {})] : [],
  };
}

function fromRow(v: Record<string, unknown>): Project {
  const width = Number(v.width) || 1080;
  const height = Number(v.height) || 1920;
  const fps = Number(v.fps) || DEFAULT_FPS;
  const name = String(v.name ?? "Untitled video");
  const id = String(v.id);
  const templates = (Array.isArray(v.templates) ? v.templates : []) as Template[];
  const assets = (Array.isArray(v.assets) ? v.assets : []) as MediaRef[];

  // v3 blob (has its own tracks/clips) → load the flat model straight through.
  // Clips are canonical: they encode tracks + z-order that `scenes` can't, so we
  // must NOT round-trip through the derived scenes here.
  if (Array.isArray(v.tracks) && Array.isArray(v.clips)) {
    const bg = v.background as { segments?: unknown } | undefined;
    return {
      schemaVersion: 3,
      id,
      name,
      fps,
      width,
      height,
      durationInFrames: Number(v.durationInFrames) || 1,
      tracks: v.tracks as Track[],
      clips: v.clips as Clip[],
      background: bg && Array.isArray(bg.segments) ? (v.background as BackgroundTrack) : { segments: [] },
      sections: (Array.isArray(v.sections) ? v.sections : []) as Section[],
      templates,
      assets,
    };
  }

  // Legacy v2 row (scenes only) → migrate to the flat model.
  const rawScenes = Array.isArray(v.scenes) ? v.scenes : [];
  const scenes = rawScenes.map((s) => migrateScene(s as Record<string, unknown>, width, height));
  return migrateToFlat({ id, name, fps, width, height, scenes, templates, assets });
}

export async function listVideos(user_email: string): Promise<VideoSummary[]> {
  const res = await fetch(url(`list.php?user_email=${encodeURIComponent(user_email)}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to load videos (${res.status})`);
  return (data.videos ?? []).map((v: VideoSummary & { id: number }) => ({ ...v, id: String(v.id) }));
}

export async function getVideo(user_email: string, id: string): Promise<Project> {
  const qs = new URLSearchParams({ id, user_email });
  const res = await fetch(url(`get.php?${qs.toString()}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to load video (${res.status})`);
  return fromRow(data.video ?? {});
}

export async function createVideo(user_email: string, project: Project): Promise<string> {
  const res = await fetch(url("create.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_email, name: project.name, video_json: toVideoJson(project) }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data?.error || `Failed to create video (${res.status})`);
  return String(data.id);
}

export async function updateVideo(user_email: string, id: string, project: Project): Promise<void> {
  const res = await fetch(url("update.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_email, id: Number(id), name: project.name, video_json: toVideoJson(project) }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data?.error || `Failed to save video (${res.status})`);
}

export async function deleteVideo(user_email: string, id: string): Promise<void> {
  const res = await fetch(url("delete.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_email, id: Number(id) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to delete video (${res.status})`);
}
