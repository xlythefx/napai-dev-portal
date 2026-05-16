/**
 * Time Tracker desktop-app release management.
 * Admin endpoints require requester_email of an admin developer.
 */
import { API_BASE } from "./api";

const url = (path: string) =>
  `${API_BASE}/controllers/tools/timetracker/releases/${path}`;

export type ReleasePlatform = "win" | "mac" | "linux";

export interface TimeTrackerRelease {
  id: number;
  version: string;
  platform: ReleasePlatform;
  filename: string;
  file_size: number;
  sha256: string | null;
  notes: string | null;
  is_current: boolean;
  auto_download: boolean;
  uploaded_at: string;
  download_count: number;
  uploaded_by_email: string | null;
}

export interface CurrentRelease {
  id: number;
  version: string;
  platform: ReleasePlatform;
  filename: string;
  file_size: number;
  sha256: string | null;
  notes: string | null;
  uploaded_at: string;
  download_url: string;
}

async function asJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function listReleases(params: {
  requester_email: string;
  platform?: ReleasePlatform;
}): Promise<TimeTrackerRelease[]> {
  const qs = new URLSearchParams({ requester_email: params.requester_email });
  if (params.platform) qs.set("platform", params.platform);
  const data = await asJson(await fetch(`${url("list.php")}?${qs}`));
  return (data.releases ?? []) as TimeTrackerRelease[];
}

export async function getCurrentRelease(
  platform: ReleasePlatform = "win",
): Promise<CurrentRelease | null> {
  const qs = new URLSearchParams({ platform });
  const data = await asJson(await fetch(`${url("current.php")}?${qs}`));
  return data.release ?? null;
}

export async function uploadRelease(params: {
  requester_email: string;
  version: string;
  notes?: string;
  platform?: ReleasePlatform;
  setCurrent?: boolean;
  autoDownload?: boolean;
  file: File;
  onProgress?: (loaded: number, total: number) => void;
}): Promise<TimeTrackerRelease> {
  const form = new FormData();
  form.set("requester_email", params.requester_email);
  form.set("version", params.version);
  form.set("platform", params.platform ?? "win");
  if (params.notes) form.set("notes", params.notes);
  if (params.setCurrent) form.set("set_current", "1");
  if (params.autoDownload) form.set("auto_download", "1");
  form.set("installer", params.file);

  // Use XMLHttpRequest so we can report upload progress (fetch can't, in browsers).
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url("upload.php"));
    if (params.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) params.onProgress!(e.loaded, e.total);
      };
    }
    xhr.onload = () => {
      let body: any = {};
      try { body = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && body?.release) {
        resolve(body.release as TimeTrackerRelease);
      } else {
        reject(new Error(body?.error || `Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}

export async function setCurrentRelease(params: {
  requester_email: string;
  id: number;
}): Promise<void> {
  await asJson(await fetch(url("set_current.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  }));
}

export async function deleteRelease(params: {
  requester_email: string;
  id: number;
}): Promise<void> {
  await asJson(await fetch(url("delete.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  }));
}

export function downloadUrl(id: number): string {
  return `${url("download.php")}?id=${id}`;
}

export function currentDownloadUrl(platform: ReleasePlatform = "win"): string {
  return `${url("download.php")}?platform=${platform}`;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 2 : 1)} ${units[i]}`;
}
