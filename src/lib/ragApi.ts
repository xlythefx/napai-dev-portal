/**
 * RAG PHP API client - connects to napai-api backend
 */
import { API_BASE } from "./api";

const ragUrl = (path: string) => `${API_BASE}/controllers/tools/rag/${path}`;

export interface RagDocument {
  id: number;
  file_name: string;
  file_type: string;
  created_at: string;
  chunks_count: string;
}

export async function ragUpload(params: {
  text: string;
  filename: string;
  user_email: string;
  chat_id: number;
}): Promise<{ success: boolean; document_id: number; chunks_count: number }> {
  const res = await fetch(ragUrl("upload.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Upload failed: ${res.status}`);
  }
  return data;
}

export async function ragGetDocuments(params: {
  user_email: string;
  chat_id: number;
}): Promise<RagDocument[]> {
  const res = await fetch(
    ragUrl(`documents.php?user_email=${encodeURIComponent(params.user_email)}&chat_id=${params.chat_id}`)
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Failed to fetch documents: ${res.status}`);
  }
  return data.documents ?? [];
}

export async function ragDeleteDocument(params: {
  user_email: string;
  document_id: number;
}): Promise<{ success: boolean; deleted: boolean }> {
  const res = await fetch(ragUrl("documents.php"), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Delete failed: ${res.status}`);
  }
  return data;
}

export async function ragChat(params: {
  question: string;
  user_email: string;
  messages?: { role: "user" | "assistant"; content: string }[];
  chat_id?: number;
  top_k?: number;
}): Promise<{ response: string }> {
  const res = await fetch(ragUrl("chat.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Chat failed: ${res.status}`);
  }
  return data;
}

// Chats CRUD
export interface RagChat {
  id: number;
  name: string;
  created_at: string;
  updated_at?: string;
}

export async function ragListChats(user_email: string): Promise<RagChat[]> {
  const res = await fetch(
    ragUrl(`chats.php?user_email=${encodeURIComponent(user_email)}`)
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to list chats: ${res.status}`);
  return data.chats ?? [];
}

export async function ragCreateChat(params: {
  user_email: string;
  name?: string;
}): Promise<{ success: boolean; chat: RagChat }> {
  const res = await fetch(ragUrl("chats.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to create chat: ${res.status}`);
  return data;
}

export async function ragGetChat(params: {
  user_email: string;
  chat_id: number;
}): Promise<{
  chat: RagChat;
  messages: { role: string; content: string }[];
  document_ids: number[];
}> {
  const url = `chat_get.php?chat_id=${params.chat_id}&user_email=${encodeURIComponent(params.user_email)}`;
  const res = await fetch(ragUrl(url));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to get chat: ${res.status}`);
  return data;
}

export async function ragUpdateChat(params: {
  user_email: string;
  chat_id: number;
  name?: string;
  document_ids?: number[];
}): Promise<{ success: boolean }> {
  const res = await fetch(ragUrl("chat_update.php"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to update chat: ${res.status}`);
  return data;
}

export async function ragDeleteChat(params: {
  user_email: string;
  chat_id: number;
}): Promise<{ success: boolean; deleted: boolean }> {
  const res = await fetch(ragUrl("chat_delete.php"), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to delete chat: ${res.status}`);
  return data;
}
