import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { developersList, type Developer } from "@/lib/adminApi";
import {
  adminListSessions,
  adminSetRate,
  adminSetSessionValid,
  type TimeSession,
} from "@/lib/timeTrackerApi";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/format";
import {
  Loader2,
  Clock,
  PhilippinePeso,
  Camera,
  Eye,
  FolderKanban,
  Wallet,
  Ban,
  Undo2,
} from "lucide-react";

const formatDuration = (seconds: number) => {
  if (!seconds) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const AdminTimeTracker = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const requesterEmail = user?.email ?? "";

  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterDev, setFilterDev] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [rateDialog, setRateDialog] = useState<{
    open: boolean;
    developer?: Developer;
    rate: string;
    currency: string;
  }>({ open: false, rate: "", currency: "PHP" });
  const [rateSaving, setRateSaving] = useState(false);

  const fetchSessions = () => {
    if (!requesterEmail) return;
    setLoading(true);
    setError(null);
    setPage(1);
    adminListSessions({
      requester_email: requesterEmail,
      developer_id: filterDev !== "all" ? Number(filterDev) : undefined,
      from: from || undefined,
      to: to || undefined,
    })
      .then(setSessions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!requesterEmail) return;
    developersList()
      .then(setDevelopers)
      .catch((e) => setError(e.message));
  }, [requesterEmail]);

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requesterEmail, filterDev, from, to]);

  const totals = useMemo(() => {
    const activeSec = sessions.reduce((s, x) => s + x.active_seconds, 0);
    const earnings = sessions.reduce((s, x) => s + x.earnings, 0);
    const screenshots = sessions.reduce((s, x) => s + x.screenshots_count, 0);
    return { activeSec, earnings, screenshots };
  }, [sessions]);

  const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE));
  const pagedSessions = sessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openRateDialog = (devId: number) => {
    const dev = developers.find((d) => d.id === devId);
    if (!dev) return;
    const ratedDev = dev as Developer & { hourly_rate?: number; currency?: string };
    setRateDialog({
      open: true,
      developer: dev,
      rate: String(ratedDev.hourly_rate ?? 0),
      currency: ratedDev.currency ?? "PHP",
    });
  };

  const [invalidateDialog, setInvalidateDialog] = useState<{
    open: boolean;
    session?: TimeSession;
    mode: "invalidate" | "restore";
    reason: string;
    saving: boolean;
  }>({ open: false, mode: "invalidate", reason: "", saving: false });

  const toggleSessionValid = (s: TimeSession) => {
    setInvalidateDialog({
      open: true,
      session: s,
      mode: s.is_valid ? "invalidate" : "restore",
      reason: "",
      saving: false,
    });
  };

  const confirmToggleSessionValid = async () => {
    const s = invalidateDialog.session;
    if (!s) return;
    const next = invalidateDialog.mode === "restore";
    setInvalidateDialog((d) => ({ ...d, saving: true }));
    try {
      await adminSetSessionValid({
        requester_email: requesterEmail,
        session_id: s.id,
        is_valid: next,
        reason: !next ? invalidateDialog.reason.trim() || undefined : undefined,
      });
      toast({ title: next ? "Session restored" : "Session marked invalid" });
      setInvalidateDialog({ open: false, mode: "invalidate", reason: "", saving: false });
      fetchSessions();
    } catch (e) {
      toast({
        title: "Failed to update session",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
      setInvalidateDialog((d) => ({ ...d, saving: false }));
    }
  };

  const saveRate = async () => {
    if (!rateDialog.developer) return;
    const rate = Number(rateDialog.rate);
    if (Number.isNaN(rate) || rate < 0) {
      toast({ title: "Invalid rate", variant: "destructive" });
      return;
    }
    setRateSaving(true);
    try {
      await adminSetRate({
        requester_email: requesterEmail,
        developer_id: rateDialog.developer.id,
        hourly_rate: rate,
        currency: rateDialog.currency,
      });
      toast({ title: "Rate updated" });
      setRateDialog((s) => ({ ...s, open: false }));
      // refresh both lists so totals reflect new rate
      developersList().then(setDevelopers).catch(() => {});
      fetchSessions();
    } catch (e) {
      toast({
        title: "Failed to update rate",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setRateSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Time Tracker</h1>
          <p className="text-muted-foreground">
            Sessions, screenshots, and earnings from the Napai Time Tracker desktop app.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/time-tracker/screenshots")}>
            <Camera className="w-4 h-4 mr-2" />
            Screenshots
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/time-tracker/payments")}>
            <Wallet className="w-4 h-4 mr-2" />
            Pay Developer
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/projects")}>
            <FolderKanban className="w-4 h-4 mr-2" />
            Manage Projects
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> Total active time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totals.activeSec)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <PhilippinePeso className="w-4 h-4" /> Total earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              PHP {totals.earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Camera className="w-4 h-4" /> Screenshots
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.screenshots}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <div className="min-w-[200px]">
            <label className="text-xs text-muted-foreground">Developer</label>
            <Select value={filterDev} onValueChange={setFilterDev}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All developers</SelectItem>
                {developers.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {filterDev !== "all" && (
            <div className="self-end">
              <Button variant="outline" onClick={() => openRateDialog(Number(filterDev))}>
                <PhilippinePeso className="w-4 h-4 mr-2" />
                Set hourly rate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            {sessions.length} session{sessions.length === 1 ? "" : "s"} matching filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-destructive py-4 px-4 rounded-lg bg-destructive/10">
              <p className="font-medium">{error}</p>
              <Button variant="outline" className="mt-3" onClick={fetchSessions}>
                Retry
              </Button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No sessions yet.</p>
              <p className="text-sm mt-1">
                Sessions appear here once developers run the desktop time tracker.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Developer</th>
                    <th className="py-2 pr-4">Started</th>
                    <th className="py-2 pr-4">Active</th>
                    <th className="py-2 pr-4">Idle</th>
                    <th className="py-2 pr-4">Screenshots</th>
                    <th className="py-2 pr-4">Earnings</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSessions.map((s) => (
                    <tr
                      key={s.id}
                      className={`border-b hover:bg-muted/30 ${
                        !s.is_valid ? "bg-destructive/5 opacity-70" : ""
                      }`}
                    >
                      <td className="py-3 pr-4">
                        <div className="font-medium flex items-center gap-2">
                          {s.developer_name || s.developer_email}
                          {!s.is_valid && (
                            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                              Invalid
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{s.developer_email}</div>
                        {s.task && (
                          <div className="text-xs text-muted-foreground italic mt-0.5">
                            {s.task}
                          </div>
                        )}
                        {!s.is_valid && s.invalidated_reason && (
                          <div className="text-xs text-destructive mt-0.5">
                            Reason: {s.invalidated_reason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {formatDateTime(s.started_at)}
                        {!s.ended_at && (
                          <div className="text-xs text-emerald-600">running</div>
                        )}
                      </td>
                      <td className="py-3 pr-4">{formatDuration(s.active_seconds)}</td>
                      <td className="py-3 pr-4">{formatDuration(s.idle_seconds)}</td>
                      <td className="py-3 pr-4">{s.screenshots_count}</td>
                      <td className="py-3 pr-4">
                        {s.currency} {s.earnings.toFixed(2)}
                        <div className="text-xs text-muted-foreground">
                          @ {s.hourly_rate}/hr
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSessionValid(s)}
                            title={s.is_valid ? "Mark invalid" : "Restore"}
                          >
                            {s.is_valid ? (
                              <Ban className="w-4 h-4" />
                            ) : (
                              <Undo2 className="w-4 h-4" />
                            )}
                          </Button>
                          <Link to={`/admin/time-tracker/sessions/${s.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={invalidateDialog.open}
        onOpenChange={(o) =>
          setInvalidateDialog((s) => ({ ...s, open: o }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {invalidateDialog.mode === "invalidate" ? (
                <>
                  <Ban className="w-5 h-5 text-destructive" />
                  Mark session as invalid?
                </>
              ) : (
                <>
                  <Undo2 className="w-5 h-5 text-emerald-600" />
                  Restore this session?
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {invalidateDialog.mode === "invalidate"
                ? "Are you sure you want to disregard this session? Its earnings will be excluded from the developer's daily total. You can restore it later."
                : "This session will count again toward earnings and daily totals."}
            </DialogDescription>
          </DialogHeader>

          {invalidateDialog.session && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              <div className="font-medium">
                {invalidateDialog.session.developer_name ||
                  invalidateDialog.session.developer_email}
              </div>
              <div className="text-muted-foreground text-xs">
                Started {formatDateTime(invalidateDialog.session.started_at)} ·
                Active {formatDuration(invalidateDialog.session.active_seconds)} ·
                Earnings {invalidateDialog.session.currency}{" "}
                {invalidateDialog.session.earnings.toFixed(2)}
              </div>
              {invalidateDialog.session.task && (
                <div className="text-xs text-muted-foreground">
                  Task: {invalidateDialog.session.task}
                </div>
              )}
            </div>
          )}

          {invalidateDialog.mode === "invalidate" && (
            <div>
              <label className="text-sm font-medium">
                Reason{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                rows={3}
                placeholder="e.g. Idle activity, duplicate session, mistaken start…"
                value={invalidateDialog.reason}
                onChange={(e) =>
                  setInvalidateDialog((s) => ({ ...s, reason: e.target.value }))
                }
                className="mt-1"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setInvalidateDialog((s) => ({ ...s, open: false }))
              }
              disabled={invalidateDialog.saving}
            >
              Cancel
            </Button>
            <Button
              variant={
                invalidateDialog.mode === "invalidate" ? "destructive" : "default"
              }
              onClick={confirmToggleSessionValid}
              disabled={invalidateDialog.saving}
            >
              {invalidateDialog.saving && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {invalidateDialog.mode === "invalidate"
                ? "Disregard session"
                : "Restore session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rateDialog.open}
        onOpenChange={(o) => setRateDialog((s) => ({ ...s, open: o }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set hourly rate</DialogTitle>
            <DialogDescription>
              {rateDialog.developer?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Hourly rate</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={rateDialog.rate}
                onChange={(e) =>
                  setRateDialog((s) => ({ ...s, rate: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Currency</label>
              <Select
                value={rateDialog.currency}
                onValueChange={(v) =>
                  setRateDialog((s) => ({ ...s, currency: v }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHP">PHP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRateDialog((s) => ({ ...s, open: false }))}
              disabled={rateSaving}
            >
              Cancel
            </Button>
            <Button onClick={saveRate} disabled={rateSaving}>
              {rateSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTimeTracker;
