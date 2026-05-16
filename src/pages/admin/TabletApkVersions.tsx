import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { confirm } from "@/components/ui/confirm-dialog";
import { apkList, apkUpload, apkActivate, apkDelete, type ApkVersion, type ApkListResponse } from "@/lib/tabletApi";
import { formatDate } from "@/lib/format";

const TabletApkVersions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const email = user?.email ?? "";

  const [data, setData] = useState<ApkListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [makeActive, setMakeActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadBytes, setUploadBytes] = useState<{ loaded: number; total: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fmtMb = (n: number) => (n / 1048576).toFixed(2) + " MB";

  const load = () => {
    if (!email) return;
    setLoading(true);
    apkList(email).then(setData).catch((e) => toast({ title: e.message, variant: "destructive" })).finally(() => setLoading(false));
  };

  useEffect(load, [email]); // eslint-disable-line react-hooks/exhaustive-deps

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast({ title: "Pick an APK file", variant: "destructive" });
      return;
    }
    if (!version.trim()) {
      toast({ title: "Version label is required", variant: "destructive" });
      return;
    }
    setUploading(true);
    setUploadPct(0);
    setUploadBytes({ loaded: 0, total: file.size });
    setProcessing(false);
    try {
      await apkUpload(
        email,
        { version: version.trim(), notes: notes.trim(), make_active: makeActive, file },
        (pct, loaded, total) => {
          setUploadPct(pct);
          setUploadBytes({ loaded, total });
          // After bytes are fully sent, the server still writes-to-disk + hashes.
          if (pct >= 100) setProcessing(true);
        },
      );
      toast({ title: `Uploaded v${version}${makeActive ? " (active)" : ""}` });
      setVersion("");
      setNotes("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
      setProcessing(false);
      setUploadPct(0);
      setUploadBytes(null);
    }
  };

  const activate = async (v: ApkVersion) => {
    if (!(await confirm({
      title: `Activate v${v.version}?`,
      description: "All tablets will start downloading this version on their next update check.",
      confirmText: "Make active",
    }))) return;
    try { await apkActivate(email, v.id); toast({ title: "Active version updated" }); load(); }
    catch (e) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
  };

  const remove = async (v: ApkVersion) => {
    if (!(await confirm({
      title: `Delete v${v.version}?`,
      description: "The APK file will be removed from disk. This cannot be undone.",
      confirmText: "Delete version",
      tone: "danger",
    }))) return;
    try {
      const r = await apkDelete(email, v.id);
      if (!r.ok) throw new Error(r.error || "delete failed");
      toast({ title: "Deleted" });
      load();
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6" /> APK Versions
        </h1>
        <p className="text-muted-foreground text-sm">
          The active version is what every provisioning QR points to. Switching active = instant cutover, no QR regeneration.
        </p>
      </div>

      {data?.active ? (
        <Card>
          <CardContent className="py-4 flex items-center gap-3">
            <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>
            <div className="flex-1">
              <strong>v{data.active.version}</strong>{" "}
              <span className="text-muted-foreground text-sm">
                · {(data.active.size_bytes / 1048576).toFixed(2)} MB · uploaded {formatDate(data.active.uploaded_at)}
              </span>
            </div>
            <code className="text-xs text-muted-foreground hidden md:block">{data.public_url}</code>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-4 text-destructive">No active APK — provisioning QRs will fail until one is set active.</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload new version</CardTitle>
          <CardDescription>Max upload size: {data?.max_upload ?? "?"}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={upload} className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Version label</label>
                <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.3" required />
              </div>
              <div>
                <label className="text-sm">Notes</label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Release notes (optional)" />
              </div>
            </div>
            <div>
              <label className="text-sm">APK file</label>
              <Input type="file" accept=".apk" ref={fileRef} required />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={makeActive} onChange={(e) => setMakeActive(e.target.checked)} />
              Make active immediately
            </label>
            {uploading && uploadBytes && (
              <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium">
                    {processing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        <span>Processing on server (hashing + saving)…</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-primary" />
                        <span>Uploading APK…</span>
                      </>
                    )}
                  </div>
                  <span className="tabular-nums text-muted-foreground">
                    {fmtMb(uploadBytes.loaded)} / {fmtMb(uploadBytes.total)}
                    <span className="ml-2 font-semibold text-foreground">{processing ? 100 : uploadPct}%</span>
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-emerald-500 transition-[width] duration-200 ease-out ${
                      processing ? "" : ""
                    }`}
                    style={{ width: `${processing ? 100 : uploadPct}%` }}
                  />
                  {/* shimmer */}
                  <div
                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[apkshine_1.4s_linear_infinite]"
                    style={{ left: `${(processing ? 100 : uploadPct) - 33}%` }}
                  />
                </div>
                <style>{`
                  @keyframes apkshine {
                    0% { opacity: 0; }
                    50% { opacity: 1; }
                    100% { opacity: 0; }
                  }
                `}</style>
              </div>
            )}
            <Button type="submit" disabled={uploading} className="rounded-full shadow-lg shadow-primary/20">
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploading ? (processing ? "Finalizing…" : `Uploading ${uploadPct}%`) : "Upload"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">All versions</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : !data?.rows.length ? (
            <div className="text-center text-muted-foreground py-12">No APKs uploaded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase border-b bg-muted/30">
                  <tr>
                    <th className="text-left p-3">Version</th>
                    <th className="text-left p-3">Size</th>
                    <th className="text-left p-3">SHA-256</th>
                    <th className="text-left p-3">Notes</th>
                    <th className="text-left p-3">Uploaded</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((v) => (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <strong>v{v.version}</strong>
                        {v.is_active === 1 && <Badge className="ml-2 bg-emerald-500 hover:bg-emerald-600">Active</Badge>}
                      </td>
                      <td className="p-3">{(v.size_bytes / 1048576).toFixed(2)} MB</td>
                      <td className="p-3 font-mono text-[10px]">{v.sha256_b64.slice(0, 24)}…</td>
                      <td className="p-3 max-w-[180px] truncate">{v.notes ?? ""}</td>
                      <td className="p-3 text-muted-foreground">
                        {formatDate(v.uploaded_at)}
                        <br />
                        <span className="text-xs">@{v.uploaded_by_email ?? "?"}</span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap space-x-1">
                        {v.is_active === 1 ? (
                          <span className="text-xs text-muted-foreground">in use</span>
                        ) : (
                          <>
                            <Button size="sm" onClick={() => activate(v)}>Activate</Button>
                            <Button size="sm" variant="destructive" onClick={() => remove(v)}>Delete</Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TabletApkVersions;
