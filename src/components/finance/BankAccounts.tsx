import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Loader2, Landmark, Archive, ArchiveRestore,
  PlusCircle, PencilLine, RotateCcw, History, Info, StickyNote,
  Wallet, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  financeListAccounts, financeSaveAccount, financeDeleteAccount, financeListAccountLogs,
  type FinanceAccount, type FinanceAccountLog, type AccountLogAction,
} from "@/lib/financeApi";
import {
  MONO_RAMP, Money, MotionGrid, MotionItem, AnimatedNumber, SkeletonCard, useMask,
} from "@/components/finance/financeUi";
import AccountEquityLine from "@/components/finance/AccountEquityLine";

const CURRENCIES = ["PHP", "USD", "EUR", "SGD"];
const LOGS_PER_PAGE = 5;

// ------------------------------------------------------------------
//  Account add/edit dialog form
// ------------------------------------------------------------------
interface AccountForm {
  open: boolean;
  mode: "add" | "edit";
  id?: number;
  name: string;
  balance: string;
  currency: string;
  fx_to_base: string;
  color: string;
  notes: string;
  reason: string; // optional change note for the trail
}
const blankAccountForm = (): AccountForm => ({
  open: false, mode: "add",
  name: "", balance: "", currency: "PHP", fx_to_base: "1", color: "", notes: "", reason: "",
});

// ------------------------------------------------------------------
//  Audit-trail presentation helpers
// ------------------------------------------------------------------
const ACTION_META: Record<AccountLogAction, { label: string; Icon: typeof PlusCircle }> = {
  create:  { label: "Created",  Icon: PlusCircle },
  update:  { label: "Edited",   Icon: PencilLine },
  archive: { label: "Archived", Icon: Archive },
  restore: { label: "Restored", Icon: RotateCcw },
  delete:  { label: "Deleted",  Icon: Trash2 },
};

const FIELD_LABEL: Record<string, string> = {
  name: "Name", balance: "Balance", currency: "Currency",
  fx_to_base: "FX rate", color: "Marker", notes: "Notes", status: "Status",
};

const fmtDateTime = (s: string) => {
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const num = (v: string | number | null) =>
  v === null || v === "" ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });

const fieldValue = (field: string, v: string | number | null) => {
  if (v === null || v === "") return "empty";
  if (field === "balance" || field === "fx_to_base") return num(v);
  if (field === "color") return String(v);
  return String(v);
};

const LogEntry = ({ log, showName }: { log: FinanceAccountLog; showName?: boolean }) => {
  const meta = ACTION_META[log.action] ?? ACTION_META.update;
  const { Icon } = meta;
  const delta = log.balance_delta;
  return (
    <div className="flex gap-3 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 text-foreground">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium">{meta.label}</span>
          {showName && log.account_name && (
            <span className="text-sm text-muted-foreground truncate">· {log.account_name}</span>
          )}
          <span className="text-[11px] text-muted-foreground ml-auto whitespace-nowrap">{fmtDateTime(log.changed_at)}</span>
        </div>

        {delta != null && delta !== 0 && (
          <div className="mt-0.5 flex items-center gap-1 text-sm font-mono tabular-nums">
            {delta > 0
              ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              : <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />}
            <span className={cn("font-semibold", delta > 0 ? "text-emerald-600" : "text-rose-600")}>
              {delta > 0 ? "+" : "−"}{log.currency ? `${log.currency} ` : ""}{num(Math.abs(delta))}
            </span>
            {log.balance_before != null && log.balance_after != null && (
              <span className="text-xs text-muted-foreground">
                ({num(log.balance_before)} → {num(log.balance_after)})
              </span>
            )}
          </div>
        )}

        {log.changes && log.changes.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {log.changes.map((c, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">{FIELD_LABEL[c.field] ?? c.field}</span>{" "}
                <span className="line-through opacity-60">{fieldValue(c.field, c.from)}</span>
                {" → "}
                <span className="text-foreground">{fieldValue(c.field, c.to)}</span>
              </li>
            ))}
          </ul>
        )}

        {log.note && (
          <div className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
            <StickyNote className="w-3 h-3 mt-0.5 shrink-0" />
            <span className="italic">{log.note}</span>
          </div>
        )}
        {log.changed_by_email && (
          <div className="mt-0.5 text-[11px] text-muted-foreground/70">by {log.changed_by_email}</div>
        )}
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status?: string }) =>
  status === "archived" ? (
    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground border border-border">
      <Archive className="w-3 h-3" /> Archived
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium bg-neutral-800 text-neutral-50">
      Active
    </span>
  );

