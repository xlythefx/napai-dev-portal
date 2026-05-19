import { API_BASE } from "./api";

const url = (path: string) => `${API_BASE}/controllers/tablet/${path}`;

export type KeyFilter = "all" | "active" | "unbound" | "revoked" | "trial" | "expired";
export type KeyTier = "plus" | "pro" | "max";
export type SellType = "bulk" | "retail";

export interface LicenseKey {
  id: number;
  serial: string;
  android_id: string | null;
  activated_at: string | null;
  revoked: number;
  note: string | null;
  created_at: string;
  kind: "lifetime" | "trial";
  expires_at: string | null;
  buyer_email: string | null;
  type: KeyTier;
  sell_type: SellType;
  custom_price: string | number | null;
  bulk_emailed_at: string | null;
  bulk_emailed_to: string | null;
}

export interface GeneratedKey {
  serial: string;
  type: KeyTier;
  sell_type: SellType;
  note: string;
  custom_price: number | null;
}

export interface KeysGenerateResponse {
  generated: GeneratedKey[];
  count: number;
  type: KeyTier;
  sell_type: SellType;
  custom_price: number | null;
  generated_at: string;
}

export interface KeysListResponse {
  rows: LicenseKey[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  counts: {
    active: number;
    unbound: number;
    revoked: number;
    trial: number;
    expired: number;
    total: number;
  };
}

export interface ActivationLogRow {
  android_id: string;
  ip: string | null;
  result: string;
  created_at: string;
}

export interface HeartbeatRow {
  android_id: string;
  battery_pct: number | null;
  app_version: string | null;
  created_at: string;
}

export interface KeyDetailResponse {
  key: LicenseKey;
  activations: ActivationLogRow[];
  last_heartbeat: HeartbeatRow | null;
}

export interface ApkVersion {
  id: number;
  version: string;
  filename: string;
  size_bytes: number;
  sha256_b64: string;
  notes: string | null;
  is_active: number;
  uploaded_by_email: string | null;
  uploaded_at: string;
}

export interface ApkListResponse {
  rows: ApkVersion[];
  active: ApkVersion | null;
  max_upload: string;
  public_url: string;
}

export interface DeviceRow {
  id: number;
  serial: string;
  android_id: string;
  activated_at: string;
  note: string | null;
  battery_pct: number | null;
  app_version: string | null;
  last_seen: string | null;
  stale: boolean;
}

export interface ProvisioningQrResponse {
  json: Record<string, unknown>;
  key: { id: number; serial: string; android_id: string | null; revoked: number };
  active_apk: { version: string; sha256_b64: string; size_bytes: number };
}

export interface MetricsResponse {
  price: number;
  currency: string;
  today: number;
  yesterday: number;
  this_week: number;
  last_week: number;
  this_month: number;
  last_month: number;
  total_sold: number;
  active_devices: number;
  unbound_keys: number;
  revoked_keys: number;
  deltas: {
    today_vs_yesterday: number | null;
    week_vs_last: number | null;
    month_vs_last: number | null;
  };
  series: {
    daily: { date: string; count: number }[];
    weekly: { yearweek: number; count: number }[];
    monthly: { month: string; count: number }[];
  };
  recent: { serial: string; android_id: string; activated_at: string }[];
}

function adminFetch(
  path: string,
  email: string,
  init?: RequestInit & { query?: Record<string, string | number | undefined> }
) {
  const params = new URLSearchParams({ requester_email: email });
  if (init?.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined && v !== "") params.set(k, String(v));
    }
  }
  return fetch(`${url(path)}?${params.toString()}`, init);
}

async function asJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON response. Check that the API is running.");
  }
  if (!res.ok) {
    const err = (data as { error?: string })?.error || `HTTP ${res.status}`;
    throw new Error(err);
  }
  return data as T;
}

export async function keysList(
  email: string,
  params: { filter?: KeyFilter; q?: string; page?: number; per_page?: number } = {}
): Promise<KeysListResponse> {
  const res = await adminFetch("keys_list.php", email, {
    query: {
      filter: params.filter,
      q: params.q,
      page: params.page,
      per_page: params.per_page,
    },
  });
  return asJson(res);
}

