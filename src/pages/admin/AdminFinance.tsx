import { useState, useEffect, useCallback } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { confirm } from "@/components/ui/confirm-dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, DollarSign, Plus, Pencil, Trash2,
  Loader2, ChevronLeft, ChevronRight, Database, AlertCircle,
} from "lucide-react";
import {
  financeListTransactions, financeGetSummary, financeCreateTransaction,
  financeUpdateTransaction, financeDeleteTransaction, financeSeed,
  INCOME_CATEGORIES, EXPENSE_CATEGORIES, ALL_CATEGORIES, categoryLabel,
  type FinanceTransaction, type FinanceSummary, type TransactionType, type Priority,
} from "@/lib/financeApi";

const PAGE_SIZE = 15;

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  mid:  "bg-amber-100 text-amber-700",
  low:  "bg-slate-100 text-slate-600",
};

const PIE_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f97316","#eab308",
  "#22c55e","#14b8a6","#3b82f6","#ef4444","#84cc16",
];

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const shortMonth = (m: string) => {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1).toLocaleString("en", { month: "short", year: "2-digit" });
};

const defaultFrom = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 2);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

// ---- Dialog form type ----
interface TxForm {
  open: boolean;
  mode: "add" | "edit";
  id?: number;
  type: TransactionType;
  category: string;
  subcategory: string;
  amount: string;
  currency: string;
  transaction_date: string;
  description: string;
  priority: Priority;
  payment_method: string;
  tags: string;
}

const blankForm = (): TxForm => ({
  open: false, mode: "add",
  type: "income", category: "payroll", subcategory: "",
  amount: "", currency: "PHP",
  transaction_date: new Date().toISOString().slice(0, 10),
  description: "", priority: "mid", payment_method: "", tags: "",
});

