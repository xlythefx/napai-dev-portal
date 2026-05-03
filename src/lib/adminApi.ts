import { API_BASE } from "./api";

const url = (path: string) => `${API_BASE}/controllers/${path}`;

export interface AdminStats {
  documents_count: number;
  chunks_count: number;
  developers_count: number;
  users_with_docs: number;
}

export async function adminGetStats(): Promise<AdminStats> {
  const res = await fetch(url("admin/dashboard.php"));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to fetch stats");
  return data.stats;
}

export interface AdminDocument {
  id: number;
  user_email: string;
  file_name: string;
  file_type: string;
  created_at: string;
  chunks_count: number;
  chunks: { id: number; index: number; text: string }[];
}

export async function adminGetFiles(): Promise<AdminDocument[]> {
  const res = await fetch(url("admin/files.php"));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to fetch files");
  return data.documents ?? [];
}

export interface Developer {
  id: number;
  uni_id?: number;
  email: string;
  name: string | null;
  avatar: string | null;
  role: string;
  hourly_rate: number;
  currency: string;
  time_tracking_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export async function developersList(): Promise<Developer[]> {
  const res = await fetch(url("developers/index.php"));
  const text = await res.text();
  let data: { developers?: Developer[]; error?: string };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid response from server. Check that the API is running.");
  }
  if (!res.ok) throw new Error(data?.error || "Failed to fetch developers");
  return data.developers ?? [];
}

export async function developersUpdate(params: {
  id: number;
  name?: string;
  role?: string;
  email?: string;
  password?: string;
  time_tracking_enabled?: boolean;
}): Promise<void> {
  const res = await fetch(url("developers/update.php"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to update");
}

export async function developersSignup(params: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ developer: { id: number; email: string; name: string; role: string } }> {
  const res = await fetch(url("developers/signup.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Signup failed");
  return data;
}

export async function developersLogin(params: {
  email: string;
  password: string;
}): Promise<{ developer: Developer }> {
  const res = await fetch(url("developers/login.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Login failed");
  return data;
}