// ------------------------------------------------------------------
//  Main component
// ------------------------------------------------------------------
const BankAccounts = ({ email }: { email: string }) => {
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [base, setBase] = useState("PHP");
  const [totalBase, setTotalBase] = useState(0);
  const [loading, setLoading] = useState(true);

  const [logs, setLogs] = useState<FinanceAccountLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logBank, setLogBank] = useState("all"); // change-log filter, by bank name
  const [logPage, setLogPage] = useState(1);

  const [showArchived, setShowArchived] = useState(false);

  const [form, setForm] = useState<AccountForm>(blankAccountForm());
  const [saving, setSaving] = useState(false);

  // Per-account detail + its trail
  const [detail, setDetail] = useState<FinanceAccount | null>(null);
  const [detailLogs, setDetailLogs] = useState<FinanceAccountLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Archive / restore / delete confirmation (with optional reason)
  const [action, setAction] = useState<{
    open: boolean; mode: "archive" | "restore" | "delete"; account: FinanceAccount | null; reason: string; busy: boolean;
  }>({ open: false, mode: "archive", account: null, reason: "", busy: false });

  // ---- Data loading (silent = no skeleton, used after mutations so there's no reload flash) ----
  const loadAccounts = useCallback(async (silent = false) => {
    if (!email) return;
    if (!silent) setLoading(true);
    try {
      const res = await financeListAccounts({ requester_email: email });
      setAccounts(res.accounts);
      setBase(res.base_currency);
      setTotalBase(res.total_balance_base);
    } catch (e) {
      toast({ title: "Failed to load bank accounts", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [email, toast]);

  const loadLogs = useCallback(async () => {
    if (!email) return;
    setLogsLoading(true);
    try {
      const res = await financeListAccountLogs({ requester_email: email, limit: 40 });
      setLogs(res.logs);
    } catch {
      /* trail is non-critical */
    } finally {
      setLogsLoading(false);
    }
  }, [email]);

  useEffect(() => { loadAccounts(); loadLogs(); }, [loadAccounts, loadLogs]);

  // Refresh data after any mutation WITHOUT the full-page skeleton (no reload flash).
  const refreshQuiet = useCallback(() => {
    loadAccounts(true);
    loadLogs();
    if (detail) refreshDetail(detail.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAccounts, loadLogs, detail]);

  // ---- Add / edit ----
  const openAdd = () => setForm({ ...blankAccountForm(), open: true, mode: "add" });
  const openEdit = (a: FinanceAccount) => setForm({
    open: true, mode: "edit", id: a.id,
    name: a.name, balance: String(a.balance), currency: a.currency,
    fx_to_base: String(a.fx_to_base), color: a.color ?? "", notes: a.notes ?? "", reason: "",
  });

  const saveAccount = async () => {
    const balance = parseFloat(form.balance || "0");
    const fx = parseFloat(form.fx_to_base || "1");
    if (!form.name.trim() || isNaN(balance)) {
      toast({ title: "Name and a valid balance are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await financeSaveAccount({
        requester_email: email,
        id: form.mode === "edit" ? form.id : undefined,
        name: form.name.trim(),
        balance,
        currency: form.currency,
        fx_to_base: isNaN(fx) || fx <= 0 ? 1 : fx,
        color: form.color.trim() || null,
        notes: form.notes.trim() || null,
        note: form.reason.trim() || null,
      });
      toast({ title: form.mode === "add" ? "Account added" : "Account updated" });
      setForm(blankAccountForm());
      refreshQuiet();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ---- Detail drawer ----
  const refreshDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await financeListAccountLogs({ requester_email: email, account_id: id, limit: 100 });
      setDetailLogs(res.logs);
    } catch {
      setDetailLogs([]);
    } finally {
      setDetailLoading(false);
    }
  };
  const openDetail = (a: FinanceAccount) => { setDetail(a); refreshDetail(a.id); };

  // Keep the open detail card in sync with refreshed account data
  useEffect(() => {
    if (!detail) return;
    const fresh = accounts.find((a) => a.id === detail.id);
    if (fresh && fresh !== detail) setDetail(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  // ---- Archive / restore / delete ----
  const askArchive = (a: FinanceAccount) => setAction({ open: true, mode: "archive", account: a, reason: "", busy: false });
  const askRestore = (a: FinanceAccount) => setAction({ open: true, mode: "restore", account: a, reason: "", busy: false });
  const askDelete  = (a: FinanceAccount) => setAction({ open: true, mode: "delete",  account: a, reason: "", busy: false });

  const runAction = async () => {
    const { mode, account, reason } = action;
    if (!account) return;
    setAction((s) => ({ ...s, busy: true }));
    try {
      if (mode === "delete") {
        await financeDeleteAccount({ requester_email: email, id: account.id, note: reason.trim() || null });
        toast({ title: "Account deleted" });
        if (detail?.id === account.id) setDetail(null);
      } else {
        await financeSaveAccount({
          requester_email: email, id: account.id, name: account.name,
          status: mode === "archive" ? "archived" : "active",
          note: reason.trim() || null,
        });
        toast({ title: mode === "archive" ? "Account archived" : "Account restored" });
      }
      setAction({ open: false, mode, account: null, reason: "", busy: false });
      refreshQuiet();
    } catch (e) {
      toast({ title: "Action failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
      setAction((s) => ({ ...s, busy: false }));
    }
  };

  // ---- Derived ----
  const activeAccounts = accounts.filter((a) => a.status !== "archived");
  const archivedAccounts = accounts.filter((a) => a.status === "archived");
  const visible = showArchived ? accounts : activeAccounts;

  // Change-log filter (by bank) + pagination. Names come from the logs themselves so
  // deleted accounts stay filterable, merged with any account that has no entry yet.
  const logBanks = useMemo(() => {
    const names = new Set<string>();
    logs.forEach((l) => { if (l.account_name) names.add(l.account_name); });
    accounts.forEach((a) => names.add(a.name));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [logs, accounts]);

  const filteredLogs = useMemo(
    () => (logBank === "all" ? logs : logs.filter((l) => l.account_name === logBank)),
    [logs, logBank],
  );
  const logPageCount = Math.max(1, Math.ceil(filteredLogs.length / LOGS_PER_PAGE));
  const currentLogPage = Math.min(logPage, logPageCount);
  const pagedLogs = filteredLogs.slice((currentLogPage - 1) * LOGS_PER_PAGE, currentLogPage * LOGS_PER_PAGE);

  useEffect(() => { setLogPage(1); }, [logBank]);
  useEffect(() => { if (logPage > logPageCount) setLogPage(logPageCount); }, [logPage, logPageCount]);

  const topShare = activeAccounts.length && totalBase > 0
    ? Math.max(...activeAccounts.map((a) => ((a.balance_base ?? 0) / totalBase) * 100))
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">Bank Accounts</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Every balance in its own currency, with a full change trail. Combined total shown in {base}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {archivedAccounts.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
              <Switch checked={showArchived} onCheckedChange={setShowArchived} />
              Show archived ({archivedAccounts.length})
            </label>
          )}
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add Bank
          </Button>
        </div>
      </div>

      {/* Summary */}
      <MotionGrid className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MotionItem>
          <Card className="h-full"><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Total Balance</p>
            <div className="mt-1 text-lg font-bold font-mono tabular-nums truncate"><Money prefix={`${base} `} value={totalBase} /></div>
          </CardContent></Card>
        </MotionItem>
        <MotionItem>
          <Card className="h-full"><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Active accounts</p>
            <div className="mt-1 text-lg font-bold font-mono tabular-nums"><AnimatedNumber value={activeAccounts.length} decimals={0} maskable={false} /></div>
          </CardContent></Card>
        </MotionItem>
        <MotionItem>
          <Card className="h-full"><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Archived</p>
            <div className="mt-1 text-lg font-bold font-mono tabular-nums"><AnimatedNumber value={archivedAccounts.length} decimals={0} maskable={false} /></div>
          </CardContent></Card>
        </MotionItem>
        <MotionItem>
          <Card className="h-full"><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Largest account share</p>
            <div className="mt-1 text-lg font-bold font-mono tabular-nums"><AnimatedNumber value={topShare} decimals={1} suffix="%" maskable={false} /></div>
          </CardContent></Card>
        </MotionItem>
      </MotionGrid>

      {/* Equity line — balances replayed from the change trail */}
      <AccountEquityLine email={email} accounts={accounts} base={base} />

      {/* Accounts table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Accounts</CardTitle>
              <CardDescription>{activeAccounts.length} active{archivedAccounts.length > 0 ? ` · ${archivedAccounts.length} archived` : ""} · click a row for its history</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {visible.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Landmark className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No bank accounts yet. Add one to start tracking balances.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">Bank</th>
                    <th className="py-2 pr-3">Currency</th>
                    <th className="py-2 pr-3 text-right">Balance</th>
                    <th className="py-2 pr-3 text-right">In {base}</th>
                    <th className="py-2 pr-3 text-right">Share</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((a, i) => {
                    const archived = a.status === "archived";
                    const share = totalBase > 0 && !archived ? ((a.balance_base ?? 0) / totalBase) * 100 : 0;
                    return (
                      <tr key={a.id}
                        className={cn("border-b transition-colors hover:bg-muted/40 cursor-pointer", archived && "opacity-55")}
                        onClick={() => openDetail(a)}>
                        <td className="py-2.5 pr-3 font-medium">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.color || MONO_RAMP[i % MONO_RAMP.length] }} />
                            <span className="min-w-0">
                              <span className="block truncate">{a.name}</span>
                              {a.notes && <span className="block text-xs text-muted-foreground truncate max-w-[220px]">{a.notes}</span>}
                            </span>
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{a.currency}</td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums font-semibold whitespace-nowrap"><Money prefix={`${a.currency} `} value={a.balance} /></td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-muted-foreground whitespace-nowrap"><Money prefix={`${base} `} value={a.balance_base ?? 0} /></td>
                        <td className="py-2.5 pr-3 text-right">
                          <span className="inline-flex items-center gap-2">
                            <span className="hidden sm:block h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                              <span className="block h-full bg-neutral-700" style={{ width: `${Math.min(share, 100)}%` }} />
                            </span>
                            <span className="font-mono tabular-nums text-xs text-muted-foreground w-10 text-right">{share.toFixed(0)}%</span>
                          </span>
                        </td>
                        <td className="py-2.5 pr-3"><StatusBadge status={a.status} /></td>
                        <td className="py-2.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="History" onClick={() => openDetail(a)}>
                              <History className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEdit(a)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {archived ? (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Restore" onClick={() => askRestore(a)}>
                                <ArchiveRestore className="w-3.5 h-3.5" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Archive" onClick={() => askArchive(a)}>
                                <Archive className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Delete" onClick={() => askDelete(a)}>
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Global change trail */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><History className="w-4 h-4" /> Change Log</CardTitle>
              <CardDescription>
                {logBank === "all"
                  ? "Recent balance changes, edits, archives and deletions across all accounts"
                  : `Changes for ${logBank}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={logBank} onValueChange={setLogBank}>
                <SelectTrigger className="h-8 w-[180px] text-sm">
                  <SelectValue placeholder="All banks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All banks</SelectItem>
                  {logBanks.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={loadLogs} disabled={logsLoading}>
                {logsLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading && logs.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: LOGS_PER_PAGE }).map((_, i) => <div key={i} className="h-12 rounded bg-muted animate-pulse" />)}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <History className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>
                {logBank === "all"
                  ? "No changes recorded yet. Adding, editing or archiving an account will show up here."
                  : `No changes recorded for ${logBank} yet.`}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {pagedLogs.map((log) => <LogEntry key={log.id} log={log} showName={logBank === "all"} />)}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">
                  {(currentLogPage - 1) * LOGS_PER_PAGE + 1}–{Math.min(currentLogPage * LOGS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-7 w-7"
                    title="Previous" disabled={currentLogPage <= 1}
                    onClick={() => setLogPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Page {currentLogPage} / {logPageCount}
                  </span>
                  <Button variant="outline" size="icon" className="h-7 w-7"
                    title="Next" disabled={currentLogPage >= logPageCount}
                    onClick={() => setLogPage((p) => Math.min(logPageCount, p + 1))}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add / edit dialog */}
      <Dialog open={form.open} onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.mode === "add" ? "Add Bank Account" : "Edit Bank Account"}</DialogTitle>
            <DialogDescription>Track a bank or wallet balance.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Bank / Account name *</label>
              <Input className="mt-1" placeholder="e.g. BPI Savings, GCash"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Balance *</label>
                <Input className="mt-1" type="number" step="0.01" placeholder="0.00"
                  value={form.balance}
                  onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Currency</label>
                <Select value={form.currency}
                  onValueChange={(v) => setForm((f) => ({ ...f, currency: v, fx_to_base: v === "PHP" ? "1" : f.fx_to_base }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Rate → PHP</label>
                <Input className="mt-1" type="number" step="0.0001" placeholder="1"
                  disabled={form.currency === "PHP"}
                  value={form.fx_to_base}
                  onChange={(e) => setForm((f) => ({ ...f, fx_to_base: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Marker</label>
                <Input className="mt-1" type="color"
                  value={form.color || "#0a0a0a"}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea className="mt-1" rows={2} placeholder="Optional — purpose, account holder, terms…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Reason for change <span className="font-normal">(optional, logged)</span></label>
              <Input className="mt-1" placeholder={form.mode === "add" ? "e.g. opening balance" : "e.g. client payment received"}
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving}
              onClick={() => setForm((f) => ({ ...f, open: false }))}>Cancel</Button>
            <Button onClick={saveAccount} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {form.mode === "add" ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive / restore / delete dialog (with optional reason) */}
      <Dialog open={action.open} onOpenChange={(o) => !action.busy && setAction((s) => ({ ...s, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action.mode === "delete" ? "Delete account" : action.mode === "archive" ? "Archive account" : "Restore account"}
              {action.account ? ` — ${action.account.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              {action.mode === "delete"
                ? "This bank account will be permanently removed. Its history stays in the change log."
                : action.mode === "archive"
                  ? "Archived accounts are hidden from totals, charts and runway, but keep their full history."
                  : "This account will count toward your balances and runway again."}
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Reason <span className="font-normal">(optional, logged)</span></label>
            <Textarea className="mt-1" rows={2}
              placeholder={action.mode === "delete" ? "e.g. duplicate entry" : action.mode === "archive" ? "e.g. account closed" : "e.g. reopened"}
              value={action.reason}
              onChange={(e) => setAction((s) => ({ ...s, reason: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={action.busy}
              onClick={() => setAction((s) => ({ ...s, open: false }))}>Cancel</Button>
            <Button variant={action.mode === "delete" ? "destructive" : "default"} onClick={runAction} disabled={action.busy}>
              {action.busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {action.mode === "delete" ? "Delete" : action.mode === "archive" ? "Archive" : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account detail + trail drawer */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: detail.color || MONO_RAMP[0] }} />
                  {detail.name}
                  <StatusBadge status={detail.status} />
                </DialogTitle>
                <DialogDescription>Account details and full change history.</DialogDescription>
              </DialogHeader>

              {/* Detail facts */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Fact label="Balance"><Money prefix={`${detail.currency} `} value={detail.balance} /></Fact>
                <Fact label={`In ${base}`}><Money prefix={`${base} `} value={detail.balance_base ?? detail.balance * detail.fx_to_base} /></Fact>
                <Fact label="Currency">{detail.currency}</Fact>
                <Fact label="FX rate → PHP">{detail.fx_to_base}</Fact>
                {detail.created_at && <Fact label="Created">{fmtDateTime(detail.created_at)}</Fact>}
                {detail.updated_at && <Fact label="Last updated">{fmtDateTime(detail.updated_at)}</Fact>}
              </div>
              {detail.notes && (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><Info className="w-3.5 h-3.5" /> Notes</div>
                  {detail.notes}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => { const a = detail; setDetail(null); openEdit(a); }}>
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                </Button>
                {detail.status === "archived" ? (
                  <Button variant="outline" size="sm" onClick={() => askRestore(detail)}>
                    <ArchiveRestore className="w-3.5 h-3.5 mr-2" /> Restore
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => askArchive(detail)}>
                    <Archive className="w-3.5 h-3.5 mr-2" /> Archive
                  </Button>
                )}
              </div>

              {/* Trail */}
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-1"><History className="w-4 h-4" /> Change trail</div>
                {detailLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 rounded bg-muted animate-pulse" />)}
                  </div>
                ) : detailLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No changes recorded for this account yet.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {detailLogs.map((log) => <LogEntry key={log.id} log={log} />)}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="rounded-md border border-border p-2.5">
    <div className="text-[11px] text-muted-foreground">{label}</div>
    <div className="mt-0.5 font-mono tabular-nums font-medium">{children}</div>
  </div>
);

export default BankAccounts;
