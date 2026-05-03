/**
 * Time Tracker PHP API client - connects to napai-api backend.
 * Admin endpoints require requester_email of an admin developer.
 * Desktop-app endpoints (start/heartbeat/stop/uploadScreenshot) included
 * for the future Electron client.
 */
import { API_BASE } from "./api";

const ttUrl = (path: string) => `${API_BASE}/controllers/tools/timetracker/${path}`;

export interface TimeSession {
  id: number;
  developer_id: number;
  developer_email: string;
  developer_name: string | null;
  task: string | null;
  started_at: string;
  ended_at: string | null;
  active_seconds: number;
  idle_seconds: number;
  screenshots_count: number;
  hourly_rate: number;
  currency: string;
  earnings: number;
  is_valid: boolean;
  invalidated_reason: string | null;
}

export interface DailyPayment {
  id: number;
  amount: number;
  currency: string;
  proof_path: string | null;
  note: string | null;
  paid_at: string;
}

export interface DailyEarning {
  developer_id: number;
  developer_email: string;
  developer_name: string | null;
  date: string;
  active_seconds: number;
  session_count: number;
  invalid_count: number;
  hourly_rate: number;
  currency: string;
  earnings: number;
  paid: boolean;
  payment: DailyPayment | null;
}

export interface TimeScreenshot {
  id: number;
  session_id: number;
  developer_id: number;
  developer_email?: string;
  developer_name?: string | null;
  taken_at: string;
  image_path: string;
  activity_level: number | null;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  color: string;
}

// ---------- Projects ----------

export async function listProjects(): Promise<Project[]> {
  const res = await fetch(ttUrl("projects/list.php"));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to fetch projects: ${res.status}`);
  return data.projects ?? [];
}

export async function createProject(params: {
  requester_email: string;
  name: string;
  description?: string;
  color?: string;
}): Promise<Project> {
  const res = await fetch(ttUrl("projects/create.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to create project: ${res.status}`);
  return data.project;
}

