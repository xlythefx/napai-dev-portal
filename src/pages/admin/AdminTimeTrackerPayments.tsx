import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { developersList, type Developer } from "@/lib/adminApi";
import {
  adminListDailyEarnings,
  adminRecordPayment,
  adminDeletePayment,
  paymentProofUrl,
  type DailyEarning,
} from "@/lib/timeTrackerApi";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/format";
import {
  Loader2,
  Wallet,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Camera,
  Eye,
  Undo2,
} from "lucide-react";

const formatDuration = (seconds: number) => {
  if (!seconds) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const AdminTimeTrackerPayments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const requesterEmail = user?.email ?? "";

  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [days, setDays] = useState<DailyEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterDev, setFilterDev] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "paid">(
    "all"
  );

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const [proofDialog, setProofDialog] = useState<{
    open: boolean;
    url: string;
    isPdf: boolean;
    label: string;
  }>({ open: false, url: "", isPdf: false, label: "" });

  const [payDialog, setPayDialog] = useState<{
    open: boolean;
    row?: DailyEarning;
    amount: string;
    note: string;
    proof: File | null;
  }>({ open: false, amount: "", note: "", proof: null });
  const [paySaving, setPaySaving] = useState(false);

  const fetchDays = () => {
    if (!requesterEmail) return;
    setLoading(true);
    setError(null);
    setPage(1);
    adminListDailyEarnings({
      requester_email: requesterEmail,
      developer_id: filterDev !== "all" ? Number(filterDev) : undefined,
      from: from || undefined,
      to: to || undefined,
    })
      .then(setDays)
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
    fetchDays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requesterEmail, filterDev, from, to]);

  const filteredDays = useMemo(() => {
    if (statusFilter === "all") return days;
    if (statusFilter === "paid") return days.filter((d) => d.paid);
    return days.filter((d) => !d.paid);
  }, [days, statusFilter]);

  const totals = useMemo(() => {
    const released = days
      .filter((d) => d.paid && d.payment)
      .reduce((s, d) => s + (d.payment?.amount ?? 0), 0);
    const toBeMade = days
      .filter((d) => !d.paid)
      .reduce((s, d) => s + d.earnings, 0);
    const totalActive = days.reduce((s, d) => s + d.active_seconds, 0);
    return { released, toBeMade, totalActive };
  }, [days]);

  const totalPages = Math.max(1, Math.ceil(filteredDays.length / PAGE_SIZE));
  const pagedDays = filteredDays.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const openPayDialog = (row: DailyEarning) => {
    setPayDialog({
      open: true,
      row,
      amount: String(row.payment?.amount ?? row.earnings.toFixed(2)),
      note: row.payment?.note ?? "",
      proof: null,
    });
  };

  const submitPayment = async () => {
    if (!payDialog.row) return;
    const amount = Number(payDialog.amount);
    if (Number.isNaN(amount) || amount < 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    setPaySaving(true);
    try {
      await adminRecordPayment({
        requester_email: requesterEmail,
        developer_id: payDialog.row.developer_id,
        payment_date: payDialog.row.date,
        amount,
        currency: "PHP",
        note: payDialog.note || undefined,
        proof: payDialog.proof,
      });
      toast({ title: "Payment recorded" });
      setPayDialog({ open: false, amount: "", note: "", proof: null });
      fetchDays();
    } catch (e) {
      toast({
        title: "Failed to record payment",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setPaySaving(false);
    }
  };

  const undoPayment = async (row: DailyEarning) => {
    if (!row.payment) return;
    if (!window.confirm(`Undo payment of PHP ${row.payment.amount.toFixed(2)} for ${row.developer_email} on ${formatDate(row.date)}?`)) {
      return;
    }
    try {
      await adminDeletePayment({
        requester_email: requesterEmail,
        payment_id: row.payment.id,
      });
      toast({ title: "Payment removed" });
      fetchDays();
    } catch (e) {
      toast({
        title: "Failed to undo payment",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Pay Developer</h1>
          <p className="text-muted-foreground">
            Daily aggregated earnings. Mark days as paid and attach proof of
            payment.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Total payments
              released
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              PHP{" "}
              {totals.released.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-amber-600" /> Total payments to be
              made
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              PHP{" "}
              {totals.toBeMade.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> Total active time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(totals.totalActive)}
            </div>
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
          <div className="min-w-[160px]">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unpaid">Unpaid only</SelectItem>
                <SelectItem value="paid">Paid only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily earnings</CardTitle>
          <CardDescription>
            {filteredDays.length} day{filteredDays.length === 1 ? "" : "s"} matching filters.
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
              <Button variant="outline" className="mt-3" onClick={fetchDays}>
                Retry
              </Button>
            </div>
          ) : filteredDays.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No earnings yet for this filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Developer</th>
                    <th className="py-2 pr-4">Active</th>
                    <th className="py-2 pr-4">Sessions</th>
                    <th className="py-2 pr-4">Earnings</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Proof</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedDays.map((d) => {
                    const key = `${d.developer_id}-${d.date}`;
                    return (
                      <tr key={key} className="border-b hover:bg-muted/30">
                        <td className="py-3 pr-4 font-medium">{formatDate(d.date)}</td>
                        <td className="py-3 pr-4">
                          <div className="font-medium">
                            {d.developer_name || d.developer_email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {d.developer_email}
                          </div>
                        </td>
                        <td className="py-3 pr-4">{formatDuration(d.active_seconds)}</td>
                        <td className="py-3 pr-4">
                          {d.session_count}
                          {d.invalid_count > 0 && (
                            <div className="text-xs text-destructive">
                              {d.invalid_count} invalid
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          PHP {d.earnings.toFixed(2)}
                          <div className="text-xs text-muted-foreground">
                            @ {d.hourly_rate}/hr
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {d.paid ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" />
                              Paid PHP {d.payment?.amount.toFixed(2)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">
                              <Clock className="w-3 h-3" />
                              Unpaid
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {d.payment?.proof_path ? (
                            <button
                              type="button"
                              onClick={() =>
                                setProofDialog({
                                  open: true,
                                  url: paymentProofUrl(d.payment!.id, requesterEmail),
                                  isPdf: /\.pdf$/i.test(d.payment!.proof_path ?? ""),
                                  label: `${d.developer_name || d.developer_email} · ${formatDate(d.date)}`,
                                })
                              }
                              className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `/admin/time-tracker/screenshots?developer_id=${d.developer_id}&date=${d.date}`
                                )
                              }
                              title="View screenshots"
                            >
                              <Camera className="w-4 h-4" />
                            </Button>
                            {d.paid ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => undoPayment(d)}
                              >
                                <Undo2 className="w-4 h-4 mr-1" />
                                Undo
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => openPayDialog(d)}>
                                Mark paid
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
        open={proofDialog.open}
        onOpenChange={(o) => setProofDialog((s) => ({ ...s, open: o }))}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment proof</DialogTitle>
            <DialogDescription>{proofDialog.label}</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 overflow-hidden">
            {proofDialog.isPdf ? (
              <iframe
                src={proofDialog.url}
                title="Payment proof"
                className="w-full h-[70vh]"
              />
            ) : (
              <img
                src={proofDialog.url}
                alt="Payment proof"
                className="w-full max-h-[70vh] object-contain bg-background"
              />
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProofDialog((s) => ({ ...s, open: false }))}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={payDialog.open}
        onOpenChange={(o) => setPayDialog((s) => ({ ...s, open: o }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as paid</DialogTitle>
            <DialogDescription>
              {payDialog.row?.developer_email} — {payDialog.row ? formatDate(payDialog.row.date) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Amount (PHP)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={payDialog.amount}
                onChange={(e) =>
                  setPayDialog((s) => ({ ...s, amount: e.target.value }))
                }
                className="mt-1"
              />
              {payDialog.row && (
                <p className="text-xs text-muted-foreground mt-1">
                  Computed earnings: PHP {payDialog.row.earnings.toFixed(2)} ({" "}
                  {formatDuration(payDialog.row.active_seconds)} @{" "}
                  {payDialog.row.hourly_rate}/hr)
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">
                Proof of payment (optional)
              </label>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={(e) =>
                  setPayDialog((s) => ({
                    ...s,
                    proof: e.target.files?.[0] ?? null,
                  }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Note (optional)</label>
              <Textarea
                value={payDialog.note}
                onChange={(e) =>
                  setPayDialog((s) => ({ ...s, note: e.target.value }))
                }
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayDialog((s) => ({ ...s, open: false }))}
              disabled={paySaving}
            >
              Cancel
            </Button>
            <Button onClick={submitPayment} disabled={paySaving}>
              {paySaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTimeTrackerPayments;
