// Client for the Remotion render service. Dev: same-origin /api/video-render
// (Vite plugin). Prod: API_RENDER_BASE points at the standalone Node service.
// On success the endpoint streams back an MP4; on failure it returns JSON.

import { API_RENDER_BASE } from "./api";
import type { Project } from "./remotion/types";

export async function renderProject(project: Project): Promise<Blob> {
  const res = await fetch(`${API_RENDER_BASE}/api/video-render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project }),
  });

  const contentType = res.headers.get("content-type") || "";
  if (!res.ok || contentType.includes("application/json")) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Render failed (${res.status})`);
  }
  return await res.blob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
