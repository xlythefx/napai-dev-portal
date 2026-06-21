import { API_BASE } from "./api";
import { CanvasItem } from "./contentStudio";

const url = (path: string) => `${API_BASE}/controllers/tools/content_templates/${path}`;

export interface TemplatePreview {
  aspectRatio: string;
  background: { type: string; color: string; gradientFrom: string; gradientTo: string; gradientAngle: number };
  firstText: string;
}

export interface TemplateSummary {
  id: number;
  name: string;
  description: string | null;
  aspect_ratio: string;
  is_global: number;
  preview: TemplatePreview | null;
  created_at: string;
  updated_at: string;
}

export async function listTemplates(params: {
  user_email: string;
  aspect_ratio?: string;
}): Promise<TemplateSummary[]> {
  const qs = new URLSearchParams({ user_email: params.user_email });
  if (params.aspect_ratio) qs.set("aspect_ratio", params.aspect_ratio);
  const res = await fetch(url(`list.php?${qs.toString()}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to load templates (${res.status})`);
  return data.templates ?? [];
}

export async function getTemplate(params: {
  id: number;
  user_email: string;
}): Promise<{ summary: TemplateSummary; canvas: CanvasItem }> {
  const qs = new URLSearchParams({ id: String(params.id), user_email: params.user_email });
  const res = await fetch(url(`get.php?${qs.toString()}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to load template (${res.status})`);
  const t = data.template;
  return { summary: t, canvas: t.canvas_json as CanvasItem };
}

export async function createTemplate(params: {
  user_email: string;
  name: string;
  canvas_json: CanvasItem;
  aspect_ratio: string;
  description?: string;
}): Promise<number> {
  const res = await fetch(url("create.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data?.error || `Failed to save template (${res.status})`);
  return data.template?.id as number;
}

export async function deleteTemplate(params: { user_email: string; id: number }): Promise<void> {
  const res = await fetch(url("delete.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to delete template (${res.status})`);
}
