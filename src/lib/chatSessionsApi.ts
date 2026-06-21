// CRUD for per-project AI chat sessions (the sidebar's tabs). The PHP backend
// stores each tab's transcript as an opaque messages_json blob plus the
// resumable Claude Agent SDK session id, keyed by (project_type, project_id).
// Mirrors src/lib/videosApi.ts.

import { API_BASE } from "./api";

const url = (path: string) => `${API_BASE}/controllers/tools/content_chats/${path}`;

export type ChatProjectType = "video" | "content" | "slideshow" | "template";

/** One transcript entry. `thinking` holds the (collapsible) reasoning stream.
 *  `images` and `streaming` are transient UI fields, stripped before persisting. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  /** Wall-clock seconds the assistant spent before answering (shown in the UI). */
  thinkingSeconds?: number;
  images?: string[];
  streaming?: boolean;
}

/** Persisted shape — the transient UI fields above are dropped on save. */
export function persistableMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
    ...(m.thinking ? { thinking: m.thinking } : {}),
    ...(m.thinkingSeconds ? { thinkingSeconds: m.thinkingSeconds } : {}),
  }));
}

export interface ChatSessionMeta {
  id: string;
  title: string;
  claudeSessionId: string | null; // resume target → retained memory
  updatedAt: string;
}

export interface ChatSessionFull extends ChatSessionMeta {
  messages: ChatMessage[];
}

export async function listChats(
  user_email: string,
  projectType: ChatProjectType,
  projectId: string,
): Promise<ChatSessionMeta[]> {
  const qs = new URLSearchParams({ user_email, project_type: projectType, project_id: projectId });
  const res = await fetch(url(`list.php?${qs}`));
  const data = await res.json().catch(() => null);
  const rows = Array.isArray(data?.chats) ? (data.chats as Record<string, unknown>[]) : [];
  return rows.map((c) => ({
    id: String(c.id),
    title: String(c.title ?? "Chat"),
    claudeSessionId: c.claude_session_id ? String(c.claude_session_id) : null,
    updatedAt: String(c.updated_at ?? ""),
  }));
}

export async function createChat(
  user_email: string,
  projectType: ChatProjectType,
  projectId: string,
  title: string,
): Promise<ChatSessionMeta> {
  const res = await fetch(url("create.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_email, project_type: projectType, project_id: projectId, title }),
  });
  const data = await res.json().catch(() => null);
  if (!data?.success) throw new Error(data?.error || "Could not create chat");
  return { id: String(data.id), title: String(data.title ?? title), claudeSessionId: null, updatedAt: "" };
}

export async function getChat(user_email: string, id: string): Promise<ChatSessionFull> {
  const qs = new URLSearchParams({ id, user_email });
  const res = await fetch(url(`get.php?${qs}`));
  const data = await res.json().catch(() => null);
  const c = data?.chat as Record<string, unknown> | undefined;
  if (!c) throw new Error(data?.error || "Chat not found");
  const messages = Array.isArray(c.messages) ? (c.messages as ChatMessage[]) : [];
  return {
    id: String(c.id),
    title: String(c.title ?? "Chat"),
    claudeSessionId: c.claude_session_id ? String(c.claude_session_id) : null,
    updatedAt: String(c.updated_at ?? ""),
    messages,
  };
}

export async function updateChat(
  user_email: string,
  id: string,
  patch: { title?: string; claudeSessionId?: string | null; messages?: ChatMessage[] },
): Promise<void> {
  const body: Record<string, unknown> = { user_email, id: Number(id) };
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.claudeSessionId !== undefined) body.claude_session_id = patch.claudeSessionId;
  if (patch.messages !== undefined) body.messages = patch.messages;
  const res = await fetch(url("update.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!data?.success) throw new Error(data?.error || "Could not save chat");
}

export async function deleteChat(user_email: string, id: string): Promise<void> {
  const res = await fetch(url("delete.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_email, id: Number(id) }),
  });
  const data = await res.json().catch(() => null);
  if (!data?.success) throw new Error(data?.error || "Could not delete chat");
}
