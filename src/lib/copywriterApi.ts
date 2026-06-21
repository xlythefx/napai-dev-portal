// Fetch wrappers for the local Claude bridge (see vite-claude-plugin.ts).

export type CopyContentType = "caption" | "single" | "slides";
export type CopyModel = "haiku" | "sonnet" | "opus";

export interface CaptionData {
  caption: string;
  hashtags: string[];
}
export interface SingleData {
  headline: string;
  subheadline: string;
  body: string;
}
export interface SlidesData {
  slides: { headline: string; body: string }[];
  caption: string;
}

export type CopyResult =
  | { contentType: "caption"; data: CaptionData }
  | { contentType: "single"; data: SingleData }
  | { contentType: "slides"; data: SlidesData };

export interface ClaudeStatus {
  ok: boolean;
  loggedIn: boolean;
  subscriptionType?: string | null;
  error?: string;
}

export async function getClaudeStatus(): Promise<ClaudeStatus> {
  try {
    const res = await fetch("/api/claude-status");
    if (!res.ok) return { ok: false, loggedIn: false, error: `HTTP ${res.status}` };
    return (await res.json()) as ClaudeStatus;
  } catch (err) {
    return { ok: false, loggedIn: false, error: String((err as Error)?.message || err) };
  }
}

export async function generateCopy(payload: {
  prompt: string;
  contentType: CopyContentType;
  model: CopyModel;
}): Promise<CopyResult> {
  const res = await fetch("/api/copywrite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!data) throw new Error("No response from the copywriter service.");
  if (!data.ok) throw new Error(data.error || "Copywriter request failed.");
  return { contentType: data.contentType, data: data.data } as CopyResult;
}
