// CRUD for the shared Video Template library (content_video_templates).
// Templates are vibe-coded Remotion components. They are authored on the Video
// Template page and stored in the DB as one global library visible to everyone.
// The blob `template_json` holds { code, propsSchema, previewProps }; the row id
// becomes the Template id (`vtpl_<dbId>`) so a clip can reference it stably and a
// used template's code can be embedded into a video's project JSON for render.

import { API_BASE } from "./api";
import type { Scene, Template } from "./remotion/types";
import type { CopyModel } from "./copywriterApi";
import { normalizeSchema, defaultsOf } from "./videoAssistantApi";

const url = (path: string) => `${API_BASE}/controllers/tools/content_video_templates/${path}`;

/** The shape stored in template_json (everything that defines the component). */
export interface TemplateJson {
  code: string;
  propsSchema: Template["propsSchema"];
  previewProps: Template["previewProps"];
  /** Selection keywords (ride in the blob — no DB migration). */
  tags?: string[];
}

/** A DB-backed template plus its row metadata. */
export interface VideoTemplateRecord {
  dbId: number;
  name: string;
  description: string | null;
  userEmail: string | null;
  template: Template; // id === `vtpl_<dbId>`
  created_at: string;
  updated_at: string;
}

/** Stable Template id derived from the DB row id (distinct from seed `tpl_*` ids). */
export const templateIdForRow = (dbId: number) => `vtpl_${dbId}`;
/** True for ids minted by this DB library (vs bundled seed templates). */
export const isDbTemplateId = (id: string) => id.startsWith("vtpl_");
/** Recover the numeric DB id from a `vtpl_<id>` Template id (NaN if not one). */
export const dbIdFromTemplateId = (id: string) => (isDbTemplateId(id) ? Number(id.slice(5)) : NaN);

function toTemplateJson(t: Template): TemplateJson {
  const propsSchema = normalizeSchema(t.propsSchema);
  return {
    code: t.code,
    propsSchema,
    previewProps: { ...defaultsOf(propsSchema), ...(t.previewProps ?? {}) },
    tags: Array.isArray(t.tags) ? t.tags.map(String) : [],
  };
}

function rowToRecord(row: Record<string, unknown>): VideoTemplateRecord {
  const dbId = Number(row.id);
  const tj = (row.template_json ?? {}) as Partial<TemplateJson>;
  const propsSchema = normalizeSchema(tj.propsSchema);
  const description = (row.description as string | null) ?? null;
  const template: Template = {
    id: templateIdForRow(dbId),
    name: String(row.name ?? "Untitled template"),
    code: String(tj.code ?? ""),
    propsSchema,
    previewProps: { ...defaultsOf(propsSchema), ...((tj.previewProps as Template["previewProps"]) ?? {}) },
    tags: Array.isArray(tj.tags) ? tj.tags.map(String) : [],
    description: description ?? undefined,
  };
  return {
    dbId,
    name: template.name,
    description,
    userEmail: (row.user_email as string | null) ?? null,
    template,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function listVideoTemplates(): Promise<VideoTemplateRecord[]> {
  const res = await fetch(url("list.php"));
  // Guard an empty/non-JSON body (e.g. a backend error) — otherwise res.json()
  // throws the opaque "Unexpected end of JSON input".
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error(data?.error || `Failed to load templates (${res.status})`);
  // Scene presets share this table (kind:"scene") — keep them out of the TSX library.
  return (data.templates ?? [])
    .filter((r: Record<string, unknown>) => ((r.template_json as { kind?: string } | undefined)?.kind ?? "tsx") !== "scene")
    .map(rowToRecord);
}

export async function getVideoTemplate(dbId: number): Promise<VideoTemplateRecord> {
  const res = await fetch(url(`get.php?id=${dbId}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to load template (${res.status})`);
  return rowToRecord(data.template ?? {});
}

export async function createVideoTemplate(params: {
  user_email: string;
  name: string;
  description?: string | null;
  template: Template;
}): Promise<number> {
  const res = await fetch(url("create.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_email: params.user_email,
      name: params.name,
      description: params.description ?? null,
      template_json: toTemplateJson(params.template),
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data?.error || `Failed to save template (${res.status})`);
  return data.id as number;
}

export async function updateVideoTemplate(params: {
  dbId: number;
  name?: string;
  description?: string | null;
  template?: Template;
}): Promise<void> {
  const body: Record<string, unknown> = { id: params.dbId };
  if (params.name !== undefined) body.name = params.name;
  if (params.description !== undefined) body.description = params.description;
  if (params.template !== undefined) body.template_json = toTemplateJson(params.template);
  const res = await fetch(url("update.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data?.error || `Failed to save template (${res.status})`);
}

export async function deleteVideoTemplate(dbId: number): Promise<void> {
  const res = await fetch(url("delete.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: dbId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to delete template (${res.status})`);
}

/** AI-suggested search/matching tags for a template (the user edits before saving). */
export async function suggestTags(params: { name: string; code?: string; summary?: string; model?: CopyModel }): Promise<string[]> {
  const res = await fetch("/api/suggest-tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: params.name, code: params.code, summary: params.summary, model: params.model }),
  });
  const data = await res.json().catch(() => null);
  if (!data?.ok) throw new Error(data?.error || "Couldn't suggest tags");
  return Array.isArray(data.tags) ? data.tags.map(String) : [];
}

// ---- Scene presets (self-growing library; share the content_video_templates table) ----

/** A saved scene layer-graph + the templates its component layers reference. */
export interface ScenePreset {
  id: string; // spreset_<dbId>
  dbId: number;
  name: string;
  description: string | null;
  tags: string[];
  scene: Scene;
  templates: Template[];
}

export const presetIdForRow = (dbId: number) => `spreset_${dbId}`;
export const isPresetId = (id: string) => id.startsWith("spreset_");

function rowToPreset(row: Record<string, unknown>): ScenePreset {
  const dbId = Number(row.id);
  const tj = (row.template_json ?? {}) as { kind?: string; scene?: Scene; templates?: Template[]; tags?: string[] };
  return {
    id: presetIdForRow(dbId),
    dbId,
    name: String(row.name ?? "Untitled preset"),
    description: (row.description as string | null) ?? null,
    tags: Array.isArray(tj.tags) ? tj.tags.map(String) : [],
    scene: (tj.scene ?? { id: presetIdForRow(dbId), durationInFrames: 90, transition: "none", transitionDurationInFrames: 15, layers: [] }) as Scene,
    templates: Array.isArray(tj.templates) ? (tj.templates as Template[]) : [],
  };
}

export async function listScenePresets(): Promise<ScenePreset[]> {
  const res = await fetch(url("list.php"));
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error(data?.error || `Failed to load presets (${res.status})`);
  return (data.templates ?? [])
    .filter((r: Record<string, unknown>) => ((r.template_json as { kind?: string } | undefined)?.kind ?? "") === "scene")
    .map(rowToPreset);
}

export async function createScenePreset(params: {
  user_email: string;
  name: string;
  description?: string | null;
  tags: string[];
  scene: Scene;
  templates: Template[];
}): Promise<number> {
  const res = await fetch(url("create.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_email: params.user_email,
      name: params.name,
      description: params.description ?? null,
      template_json: { kind: "scene", scene: params.scene, templates: params.templates, tags: params.tags },
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data?.error || `Failed to save preset (${res.status})`);
  return data.id as number;
}
