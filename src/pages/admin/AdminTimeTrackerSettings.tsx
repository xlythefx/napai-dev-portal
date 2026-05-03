import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Loader2,
  Trash2,
  CheckCircle2,
  Download,
  FileBox,
  AlertCircle,
} from "lucide-react";
import {
  listReleases,
  uploadRelease,
  setCurrentRelease,
  deleteRelease,
  downloadUrl,
  formatBytes,
  type TimeTrackerRelease,
} from "@/lib/timeTrackerReleasesApi";

const AdminTimeTrackerSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const adminEmail = user?.email ?? "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [releases, setReleases] = useState<TimeTrackerRelease[]>([]);
  const [loading, setLoading] = useState(false);

  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [setCurrentOnUpload, setSetCurrentOnUpload] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busyRowId, setBusyRowId] = useState<number | null>(null);

  const refresh = async () => {
    if (!adminEmail) return;
    setLoading(true);
    try {
      setReleases(await listReleases({ requester_email: adminEmail }));
    } catch (e: any) {
      toast({ title: "Failed to load releases", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [adminEmail]);

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !version) {
      const m = f.name.match(/(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)/);
      if (m) setVersion(m[1]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({ title: "Pick an installer file first", variant: "destructive" });
      return;
    }
    if (!version.trim()) {
      toast({ title: "Version is required", variant: "destructive" });
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      await uploadRelease({
        requester_email: adminEmail,
        version: version.trim(),
        notes: notes.trim() || undefined,
        platform: "win",
        setCurrent: setCurrentOnUpload,
        file,
        onProgress: (loaded, total) => setProgress(Math.round((loaded / total) * 100)),
      });
      toast({ title: "Upload complete", description: `${file.name} (${formatBytes(file.size)})` });
      setVersion(""); setNotes(""); setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refresh();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleSetCurrent = async (id: number) => {
    setBusyRowId(id);
    try {
      await setCurrentRelease({ requester_email: adminEmail, id });
      await refresh();
    } catch (e: any) {
      toast({ title: "Failed to set current", description: e.message, variant: "destructive" });
    } finally {
      setBusyRowId(null);
    }
  };

  const handleDelete = async (r: TimeTrackerRelease) => {
    if (!confirm(`Delete release ${r.version} (${r.filename})? This cannot be undone.`)) return;
    setBusyRowId(r.id);
    try {
      await deleteRelease({ requester_email: adminEmail, id: r.id });
      await refresh();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally {
      setBusyRowId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Time Tracker Settings</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Upload desktop installer builds. The release marked <strong>current</strong> is the one
          users get from the public download page.
        </p>
      </div>

      {/* Upload card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="w-5 h-5" />
            Upload new release
          </CardTitle>
          <CardDescription>
            Drop your built <code>.exe</code> / <code>.msi</code> here. Files live in
            <code> uploads/timetracker/releases/</code>; metadata is tracked in the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="text-xs text-muted-foreground">Version</label>
              <Input
                placeholder="e.g. 0.1.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={uploading}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Installer file (.exe / .msi)</label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".exe,.msi,.dmg,.pkg,.zip,.deb,.AppImage"
                onChange={handlePickFile}
                disabled={uploading}
              />
              {file && (
                <p className="text-xs text-muted-foreground mt-1">
                  {file.name} · {formatBytes(file.size)}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Release notes (optional)</label>
            <Textarea
              rows={3}
              placeholder="What changed in this release?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={uploading}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox
              checked={setCurrentOnUpload}
              onCheckedChange={(v) => setSetCurrentOnUpload(!!v)}
              disabled={uploading}
            />
            Make this the current download for Windows
          </label>

          {uploading && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Uploading…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleUpload} disabled={uploading || !file || !version.trim()}>
              {uploading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</>
                : <><Upload className="w-4 h-4 mr-2" /> Upload release</>}
            </Button>
            {file && !uploading && (
              <Button variant="ghost" onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}>
                Clear file
              </Button>
            )}
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              Installer files are large. If uploads fail with HTTP 413 or
              "exceeds upload_max_filesize", raise <code>upload_max_filesize</code> and{" "}
              <code>post_max_size</code> in <code>php.ini</code> to at least <strong>200M</strong>,
              then restart Apache.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Releases table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileBox className="w-5 h-5" />
            Releases
          </CardTitle>
          <CardDescription>
            All uploaded builds. Set one as <strong>current</strong> per platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : releases.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No releases yet. Upload your first build above.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 md:px-2 py-2 font-medium">Version</th>
                    <th className="px-2 py-2 font-medium">Platform</th>
                    <th className="px-2 py-2 font-medium">Size</th>
                    <th className="px-2 py-2 font-medium hidden md:table-cell">Uploaded</th>
                    <th className="px-2 py-2 font-medium hidden md:table-cell">Downloads</th>
                    <th className="px-2 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {releases.map((r) => {
                    const busy = busyRowId === r.id;
                    return (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="px-4 md:px-2 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{r.version}</span>
                            {r.is_current && (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="w-3 h-3" /> current
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[260px]">
                            {r.filename}
                          </div>
                          {r.notes && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2 max-w-[280px]">
                              {r.notes}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-3 uppercase text-xs">{r.platform}</td>
                        <td className="px-2 py-3 whitespace-nowrap">{formatBytes(r.file_size)}</td>
                        <td className="px-2 py-3 hidden md:table-cell whitespace-nowrap text-muted-foreground">
                          {new Date(r.uploaded_at.replace(" ", "T")).toLocaleString()}
                        </td>
                        <td className="px-2 py-3 hidden md:table-cell">{r.download_count}</td>
                        <td className="px-2 py-3">
                          <div className="flex justify-end gap-1">
                            <a href={downloadUrl(r.id)} target="_blank" rel="noreferrer">
                              <Button size="icon" variant="ghost" title="Download">
                                <Download className="w-4 h-4" />
                              </Button>
                            </a>
                            {!r.is_current && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => handleSetCurrent(r.id)}
                              >
                                {busy
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : "Set current"}
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              disabled={busy || r.is_current}
                              title={r.is_current ? "Unset as current first" : "Delete"}
                              onClick={() => handleDelete(r)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTimeTrackerSettings;
