import { API_BASE } from "./api";
import { CanvasItem, Project } from "./contentStudio";

const url = (path: string) => `${API_BASE}/controllers/tools/content_projects/${path}`;

export interface ProjectPreview {
  aspectRatio: string;
  background: {
    type: string;
    color: string;
    gradientFrom: string;
    gradientTo: string;
    gradientAngle: number;
  };
  firstText: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  canvasCount: number;
  updated_at: string;
  preview: ProjectPreview | null;
}

export async function listProjects(user_email: string): Promise<ProjectSummary[]> {
  const res = await fetch(url(`list.php?user_email=${encodeURIComponent(user_email)}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to load projects (${res.status})`);
  return (data.projects ?? []).map((p: ProjectSummary & { id: number }) => ({ ...p, id: String(p.id) }));
}

export async function getProject(user_email: string, id: string): Promise<Project> {
  const qs = new URLSearchParams({ id, user_email });
  const res = await fetch(url(`get.php?${qs.toString()}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to load project (${res.status})`);
  const p = data.project;
  return {
    id: String(p.id),
    name: p.name,
    canvases: p.canvases as CanvasItem[],
    createdAt: Date.parse(p.created_at) || Date.now(),
    updatedAt: Date.parse(p.updated_at) || Date.now(),
  };
}

export async function createProject(
  user_email: string,
  name: string,
  canvases: CanvasItem[]
): Promise<string> {
  const res = await fetch(url("create.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_email, name, project_json: { canvases } }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data?.error || `Failed to create project (${res.status})`);
  return String(data.id);
}

export async function updateProject(
  user_email: string,
  id: string,
  project: { name: string; canvases: CanvasItem[] }
): Promise<void> {
  const res = await fetch(url("update.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_email,
      id: Number(id),
      name: project.name,
      project_json: { canvases: project.canvases },
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data?.error || `Failed to save project (${res.status})`);
}

export async function deleteProject(user_email: string, id: string): Promise<void> {
  const res = await fetch(url("delete.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_email, id: Number(id) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to delete project (${res.status})`);
}