export async function keyDetail(email: string, id: number): Promise<KeyDetailResponse> {
  const res = await adminFetch("keys_get.php", email, { query: { id } });
  return asJson(res);
}

export async function keysGenerate(
  email: string,
  count: number,
  note: string,
  type: KeyTier = "pro",
  sellType: SellType = "retail",
  customPrice: number | null = null,
): Promise<KeysGenerateResponse> {
  const res = await fetch(url("keys_generate.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requester_email: email,
      count,
      note,
      type,
      sell_type: sellType,
      custom_price: customPrice,
    }),
  });
  return asJson(res);
}

export async function keysRevoke(
  email: string,
  id: number,
  revoke: 0 | 1
): Promise<{ ok: boolean }> {
  const res = await fetch(url("keys_revoke.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requester_email: email, id, revoke }),
  });
  return asJson(res);
}

export async function keysRelease(email: string, id: number): Promise<{ ok: boolean }> {
  const res = await fetch(url("keys_release.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requester_email: email, id }),
  });
  return asJson(res);
}

export async function keysNoteUpdate(
  email: string,
  id: number,
  note: string
): Promise<{ ok: boolean }> {
  const res = await fetch(url("keys_note.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requester_email: email, id, note }),
  });
  return asJson(res);
}

export async function keysConvert(
  email: string,
  id: number,
  toKind: "lifetime" | "trial",
  extendDays?: number
): Promise<{ ok: boolean }> {
  const res = await fetch(url("keys_convert.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requester_email: email,
      id,
      to_kind: toKind,
      extend_days: extendDays,
    }),
  });
  return asJson(res);
}

export interface RequestTrialResponse {
  ok: boolean;
  serial: string;
  name: string;
  email: string;
  trial_days: number;
  qr_json: Record<string, unknown> | null;
  apk_url: string;
  has_active_apk: boolean;
}

export async function requestTrialOtpSend(email: string): Promise<{ ok: boolean; expires_in_seconds: number }> {
  const res = await fetch(url("trial_otp_send.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return asJson(res);
}

export async function requestTrial(
  email: string,
  name: string | undefined,
  otp: string,
): Promise<RequestTrialResponse> {
  const res = await fetch(url("request_trial.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, otp }),
  });
  return asJson(res);
}

export async function trialEmailQr(params: {
  email: string;
  serial: string;
  name?: string;
  pngDataUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(url("trial_email_qr.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: params.email,
      serial: params.serial,
      name: params.name,
      png: params.pngDataUrl,
    }),
  });
  return asJson(res);
}

export async function apkList(email: string): Promise<ApkListResponse> {
  const res = await adminFetch("apk_list.php", email);
  return asJson(res);
}

export interface PublicActiveApk {
  version: string;
  size_bytes: number;
  sha256_b64: string;
  notes: string | null;
  uploaded_at: string;
}

export interface PublicActiveApkResponse {
  active: PublicActiveApk | null;
  apk_url: string;
}

export async function publicActiveApk(): Promise<PublicActiveApkResponse> {
  const res = await fetch(url("active_apk_public.php"));
  return asJson(res);
}

export function setupScriptUrl(
  step: "adb" | "install" | "uninstall",
  platform: "win" | "unix",
): string {
  return `${url("setup_script.php")}?step=${step}&platform=${platform}`;
}

export async function apkUpload(
  email: string,
  data: { version: string; notes: string; make_active: boolean; file: File },
  onProgress?: (pct: number, loaded: number, total: number) => void,
): Promise<{ ok: boolean; id: number; version: string; sha256_b64: string; size_bytes: number }> {
  const fd = new FormData();
  fd.append("requester_email", email);
  fd.append("version", data.version);
  fd.append("notes", data.notes);
  fd.append("make_active", data.make_active ? "1" : "0");
  fd.append("apk", data.file);

  // Use XHR so we can surface upload progress to the UI. fetch() has no
  // standardised way to observe upload bytes.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url("apk_upload.php"));
    xhr.upload.onprogress = (e) => {
      if (!onProgress || !e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      onProgress(pct, e.loaded, e.total);
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body);
        } else {
          reject(new Error(body?.error || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.send(fd);
  });
}

export async function apkActivate(email: string, id: number): Promise<{ ok: boolean }> {
  const res = await fetch(url("apk_activate.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requester_email: email, id }),
  });
  return asJson(res);
}

export async function apkDelete(
  email: string,
  id: number
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(url("apk_delete.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requester_email: email, id }),
  });
  return asJson(res);
}

export interface UniversalQrResponse {
  json: Record<string, unknown>;
  mode: "universal";
  active_apk: { version: string; sha256_b64: string; size_bytes: number };
}

export async function provisioningUniversalQr(email: string): Promise<UniversalQrResponse> {
  const params = new URLSearchParams({ requester_email: email, universal: "1" });
  const res = await fetch(`${url("provisioning_qr.php")}?${params.toString()}`);
  return asJson(res);
}

export interface BulkEmailResponse {
  ok: boolean;
  error?: string;
  sent_count?: number;
  recipient?: string;
}

export async function bulkEmail(params: {
  email: string;
  to: string;
  serials: string[];
  qrPngDataUrl: string;
  note?: string;
}): Promise<BulkEmailResponse> {
  const res = await fetch(url("bulk_email.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requester_email: params.email,
      to: params.to,
      serials: params.serials,
      qr_png: params.qrPngDataUrl,
      note: params.note ?? "",
    }),
  });
  return asJson(res);
}