export async function updateProject(params: {
  requester_email: string;
  id: number;
  name?: string;
  description?: string;
  color?: string;
}): Promise<void> {
  const res = await fetch(ttUrl("projects/update.php"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to update project: ${res.status}`);
}

export async function deleteProject(params: {
  requester_email: string;
  id: number;
}): Promise<void> {
  const res = await fetch(ttUrl("projects/delete.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to delete project: ${res.status}`);
}

// ---------- Admin endpoints ----------

export async function adminListSessions(params: {
  requester_email: string;
  developer_id?: number;
  from?: string;
  to?: string;
}): Promise<TimeSession[]> {
  const qs = new URLSearchParams();
  qs.set("requester_email", params.requester_email);
  if (params.developer_id) qs.set("developer_id", String(params.developer_id));
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const res = await fetch(ttUrl(`admin/list_sessions.php?${qs.toString()}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to fetch sessions: ${res.status}`);
  return data.sessions ?? [];
}

export interface ActiveSession {
  developer_id: number;
  session_id: number;
  started_at: string;
  task: string | null;
}

export async function adminListActiveSessions(params: {
  requester_email: string;
}): Promise<ActiveSession[]> {
  const qs = new URLSearchParams();
  qs.set("requester_email", params.requester_email);
  const res = await fetch(ttUrl(`admin/list_active_sessions.php?${qs.toString()}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to fetch active sessions: ${res.status}`);
  return data.active ?? [];
}

export async function adminListScreenshots(params: {
  requester_email: string;
  session_id?: number;
  developer_id?: number;
  date?: string;
  from?: string;
  to?: string;
}): Promise<TimeScreenshot[]> {
  const qs = new URLSearchParams();
  qs.set("requester_email", params.requester_email);
  if (params.session_id) qs.set("session_id", String(params.session_id));
  if (params.developer_id) qs.set("developer_id", String(params.developer_id));
  if (params.date) qs.set("date", params.date);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const res = await fetch(ttUrl(`admin/list_screenshots.php?${qs.toString()}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to fetch screenshots: ${res.status}`);
  return data.screenshots ?? [];
}

export async function adminSetRate(params: {
  requester_email: string;
  developer_id: number;
  hourly_rate: number;
  currency?: string;
}): Promise<void> {
  const res = await fetch(ttUrl("admin/set_rate.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to set rate: ${res.status}`);
}

export function screenshotImageUrl(id: number, requesterEmail: string): string {
  return ttUrl(
    `screenshots/view.php?id=${id}&requester_email=${encodeURIComponent(requesterEmail)}`
  );
}

export function paymentProofUrl(paymentId: number, requesterEmail: string): string {
  return ttUrl(
    `admin/view_proof.php?payment_id=${paymentId}&requester_email=${encodeURIComponent(requesterEmail)}`
  );
}

export async function adminSetSessionValid(params: {
  requester_email: string;
  session_id: number;
  is_valid: boolean;
  reason?: string;
}): Promise<void> {
  const res = await fetch(ttUrl("admin/set_session_valid.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...params,
      is_valid: params.is_valid ? 1 : 0,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed: ${res.status}`);
}

export async function adminListDailyEarnings(params: {
  requester_email: string;
  developer_id?: number;
  from?: string;
  to?: string;
}): Promise<DailyEarning[]> {
  const qs = new URLSearchParams();
  qs.set("requester_email", params.requester_email);
  if (params.developer_id) qs.set("developer_id", String(params.developer_id));
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const res = await fetch(ttUrl(`admin/list_daily_earnings.php?${qs.toString()}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to fetch daily earnings: ${res.status}`);
  return data.days ?? [];
}

export async function adminRecordPayment(params: {
  requester_email: string;
  developer_id: number;
  payment_date: string;
  amount: number;
  currency?: string;
  note?: string;
  proof?: File | null;
}): Promise<DailyPayment> {
  const fd = new FormData();
  fd.append("requester_email", params.requester_email);
  fd.append("developer_id", String(params.developer_id));
  fd.append("payment_date", params.payment_date);
  fd.append("amount", String(params.amount));
  if (params.currency) fd.append("currency", params.currency);
  if (params.note) fd.append("note", params.note);
  if (params.proof) fd.append("proof", params.proof);
  const res = await fetch(ttUrl("admin/record_payment.php"), {
    method: "POST",
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to record payment: ${res.status}`);
  return data.payment;
}

export async function adminDeletePayment(params: {
  requester_email: string;
  payment_id: number;
}): Promise<void> {
  const res = await fetch(ttUrl("admin/delete_payment.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to delete payment: ${res.status}`);
}

// ---------- Desktop app endpoints (future Electron client) ----------

export async function startSession(params: {
  developer_email: string;
  task?: string;
}): Promise<{ session_id: number }> {
  const res = await fetch(ttUrl("sessions/start.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to start session: ${res.status}`);
  return data;
}

export async function heartbeat(params: {
  session_id: number;
  active_seconds: number;
  idle_seconds: number;
}): Promise<void> {
  const res = await fetch(ttUrl("sessions/heartbeat.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Heartbeat failed: ${res.status}`);
}

export async function stopSession(params: {
  session_id: number;
  active_seconds?: number;
  idle_seconds?: number;
}): Promise<void> {
  const res = await fetch(ttUrl("sessions/stop.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Stop failed: ${res.status}`);
}

export async function uploadScreenshot(params: {
  session_id: number;
  file: Blob;
  taken_at?: string;
  activity_level?: number;
}): Promise<{ screenshot_id: number; image_path: string }> {
  const fd = new FormData();
  fd.append("session_id", String(params.session_id));
  fd.append("screenshot", params.file);
  if (params.taken_at) fd.append("taken_at", params.taken_at);
  if (params.activity_level != null) fd.append("activity_level", String(params.activity_level));
  const res = await fetch(ttUrl("screenshots/upload.php"), { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Upload failed: ${res.status}`);
  return data;
}
