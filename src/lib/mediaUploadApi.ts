// Uploads an image or video file to the napai-api media store and returns a
// served URL. The Remotion render service must be able to fetch media by URL, so
// scene props always hold a real URL (never a data/blob URL once uploaded).

import { API_BASE } from "./api";

export interface UploadedMedia {
  url: string;
  kind: "image" | "video";
  name: string;
}

export async function uploadMedia(user_email: string, file: File): Promise<UploadedMedia> {
  const form = new FormData();
  form.append("user_email", user_email);
  form.append("file", file);

  const res = await fetch(`${API_BASE}/controllers/tools/content_media/upload.php`, {
    method: "POST",
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || `Upload failed (${res.status})`);
  }
  return {
    url: String(data.url),
    kind: (data.kind as "image" | "video") ?? (file.type.startsWith("video") ? "video" : "image"),
    name: String(data.name ?? file.name),
  };
}

/** True if a value is a local-only URL the render service can't fetch. */
export function isLocalMediaUrl(value: unknown): boolean {
  return typeof value === "string" && (value.startsWith("data:") || value.startsWith("blob:"));
}