export async function provisioningQrJson(
  email: string,
  opts: { keyId: number; wifiSsid?: string; wifiPass?: string; wifiType?: string }
): Promise<ProvisioningQrResponse> {
  const res = await adminFetch("provisioning_qr.php", email, {
    query: {
      key_id: opts.keyId,
      wifi_ssid: opts.wifiSsid,
      wifi_pass: opts.wifiPass,
      wifi_type: opts.wifiType,
    },
  });
  return asJson(res);
}

export async function provisioningEmail(
  email: string,
  buyerEmail: string,
  serial: string,
  pngDataUrl: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(url("provisioning_email.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requester_email: email,
      email: buyerEmail,
      serial,
      png: pngDataUrl,
    }),
  });
  return asJson(res);
}

export async function devicesList(email: string): Promise<{ rows: DeviceRow[] }> {
  const res = await adminFetch("devices_list.php", email);
  return asJson(res);
}

export async function tabletMetrics(email: string): Promise<MetricsResponse> {
  const res = await adminFetch("metrics.php", email);
  return asJson(res);
}

export interface TabletSettings {
  email_keys_enabled: boolean;
  is_maintenance: boolean;
}

export async function tabletSettingsGet(email: string): Promise<{ ok: boolean; settings: TabletSettings }> {
  const res = await adminFetch("settings_get.php", email);
  return asJson(res);
}

export interface AuditRow {
  id: number;
  actor_email: string;
  action: string;
  target_serial: string | null;
  ip: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditListResponse {
  ok: boolean;
  rows: AuditRow[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export async function tabletAuditList(
  email: string,
  params: { page?: number; per_page?: number; action?: string; serial?: string; actor?: string } = {},
): Promise<AuditListResponse> {
  const query: Record<string, string | number | undefined> = {
    page: params.page,
    per_page: params.per_page,
    action: params.action,
    serial: params.serial,
    actor: params.actor,
  };
  const res = await adminFetch("audit_list.php", email, { query });
  return asJson(res);
}

export async function tabletSettingsUpdate(
  email: string,
  patch: Partial<TabletSettings>,
): Promise<{ ok: boolean; settings: TabletSettings }> {
  const params = new URLSearchParams({ requester_email: email });
  const res = await fetch(`${url("settings_update.php")}?${params.toString()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return asJson(res);
}
