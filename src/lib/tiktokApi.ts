/**
 * TikTok Affiliate API - Fal AI via napai-api proxy
 */
import { API_BASE } from "./api";

const tiktokUrl = (path: string) =>
  `${API_BASE}/controllers/tools/tiktok/${path}`;

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text?.trim()) {
    throw new Error(`Empty response from server (status ${res.status}). The request may have timed out or the server crashed.`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response: ${text.slice(0, 200)}${text.length > 200 ? "…" : ""}`);
  }
}

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function generateAffiliateVideo(params: {
  image?: File;
  imageUrl?: string;
  prompt?: string;
  duration?: "5" | "10";
  aspectRatio?: "16:9" | "9:16" | "1:1";
}): Promise<{ success: boolean; video_url: string }> {
  let imageInput: string;
  if (params.imageUrl) {
    imageInput = params.imageUrl;
  } else if (params.image) {
    imageInput = await fileToDataUri(params.image);
  } else {
    throw new Error("Either image or imageUrl is required");
  }
  const res = await fetch(tiktokUrl("video.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(imageInput.startsWith("data:") ? { image: imageInput } : { image_url: imageInput }),
      prompt: params.prompt ?? "",
      duration: params.duration ?? "10",
      aspect_ratio: params.aspectRatio ?? "9:16",
    }),
  });
  const data = await parseJsonResponse<{ success?: boolean; video_url?: string; error?: string; logs?: string[] }>(res);
  if (!res.ok) {
    const err = new Error(data?.error || `Video generation failed: ${res.status}`) as Error & { logs?: string[] };
    err.logs = data?.logs;
    throw err;
  }
  return data;
}

/** Nano Banana Edit - model + background + products, per-scene prompt */
export async function generateEditImage(params: {
  imageUrls: string[];
  prompt: string;
  aspectRatio?: string;
}): Promise<{ success: boolean; image_url: string }> {
  const res = await fetch(tiktokUrl("edit.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_urls: params.imageUrls,
      prompt: params.prompt,
      aspect_ratio: params.aspectRatio ?? "9:16",
    }),
  });
  const data = await parseJsonResponse<{ success?: boolean; image_url?: string; error?: string; logs?: string[] }>(res);
  if (!res.ok) {
    const err = new Error(data?.error || `Image edit failed: ${res.status}`) as Error & { logs?: string[] };
    err.logs = data?.logs;
    throw err;
  }
  return data;
}

/** Stitch scene videos with FFmpeg, returns final video URL */
export async function stitchVideos(videoUrls: string[]): Promise<{ success: boolean; video_url: string }> {
  const res = await fetch(tiktokUrl("stitch.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ video_urls: videoUrls }),
  });
  const data = await parseJsonResponse<{ success?: boolean; video_url?: string; error?: string; logs?: string[] }>(res);
  if (!res.ok) {
    const err = new Error(data?.error || `Stitch failed: ${res.status}`) as Error & { logs?: string[] };
    err.logs = data?.logs;
    throw err;
  }
  return data;
}

/** Text-to-image (Nano Banana) - kept for reference */
export async function generateImage(params: {
  prompt: string;
  aspectRatio?: string;
}): Promise<{ success: boolean; image_url: string }> {
  const res = await fetch(tiktokUrl("image.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: params.prompt,
      aspect_ratio: params.aspectRatio ?? "9:16",
    }),
  });
  const data = await parseJsonResponse<{ success?: boolean; image_url?: string; error?: string }>(res);
  if (!res.ok) {
    throw new Error(data?.error || `Image generation failed: ${res.status}`);
  }
  return data;
}