// ---- Component ----
const AdminFinance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const email = user?.email ?? "";

  // Summary/charts state
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Table state
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [tableLoading, setTableLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate]   = useState(new Date().toISOString().slice(0, 10));
  const [filterType, setFilterType]         = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // Dialog
  const [form, setForm] = useState<TxForm>(blankForm());
  const [saving, setSaving] = useState(false);

  // Seed
  const [seeding, setSeeding] = useState(false);

  // ---- Fetch summary ----
  const fetchSummary = useCallback(() => {
    if (!email) return;
    setSummaryLoading(true);
    financeGetSummary({ requester_email: email, from_date: fromDate, to_date: toDate })
      .then(setSummary)
      .catch(() => toast({ title: "Failed to load summary", variant: "destructive" }))
      .finally(() => setSummaryLoading(false));
  }, [email, fromDate, toDate]);

  // ---- Fetch transactions ----
  const fetchTransactions = useCallback((p = 1) => {
    if (!email) return;
    setTableLoading(true);
    financeListTransactions({
      requester_email: email,
      page: p,
      per_page: PAGE_SIZE,
      type: filterType as TransactionType | "all",
      category: filterCategory === "all" ? undefined : filterCategory,
      priority: filterPriority as Priority | "all",
      from_date: fromDate,
      to_date: toDate,
    })
      .then((res) => {
        setTransactions(res.transactions);
        setTotal(res.total);
        setTotalPages(res.total_pages);
        setPage(p);
      })
      .catch(() => toast({ title: "Failed to load transactions", variant: "destructive" }))
      .finally(() => setTableLoading(false));
  }, [email, filterType, filterCategory, filterPriority, fromDate, toDate]);

  const refresh = useCallback(() => {
    fetchSummary();
    fetchTransactions(1);
  }, [fetchSummary, fetchTransactions]);

  useEffect(() => { refresh(); }, [refresh]);

  // ---- Seed ----
  const handleSeed = async (force = false) => {
    if (!(await confirm({
      title: force ? "Re-seed sample data?" : "Insert sample transactions?",
      description: force
        ? "Existing seed data will be cleared and replaced with a fresh sample set."
        : "A handful of sample transactions will be added so you can explore the dashboard.",
      confirmText: force ? "Clear & re-seed" : "Insert samples",
      tone: force ? "warning" : "default",
    }))) return;
    setSeeding(true);
    try {
      const res = await financeSeed({ requester_email: email, force });
      toast({ title: res.message });
      refresh();
    } catch (e) {
      toast({ title: "Seed failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  // ---- Open add/edit dialog ----
  const openAdd = () =>
    setForm({ ...blankForm(), open: true, mode: "add" });

  const openEdit = (tx: FinanceTransaction) =>
    setForm({
      open: true, mode: "edit", id: tx.id,
      type: tx.type, category: tx.category,
      subcategory: tx.subcategory ?? "",
      amount: String(tx.amount),
      currency: tx.currency,
      transaction_date: tx.transaction_date,
      description: tx.description ?? "",
      priority: tx.priority,
      payment_method: tx.payment_method ?? "",
      tags: tx.tags ?? "",
    });

  // ---- Save dialog ----
  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (!form.category || isNaN(amount) || amount < 0 || !form.transaction_date) {
      toast({ title: "Fill in all required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (form.mode === "add") {
        await financeCreateTransaction({
          requester_email: email,
          type: form.type,
          category: form.category,
          subcategory: form.subcategory || undefined,
          amount,
          currency: form.currency,
          transaction_date: form.transaction_date,
          description: form.description || undefined,
          priority: form.priority,
          payment_method: form.payment_method || undefined,
          tags: form.tags || undefined,
        });
        toast({ title: "Transaction added" });
      } else {
        await financeUpdateTransaction({
          requester_email: email,
          id: form.id!,
          type: form.type,
          category: form.category,
          subcategory: form.subcategory || undefined,
          amount,
          currency: form.currency,
          transaction_date: form.transaction_date,
          description: form.description || undefined,
          priority: form.priority,
          payment_method: form.payment_method || undefined,
          tags: form.tags || undefined,
        });
        toast({ title: "Transaction updated" });
      }
      setForm(blankForm());
      refresh();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ---- Delete ----
  const handleDelete = async (tx: FinanceTransaction) => {
    if (!(await confirm({
      title: `Delete "${tx.description ?? categoryLabel(tx.category)}"?`,
      description: "This transaction will be removed permanently.",
      confirmText: "Delete transaction",
      tone: "danger",
    }))) return;
    try {
      await financeDeleteTransaction({ requester_email: email, id: tx.id });
      toast({ title: "Deleted" });
      refresh();
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  };

  // ---- Available categories based on type ----
  const formCategories = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // ---- Category options for default priority auto-fill ----
  const handleFormTypeChange = (t: TransactionType) => {
    const cats = t === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    setForm((f) => ({ ...f, type: t, category: cats[0].value, priority: cats[0].priority }));
  };
  const handleFormCategoryChange = (cat: string) => {
    const meta = ALL_CATEGORIES.find((c) => c.value === cat);
    setForm((f) => ({ ...f, category: cat, priority: meta?.priority ?? f.priority }));
  };

  // ---- Pie data: expenses by category ----
  const expensePie = summary?.category_breakdown
    .filter((c) => c.type === "expense")
    .map((c) => ({ name: categoryLabel(c.category), value: c.total })) ?? [];

  const incomePie = summary?.category_breakdown
    .filter((c) => c.type === "income")
    .map((c) => ({ name: categoryLabel(c.category), value: c.total })) ?? [];

  const s = summary?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Finance Cash Flow</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Track income, expenses, subscriptions, payroll and equity over time.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
          <Button variant="outline" size="sm" onClick={() => handleSeed(false)} disabled={seeding}>
            {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
            Seed Data
          </Button>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Date + filters row */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-3 pt-5 md:flex md:flex-wrap">
          <div className="min-w-0">
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full md:w-40" />
          </div>
          <div className="min-w-0">
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full md:w-40" />
          </div>
          <div className="min-w-0 md:min-w-[130px]">
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 min-w-0 md:col-span-1 md:min-w-[160px]">
            <label className="text-xs text-muted-foreground">Category</label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {ALL_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {summaryLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Total Income
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">PHP {fmt(s?.total_income ?? 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">Selected period</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" /> Total Expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">PHP {fmt(s?.total_expense ?? 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">Selected period</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-600" /> Net Cash Flow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(s?.net_cash_flow ?? 0) >= 0 ? "text-blue-600" : "text-orange-500"}`}>
                PHP {fmt(s?.net_cash_flow ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Income − Expenses</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-violet-600" /> Running Equity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(s?.equity ?? 0) >= 0 ? "text-violet-600" : "text-orange-500"}`}>
                PHP {fmt(s?.equity ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">All-time cumulative</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {!summaryLoading && summary && (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Monthly Cash Flow Bar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Monthly Cash Flow</CardTitle>
              <CardDescription>Income vs Expenses (last 12 months)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={summary.monthly_trend} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `PHP ${fmt(v)}`} labelFormatter={shortMonth} />
                  <Legend />
                  <Bar dataKey="income"  name="Income"  fill="#10b981" radius={[3,3,0,0]} />
                  <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expense Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expense Breakdown</CardTitle>
              <CardDescription>By category for period</CardDescription>
            </CardHeader>
            <CardContent>
              {expensePie.length === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">No expense data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={expensePie} cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                      dataKey="value" nameKey="name" paddingAngle={2}>
                      {expensePie.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `PHP ${fmt(v)}`} />
                    <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Equity Curve */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Equity Curve</CardTitle>
              <CardDescription>Cumulative net cash flow over time</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.equity_curve.length === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={summary.equity_curve} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => `PHP ${fmt(v)}`} labelFormatter={shortMonth} />
                    <Area type="monotone" dataKey="equity" name="Equity"
                      stroke="#8b5cf6" fill="url(#equityGrad)" strokeWidth={2} dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Income Pie (secondary) */}
      {!summaryLoading && summary && incomePie.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Income Sources</CardTitle>
              <CardDescription>By category for period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={incomePie} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                    dataKey="value" nameKey="name" paddingAngle={2}>
                    {incomePie.map((_, i) => (
                      <Cell key={i} fill={["#10b981","#22d3ee","#6366f1","#f97316"][i % 4]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `PHP ${fmt(v)}`} />
                  <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transactions table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>{total} entries matching filters</CardDescription>
            </div>
            <Tabs value={filterPriority} onValueChange={setFilterPriority}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="high">🔴 High</TabsTrigger>
                <TabsTrigger value="mid">🟡 Mid</TabsTrigger>
                <TabsTrigger value="low">⚪ Low</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {tableLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No transactions found. Try seeding sample data or adjusting filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Category</th>
                      <th className="py-2 pr-3">Description</th>
                      <th className="py-2 pr-3">Priority</th>
                      <th className="py-2 pr-3 text-right">Amount</th>
                      <th className="py-2 pr-3">Method</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b hover:bg-muted/30">
                        <td className="py-2.5 pr-3 font-medium whitespace-nowrap">{tx.transaction_date}</td>
                        <td className="py-2.5 pr-3">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            tx.type === "income"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-600"
                          }`}>
                            {tx.type === "income" ? "▲ IN" : "▼ OUT"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <div>{categoryLabel(tx.category)}</div>
                          {tx.subcategory && (
                            <div className="text-xs text-muted-foreground">{tx.subcategory}</div>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-muted-foreground max-w-[220px] truncate">
                          {tx.description ?? "—"}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_COLORS[tx.priority]}`}>
                            {tx.priority}
                          </span>
                        </td>
                        <td className={`py-2.5 pr-3 text-right font-semibold whitespace-nowrap ${
                          tx.type === "income" ? "text-emerald-600" : "text-red-500"
                        }`}>
                          {tx.type === "income" ? "+" : "-"}{tx.currency} {fmt(tx.amount)}
                        </td>
                        <td className="py-2.5 pr-3 text-muted-foreground text-xs">{tx.payment_method ?? "—"}</td>
                        <td className="py-2.5">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tx)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {!tx.reference_type && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(tx)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} · {total} entries
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1}
                      onClick={() => fetchTransactions(page - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages}
                      onClick={() => fetchTransactions(page + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={form.open} onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.mode === "add" ? "Add Transaction" : "Edit Transaction"}</DialogTitle>
            <DialogDescription>
              {form.mode === "add" ? "Log a new income or expense entry." : "Update transaction details."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Type *</label>
                <Select value={form.type} onValueChange={(v) => handleFormTypeChange(v as TransactionType)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">▲ Income</SelectItem>
                    <SelectItem value="expense">▼ Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Priority *</label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as Priority }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">🔴 High</SelectItem>
                    <SelectItem value="mid">🟡 Mid</SelectItem>
                    <SelectItem value="low">⚪ Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Category + Subcategory */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Category *</label>
                <Select value={form.category} onValueChange={handleFormCategoryChange}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {formCategories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Sub-label</label>
                <Input className="mt-1" placeholder="e.g. ChatGPT Plus"
                  value={form.subcategory}
                  onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))} />
              </div>
            </div>

            {/* Amount + Currency */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium">Amount *</label>
                <Input className="mt-1" type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Currency</label>
                <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHP">PHP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="SGD">SGD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date + Method */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Date *</label>
                <Input className="mt-1" type="date" value={form.transaction_date}
                  onChange={(e) => setForm((f) => ({ ...f, transaction_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <Input className="mt-1" placeholder="gcash / bank_transfer…"
                  value={form.payment_method}
                  onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))} />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea className="mt-1" rows={2} placeholder="Optional notes"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm font-medium">Tags</label>
              <Input className="mt-1" placeholder="e.g. renewal, q2, client-abc"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={saving}
              onClick={() => setForm((f) => ({ ...f, open: false }))}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {form.mode === "add" ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFinance;
