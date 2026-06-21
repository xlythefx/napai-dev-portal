// Tiny dependency-free helpers for parsing a model's JSON as it streams in.
// Used by the Video Studio AI streaming path (videoAssistantApi).

/**
 * Scan a growing JSON buffer and return the substrings of every top-level object
 * inside the array `"<key>": [ ... ]` whose closing brace has already arrived.
 * String- and escape-aware, so braces/brackets inside string values never fool
 * the depth counter. Safe to call repeatedly on a growing buffer (idempotent for
 * already-complete elements — the caller tracks how many it has consumed).
 */
export function completedArrayElements(buffer: string, key: string): string[] {
  const out: string[] = [];
  const keyIdx = buffer.indexOf(`"${key}"`);
  if (keyIdx < 0) return out;
  let i = buffer.indexOf("[", keyIdx);
  if (i < 0) return out;
  i++; // step past '['
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (; i < buffer.length; i++) {
    const ch = buffer[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") { if (depth === 0) start = i; depth++; }
    else if (ch === "}") { depth--; if (depth === 0 && start >= 0) { out.push(buffer.slice(start, i + 1)); start = -1; } }
    else if (ch === "]" && depth === 0) break; // the array closed
  }
  return out;
}

export interface AgentStreamHandlers {
  onThinking?: (text: string) => void; // reasoning delta (separate channel)
  onSession?: (sessionId: string) => void; // resumable Claude session id
}

/**
 * POST a `{...body, stream:true}` request to an Agent-SDK edit endpoint and parse
 * the NDJSON envelope ({thinking}|{delta}|{session}|{done}|{error}). Streams
 * reasoning + session via handlers; returns the accumulated answer text (the JSON
 * channel) and the session id for the caller to sanitize/apply. Shared by the
 * canvas/slideshow/template streaming clients.
 */
export async function streamAgentEdit(
  url: string,
  body: Record<string, unknown>,
  handlers: AgentStreamHandlers = {},
): Promise<{ text: string; sessionId: string | null }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (!res.ok || !res.body) throw new Error(`Assistant stream failed (${res.status})`);

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let nd = "";
  let text = "";
  let sessionId: string | null = null;
  let errored: Error | null = null;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    nd += dec.decode(value, { stream: true });
    let nl;
    while ((nl = nd.indexOf("\n")) >= 0) {
      const line = nd.slice(0, nl);
      nd = nd.slice(nl + 1);
      if (!line.trim()) continue;
      let ev: Record<string, unknown>;
      try { ev = JSON.parse(line); } catch { continue; }
      if (ev.type === "thinking" && typeof ev.text === "string") {
        handlers.onThinking?.(ev.text);
      } else if (ev.type === "session" && typeof ev.sessionId === "string") {
        sessionId = ev.sessionId;
        handlers.onSession?.(ev.sessionId);
      } else if (ev.type === "delta" && typeof ev.text === "string") {
        text += ev.text;
      } else if (ev.type === "done") {
        if (typeof ev.sessionId === "string") { sessionId = ev.sessionId; handlers.onSession?.(ev.sessionId); }
        if (typeof ev.text === "string" && ev.text) text = ev.text;
      } else if (ev.type === "error") {
        errored = new Error(String(ev.error || "Assistant stream error"));
      }
    }
  }
  if (errored) throw errored;
  return { text, sessionId };
}

/** Parse a model response that may be wrapped in ``` fences or have leading prose. */
export function extractJsonObject(text: string): Record<string, unknown> {
  const cleaned = String(text).replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s !== -1 && e > s) return JSON.parse(cleaned.slice(s, e + 1)) as Record<string, unknown>;
  throw new Error("Model did not return valid JSON");
}
