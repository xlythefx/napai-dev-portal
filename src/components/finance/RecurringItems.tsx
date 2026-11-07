import { useState, useEffect, useCallback } from "react";
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
import { confirm } from "@/components/ui/confirm-dialog";
import { useReducedMotion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import {
  Plus, Pencil, Trash2, Loader2, Repeat, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  financeListRecurring, financeSaveRecurring, financeDeleteRecurring,
  INCOME_CATEGORIES, EXPENSE_CATEGORIES, categoryLabel,
  type RecurringItem, type TransactionType,
} from "@/lib/financeApi";
import {
  INK, MONO_RAMP, kFmt, Money, MotionGrid, MotionItem, AnimatedNumber,
  ChartCard, MonoTooltip, HatchDef, SkeletonCard, useMask,
} from "@/components/finance/financeUi";

const CURRENCIES = ["PHP", "USD", "EUR", "SGD"];

const TypeBadge = ({ type }: { type: TransactionType }) => (
  <span className={cn(
    "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium",
    type === "income" ? "bg-neutral-800 text-neutral-50" : "bg-muted text-foreground border border-border",
  )}>
    {type === "income" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
    {type === "income" ? "IN" : "OUT"}
  </span>
);

interface RecurringForm {
  open: boolean;
  mode: "add" | "edit";
  id?: number;
  type: TransactionType;
  label: string;
  category: string;
  amount: string;
  currency: string;
  fx_to_base: string;
  day_of_month: string;
  active: boolean;
  notes: string;
}
const blankRecurringForm = (): RecurringForm => ({
  open: false, mode: "add",
  type: "expense", label: "", category: "subscription",
  amount: "", currency: "PHP", fx_to_base: "1", day_of_month: "",
  active: true, notes: "",
});

const MiniStat = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <MotionItem>
    <Card className="h-full transition-shadow duration-200 hover:shadow-[var(--shadow-soft)]">
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-1 text-lg font-bold font-mono tabular-nums truncate">{children}</div>
      </CardContent>
    </Card>
  </MotionItem>
);

const RecurringItems = ({ email }: { email: string }) => {
  const { toast } = useToast();
  const reduce = useReducedMotion();
  const masked = useMask();
  const yFmt = (v: number) => (masked ? "•" : kFmt(v));
  const base = "PHP";

  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaused, setShowPaused] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [sort, setSort] = useState<"amount_desc" | "amount_asc" | "category" | "label">("amount_desc");

  const [form, setForm] = useState<RecurringForm>(blankRecurringForm());
  const [saving, setSaving] = useState(false);

  // silent = no skeleton (used after a mutation so there's no reload flash)
  const load = useCallback(async (silent = false) => {
    if (!email) return;
    if (!silent) setLoading(true);
    try {
      const res = await financeListRecurring({ requester_email: email });
      setRecurring(res.recurring);
    } catch (e) {
      toast({ title: "Failed to load recurring items", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [email, toast]);

  useEffect(() => { load(); }, [load]);

  const recCategories = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const openAdd = () => setForm({ ...blankRecurringForm(), open: true, mode: "add" });
  const openEdit = (r: RecurringItem) => setForm({
    open: true, mode: "edit", id: r.id,
    type: r.type, label: r.label, category: r.category,
    amount: String(r.amount), currency: r.currency, fx_to_base: String(r.fx_to_base),
    day_of_month: r.day_of_month != null ? String(r.day_of_month) : "",
    active: r.active === 1, notes: r.notes ?? "",
  });

  const save = async () => {
    const amount = parseFloat(form.amount);
    const fx = parseFloat(form.fx_to_base || "1");
    if (!form.label.trim() || isNaN(amount) || amount < 0) {
      toast({ title: "Label and a valid amount are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await financeSaveRecurring({
        requester_email: email,
        id: form.mode === "edit" ? form.id : undefined,
        type: form.type,
        label: form.label.trim(),
        category: form.category,
        amount,
        currency: form.currency,
        fx_to_base: isNaN(fx) || fx <= 0 ? 1 : fx,
        day_of_month: form.day_of_month ? parseInt(form.day_of_month, 10) : null,
        active: form.active,
        notes: form.notes.trim() || null,
      });
      toast({ title: form.mode === "add" ? "Item added" : "Item updated" });
      setForm(blankRecurringForm());
      load(true);
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: RecurringItem) => {
    if (!(await confirm({
      title: `Delete "${r.label}"?`,
      description: "This recurring item will be removed permanently.",
      confirmText: "Delete item",
      tone: "danger",
    }))) return;
    try {
      await financeDeleteRecurring({ requester_email: email, id: r.id });
      toast({ title: "Deleted" });
      load(true);
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  };

  // Quick active/paused toggle straight from the row (no dialog, no reload)
  const toggleActive = async (r: RecurringItem) => {
    try {
      await financeSaveRecurring({
        requester_email: email, id: r.id, type: r.type, label: r.label,
        category: r.category, amount: r.amount, currency: r.currency,
        fx_to_base: r.fx_to_base, day_of_month: r.day_of_month,
        active: r.active !== 1, notes: r.notes,
      });
      load(true);
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  };

  // ---- Analytics (base PHP) ----
  const active = recurring.filter((r) => r.active === 1);
  const monthlyIncome  = active.filter((r) => r.type === "income").reduce((s, r) => s + r.amount * r.fx_to_base, 0);
  const monthlyExpense = active.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount * r.fx_to_base, 0);
  const net = monthlyIncome - monthlyExpense;
  const activeCount = active.length;

  const incomeVsExpense = [{ name: "Per month", income: monthlyIncome, expense: monthlyExpense }];

  const expenseByCat: Record<string, number> = {};
  active.filter((r) => r.type === "expense").forEach((r) => {
    expenseByCat[r.category] = (expenseByCat[r.category] ?? 0) + r.amount * r.fx_to_base;
  });
  const expensePie = Object.entries(expenseByCat)
    .map(([category, value]) => ({ name: categoryLabel(category), value }))
    .sort((a, b) => b.value - a.value);

  const amtBase = (r: RecurringItem) => r.amount * r.fx_to_base;
  const visible = recurring
    .filter((r) => (showPaused ? true : r.active === 1))
    .filter((r) => (typeFilter === "all" ? true : r.type === typeFilter))
    .slice()
    .sort((a, b) => {
      switch (sort) {
        case "amount_asc":  return amtBase(a) - amtBase(b);
        case "amount_desc": return amtBase(b) - amtBase(a);
        case "category":    return categoryLabel(a.category).localeCompare(categoryLabel(b.category)) || a.label.localeCompare(b.label);
        case "label":       return a.label.localeCompare(b.label);
        default:            return 0;
      }
    });

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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">Recurring Items</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Monthly income, expenses and subscriptions. Only active items count toward the monthly totals ({base}).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
            <Switch checked={showPaused} onCheckedChange={setShowPaused} />
            Show paused
          </label>
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add Recurring
          </Button>
        </div>
      </div>

      {/* Small analytics — stat cards */}
      <MotionGrid className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="Monthly Income"><Money prefix={`${base} `} value={monthlyIncome} /></MiniStat>
        <MiniStat label="Monthly Expenses"><Money prefix={`${base} `} value={monthlyExpense} /></MiniStat>
        <MiniStat label="Net / Month">
          <span className={cn(net < 0 && "text-rose-600")}>
            <Money prefix={`${net >= 0 ? "+" : "−"}${base} `} value={Math.abs(net)} />
          </span>
        </MiniStat>
        <MiniStat label="Active items">
          <AnimatedNumber value={activeCount} decimals={0} maskable={false} />
          <span className="text-xs text-muted-foreground font-sans"> / {recurring.length}</span>
        </MiniStat>
      </MotionGrid>

      {/* Small analytics — compact charts */}
      <MotionGrid className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Income vs Expenses" description={`Active recurring, per month (${base})`}>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={incomeVsExpense} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <HatchDef id="recExpHatch" />
              <CartesianGrid strokeDasharray="3 3" stroke={INK.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: INK.g500 }} axisLine={{ stroke: INK.g200 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: INK.g500 }} tickFormatter={yFmt} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: INK.g100 }} content={<MonoTooltip valuePrefix={`${base} `} />} />
              <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
              <Bar dataKey="income" name="Income" fill={INK.fg} radius={[4, 4, 0, 0]} isAnimationActive={!reduce} />
              <Bar dataKey="expense" name="Expense" fill="url(#recExpHatch)" stroke={INK.g500} radius={[4, 4, 0, 0]} isAnimationActive={!reduce} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Expense Breakdown" description="Active recurring expenses by category"
          empty={expensePie.length === 0} emptyHint="No expenses yet">
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={expensePie} cx="50%" cy="50%" innerRadius={44} outerRadius={74}
                dataKey="value" nameKey="name" paddingAngle={2} stroke="hsl(var(--background))" strokeWidth={2}
                isAnimationActive={!reduce} animationDuration={700}>
                {expensePie.map((_, i) => <Cell key={i} fill={MONO_RAMP[i % MONO_RAMP.length]} />)}
              </Pie>
              <Tooltip content={<MonoTooltip valuePrefix={`${base} `} />} />
              <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </MotionGrid>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>All Recurring</CardTitle>
              <CardDescription>
                {activeCount} active{recurring.length - activeCount > 0 ? ` · ${recurring.length - activeCount} paused` : ""} · showing {visible.length}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                <SelectTrigger className="h-9 w-[190px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount_desc">Amount: high → low</SelectItem>
                  <SelectItem value="amount_asc">Amount: low → high</SelectItem>
                  <SelectItem value="category">Category A → Z</SelectItem>
                  <SelectItem value="label">Label A → Z</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={openAdd}>
                <Plus className="w-4 h-4 mr-2" /> Add
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {visible.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Repeat className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>{recurring.length === 0
                ? "No recurring items yet. Add your salary, subscriptions and bills."
                : "No items match the current filters."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Label</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Day</th>
                    <th className="py-2 pr-3 text-right">Amount</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id} className={`border-b transition-colors hover:bg-muted/40 ${r.active ? "" : "opacity-55"}`}>
                      <td className="py-2.5 pr-3"><TypeBadge type={r.type} /></td>
                      <td className="py-2.5 pr-3 font-medium">
                        <div>{r.label}</div>
                        {r.notes && <div className="text-xs text-muted-foreground truncate max-w-[220px]">{r.notes}</div>}
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{categoryLabel(r.category)}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{r.day_of_month ?? "—"}</td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums font-semibold whitespace-nowrap">
                        {r.type === "income" ? "+" : "−"}<Money prefix={`${r.currency} `} value={r.amount} />
                      </td>
                      <td className="py-2.5 pr-3">
                        <button type="button" onClick={() => toggleActive(r)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs transition-colors",
                            r.active ? "bg-neutral-800 text-neutral-50" : "bg-muted text-muted-foreground border border-border hover:bg-muted/70",
                          )}
                          title={r.active ? "Click to pause" : "Click to activate"}>
                          {r.active ? "Active" : "Paused"}
                        </button>
                      </td>
                      <td className="py-2.5">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(r)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / edit dialog */}
      <Dialog open={form.open} onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.mode === "add" ? "Add Recurring Item" : "Edit Recurring Item"}</DialogTitle>
            <DialogDescription>A monthly income or expense / subscription.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Type *</label>
                <Select value={form.type}
                  onValueChange={(v) => {
                    const t = v as TransactionType;
                    const cats = t === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
                    setForm((f) => ({ ...f, type: t, category: cats[0].value }));
                  }}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {recCategories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Label *</label>
              <Input className="mt-1" placeholder="e.g. Netflix, Salary, Office rent"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="text-sm font-medium">Amount *</label>
                <Input className="mt-1" type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
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
              <div>
                <label className="text-sm font-medium">Rate → PHP</label>
                <Input className="mt-1" type="number" step="0.0001" placeholder="1"
                  disabled={form.currency === "PHP"}
                  value={form.fx_to_base}
                  onChange={(e) => setForm((f) => ({ ...f, fx_to_base: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="text-sm font-medium">Billing day (1–31)</label>
                <Input className="mt-1" type="number" min="1" max="31" placeholder="Optional"
                  value={form.day_of_month}
                  onChange={(e) => setForm((f) => ({ ...f, day_of_month: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={form.active}
                  onCheckedChange={(c) => setForm((f) => ({ ...f, active: c }))} />
                <span className="text-sm">{form.active ? "Active" : "Paused"}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea className="mt-1" rows={2} placeholder="Optional"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving}
              onClick={() => setForm((f) => ({ ...f, open: false }))}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {form.mode === "add" ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecurringItems;
