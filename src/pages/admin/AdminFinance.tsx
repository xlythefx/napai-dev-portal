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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { confirm } from "@/components/ui/confirm-dialog";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Line, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, DollarSign, Plus, Pencil, Trash2,
  Loader2, ChevronLeft, ChevronRight, Database, AlertCircle,
  Landmark, Repeat, Timer, ArrowUpRight, ArrowDownRight, Eye, EyeOff,
  Target, CheckCircle2, Car, Bike, Home, Trophy, Plane, Gem, Rocket,
  Briefcase, GraduationCap, Smartphone, Gift, PiggyBank, Building2, Watch, Heart,
  Lock, ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import {
  financeListTransactions, financeGetSummary, financeCreateTransaction,
  financeUpdateTransaction, financeDeleteTransaction, financeSeed,
  financeGetOverview, financeListRecurring, financeSaveRecurring, financeDeleteRecurring,
  financeSaveAccount, financeDeleteAccount, financeSaveGoal, financeDeleteGoal,
  financeSaveAllocation, financeDeleteAllocation,
  INCOME_CATEGORIES, EXPENSE_CATEGORIES, ALL_CATEGORIES, categoryLabel,
  type FinanceTransaction, type FinanceSummary, type TransactionType, type Priority,
  type FinanceOverview, type FinanceAccount, type RecurringItem, type FinanceGoal,
  type FinanceAllocation,
} from "@/lib/financeApi";
import {
  INK, MONO_RAMP, shortMonth, kFmt, pctChange,
  MotionGrid, MotionItem, AnimatedNumber, Money, StatCard, ChartCard, MonoTooltip,
  SkeletonCard, SkeletonChart, HatchDef, MaskProvider, useMask,
} from "@/components/finance/financeUi";

const CURRENCIES = ["PHP", "USD", "EUR", "SGD"];

const PAGE_SIZE = 15;

// Monochrome priority chips (high = solid ink, mid = filled, low = outline)
const PRIORITY_CHIP: Record<string, string> = {
  high: "bg-neutral-800 text-neutral-50",
  mid:  "bg-muted text-foreground border border-border",
  low:  "bg-background text-muted-foreground border border-border",
};
const PRIORITY_DOT: Record<string, string> = {
  high: "bg-neutral-800",
  mid:  "bg-muted-foreground",
  low:  "bg-background border border-muted-foreground",
};

const defaultFrom = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 2);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const TypeBadge = ({ type }: { type: TransactionType }) => (
  <span className={cn(
    "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium",
    type === "income" ? "bg-neutral-800 text-neutral-50" : "bg-muted text-foreground border border-border",
  )}>
    {type === "income" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
    {type === "income" ? "IN" : "OUT"}
  </span>
);

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

// ============================================================
//  Accounts & Runway view
// ============================================================

interface AccountForm {
  open: boolean;
  mode: "add" | "edit";
  id?: number;
  name: string;
  balance: string;
  currency: string;
  fx_to_base: string;
  color: string;
}
const blankAccountForm = (): AccountForm => ({
  open: false, mode: "add",
  name: "", balance: "", currency: "PHP", fx_to_base: "1", color: "",
});

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

// ---- Financial goals (net-worth milestones) ----
const GOAL_ICONS: Record<string, LucideIcon> = {
  target: Target, trophy: Trophy, rocket: Rocket, piggy: PiggyBank,
  car: Car, bike: Bike, home: Home, building: Building2,
  plane: Plane, gem: Gem, watch: Watch, briefcase: Briefcase,
  graduation: GraduationCap, phone: Smartphone, gift: Gift, heart: Heart,
};
const GOAL_ICON_KEYS = Object.keys(GOAL_ICONS);
const goalIcon = (key: string): LucideIcon => GOAL_ICONS[key] ?? Target;

interface GoalForm {
  open: boolean;
  mode: "add" | "edit";
  id?: number;
  name: string;
  icon: string;
  target_amount: string;
  currency: string;
  fx_to_base: string;
  color: string;
  target_date: string;
  notes: string;
}
const blankGoalForm = (): GoalForm => ({
  open: false, mode: "add",
  name: "", icon: "target", target_amount: "", currency: "PHP",
  fx_to_base: "1", color: "", target_date: "", notes: "",
});

// ---- Capital allocations (reserved capital, deducted from total balance) ----
const ALLOC_ICONS: Record<string, LucideIcon> = {
  lock: Lock, vault: Landmark, piggy: PiggyBank, home: Home,
  building: Building2, car: Car, gem: Gem, briefcase: Briefcase,
  rocket: Rocket, gift: Gift, heart: Heart, target: Target,
};
const ALLOC_ICON_KEYS = Object.keys(ALLOC_ICONS);
const allocIcon = (key: string): LucideIcon => ALLOC_ICONS[key] ?? Lock;

interface AllocForm {
  open: boolean;
  mode: "add" | "edit";
  id?: number;
  name: string;
  icon: string;
  amount: string;
  currency: string;
  fx_to_base: string;
  color: string;
  notes: string;
}
const blankAllocForm = (): AllocForm => ({
  open: false, mode: "add",
  name: "", icon: "lock", amount: "", currency: "PHP",
  fx_to_base: "1", color: "", notes: "",
});

const AccountsRunway = ({ email }: { email: string }) => {
  const { toast } = useToast();
  const reduce = useReducedMotion();
  const masked = useMask();
  const yFmt = (v: number) => (masked ? "•" : kFmt(v));

  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [acctForm, setAcctForm] = useState<AccountForm>(blankAccountForm());
  const [recForm, setRecForm] = useState<RecurringForm>(blankRecurringForm());
  const [goalForm, setGoalForm] = useState<GoalForm>(blankGoalForm());
  const [allocForm, setAllocForm] = useState<AllocForm>(blankAllocForm());
  const [savingAcct, setSavingAcct] = useState(false);
  const [savingRec, setSavingRec] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [savingAlloc, setSavingAlloc] = useState(false);

  const fetchAll = useCallback(() => {
    if (!email) return;
    setLoading(true);
    Promise.all([
      financeGetOverview({ requester_email: email }),
      financeListRecurring({ requester_email: email }),
    ])
      .then(([ov, rec]) => {
        setOverview(ov);
        setRecurring(rec.recurring);
      })
      .catch((e) => toast({
        title: "Failed to load accounts",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      }))
      .finally(() => setLoading(false));
  }, [email]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ---- Account dialog ----
  const openAddAccount = () => setAcctForm({ ...blankAccountForm(), open: true, mode: "add" });
  const openEditAccount = (a: FinanceAccount) => setAcctForm({
    open: true, mode: "edit", id: a.id,
    name: a.name, balance: String(a.balance), currency: a.currency,
    fx_to_base: String(a.fx_to_base), color: a.color ?? "",
  });

  const saveAccount = async () => {
    const balance = parseFloat(acctForm.balance || "0");
    const fx = parseFloat(acctForm.fx_to_base || "1");
    if (!acctForm.name.trim() || isNaN(balance)) {
      toast({ title: "Name and a valid balance are required", variant: "destructive" });
      return;
    }
    setSavingAcct(true);
    try {
      await financeSaveAccount({
        requester_email: email,
        id: acctForm.mode === "edit" ? acctForm.id : undefined,
        name: acctForm.name.trim(),
        balance,
        currency: acctForm.currency,
        fx_to_base: isNaN(fx) || fx <= 0 ? 1 : fx,
        color: acctForm.color.trim() || null,
      });
      toast({ title: acctForm.mode === "add" ? "Account added" : "Account updated" });
      setAcctForm(blankAccountForm());
      fetchAll();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setSavingAcct(false);
    }
  };

  const deleteAccount = async (a: FinanceAccount) => {
    if (!(await confirm({
      title: `Delete "${a.name}"?`,
      description: "This bank account will be removed permanently.",
      confirmText: "Delete account",
      tone: "danger",
    }))) return;
    try {
      await financeDeleteAccount({ requester_email: email, id: a.id });
      toast({ title: "Deleted" });
      fetchAll();
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  };

  // ---- Recurring dialog ----
  const openAddRecurring = () => setRecForm({ ...blankRecurringForm(), open: true, mode: "add" });
  const openEditRecurring = (r: RecurringItem) => setRecForm({
    open: true, mode: "edit", id: r.id,
    type: r.type, label: r.label, category: r.category,
    amount: String(r.amount), currency: r.currency, fx_to_base: String(r.fx_to_base),
    day_of_month: r.day_of_month != null ? String(r.day_of_month) : "",
    active: r.active === 1, notes: r.notes ?? "",
  });

  const recCategories = recForm.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const saveRecurring = async () => {
    const amount = parseFloat(recForm.amount);
    const fx = parseFloat(recForm.fx_to_base || "1");
    if (!recForm.label.trim() || isNaN(amount) || amount < 0) {
      toast({ title: "Label and a valid amount are required", variant: "destructive" });
      return;
    }
    setSavingRec(true);
    try {
      await financeSaveRecurring({
        requester_email: email,
        id: recForm.mode === "edit" ? recForm.id : undefined,
        type: recForm.type,
        label: recForm.label.trim(),
        category: recForm.category,
        amount,
        currency: recForm.currency,
        fx_to_base: isNaN(fx) || fx <= 0 ? 1 : fx,
        day_of_month: recForm.day_of_month ? parseInt(recForm.day_of_month, 10) : null,
        active: recForm.active,
        notes: recForm.notes.trim() || null,
      });
      toast({ title: recForm.mode === "add" ? "Item added" : "Item updated" });
      setRecForm(blankRecurringForm());
      fetchAll();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setSavingRec(false);
    }
  };

  const deleteRecurring = async (r: RecurringItem) => {
    if (!(await confirm({
      title: `Delete "${r.label}"?`,
      description: "This recurring item will be removed permanently.",
      confirmText: "Delete item",
      tone: "danger",
    }))) return;
    try {
      await financeDeleteRecurring({ requester_email: email, id: r.id });
      toast({ title: "Deleted" });
      fetchAll();
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  };

  // ---- Goal dialog ----
  const openAddGoal = () => setGoalForm({ ...blankGoalForm(), open: true, mode: "add" });
  const openEditGoal = (g: FinanceGoal) => setGoalForm({
    open: true, mode: "edit", id: g.id,
    name: g.name, icon: g.icon || "target",
    target_amount: String(g.target_amount), currency: g.currency,
    fx_to_base: String(g.fx_to_base), color: g.color ?? "",
    target_date: g.target_date ?? "", notes: g.notes ?? "",
  });

  const saveGoal = async () => {
    const target = parseFloat(goalForm.target_amount);
    const fx = parseFloat(goalForm.fx_to_base || "1");
    if (!goalForm.name.trim() || isNaN(target) || target <= 0) {
      toast({ title: "Name and a target amount greater than 0 are required", variant: "destructive" });
      return;
    }
    setSavingGoal(true);
    try {
      await financeSaveGoal({
        requester_email: email,
        id: goalForm.mode === "edit" ? goalForm.id : undefined,
        name: goalForm.name.trim(),
        icon: goalForm.icon,
        target_amount: target,
        currency: goalForm.currency,
        fx_to_base: isNaN(fx) || fx <= 0 ? 1 : fx,
        color: goalForm.color.trim() || null,
        target_date: goalForm.target_date || null,
        notes: goalForm.notes.trim() || null,
      });
      toast({ title: goalForm.mode === "add" ? "Goal added" : "Goal updated" });
      setGoalForm(blankGoalForm());
      fetchAll();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setSavingGoal(false);
    }
  };

  const deleteGoal = async (g: FinanceGoal) => {
    if (!(await confirm({
      title: `Delete "${g.name}"?`,
      description: "This goal will be removed permanently.",
      confirmText: "Delete goal",
      tone: "danger",
    }))) return;
    try {
      await financeDeleteGoal({ requester_email: email, id: g.id });
      toast({ title: "Deleted" });
      fetchAll();
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  };

  // ---- Capital allocation dialog ----
  const openAddAlloc = () => setAllocForm({ ...blankAllocForm(), open: true, mode: "add" });
  const openEditAlloc = (a: FinanceAllocation) => setAllocForm({
    open: true, mode: "edit", id: a.id,
    name: a.name, icon: a.icon || "lock",
    amount: String(a.amount), currency: a.currency,
    fx_to_base: String(a.fx_to_base), color: a.color ?? "",
    notes: a.notes ?? "",
  });

  const saveAlloc = async () => {
    const amount = parseFloat(allocForm.amount);
    const fx = parseFloat(allocForm.fx_to_base || "1");
    if (!allocForm.name.trim() || isNaN(amount) || amount <= 0) {
      toast({ title: "Name and an amount greater than 0 are required", variant: "destructive" });
      return;
    }
    setSavingAlloc(true);
    try {
      await financeSaveAllocation({
        requester_email: email,
        id: allocForm.mode === "edit" ? allocForm.id : undefined,
        name: allocForm.name.trim(),
        icon: allocForm.icon,
        amount,
        currency: allocForm.currency,
        fx_to_base: isNaN(fx) || fx <= 0 ? 1 : fx,
        color: allocForm.color.trim() || null,
        notes: allocForm.notes.trim() || null,
      });
      toast({ title: allocForm.mode === "add" ? "Allocation added" : "Allocation updated" });
      setAllocForm(blankAllocForm());
      fetchAll();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setSavingAlloc(false);
    }
  };

  const deleteAlloc = async (a: FinanceAllocation) => {
    if (!(await confirm({
      title: `Delete "${a.name}"?`,
      description: "This allocation will be removed; the amount returns to your Spendable Balance.",
      confirmText: "Delete allocation",
      tone: "danger",
    }))) return;
    try {
      await financeDeleteAllocation({ requester_email: email, id: a.id });
      toast({ title: "Deleted" });
      fetchAll();
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonChart key={i} />)}
        </div>
      </div>
    );
  }

  const base = overview?.base_currency ?? "PHP";
  const accounts = overview?.accounts ?? [];
  const totalBalance = overview?.total_balance_base ?? 0;
  const goals = overview?.goals ?? [];
  const allocations = overview?.capital_allocations ?? [];
  const totalAllocation = overview?.total_allocation_base ?? 0;
  const spendable = overview?.spendable_balance_base ?? totalBalance;

  // Cash allocation ("hatian") — share of total balance per bank
  const allocation = accounts
    .map((a) => ({ name: a.name, value: a.balance_base ?? 0 }))
    .filter((a) => a.value > 0)
    .sort((a, b) => b.value - a.value);
  const bankBars = accounts.map((a) => ({ name: a.name, value: a.balance_base ?? 0 }));
  const incomeVsExpense = [{
    name: "Per month",
    income: overview?.monthly_income_base ?? 0,
    expense: overview?.monthly_expense_base ?? 0,
  }];
  const expensePie = (overview?.expense_breakdown ?? []).map((e) => ({
    name: categoryLabel(e.category), value: e.total_base,
  }));
  const byCurrency = (overview?.balances_by_currency ?? []).map((c) => ({ name: c.currency, value: c.total }));
  const net = overview?.net_monthly_base ?? 0;
  const runway = overview?.runway_months ?? null;

  // extra analytics
  const topShare = allocation.length && totalBalance > 0 ? (allocation[0].value / totalBalance) * 100 : 0;
  const numCurrencies = byCurrency.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">Accounts &amp; Runway</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Current bank balances, monthly income/expenses and how long the runway lasts.
            Combined totals are shown in {base}.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
          <Button variant="outline" size="sm" onClick={openAddAccount}>
            <Landmark className="w-4 h-4 mr-2" /> Add Bank
          </Button>
          <Button variant="outline" size="sm" onClick={openAddGoal}>
            <Target className="w-4 h-4 mr-2" /> Add Goal
          </Button>
          <Button variant="outline" size="sm" onClick={openAddAlloc}>
            <Lock className="w-4 h-4 mr-2" /> Add Allocation
          </Button>
          <Button size="sm" onClick={openAddRecurring}>
            <Repeat className="w-4 h-4 mr-2" /> Add Recurring
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <MotionGrid className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard accent icon={Wallet} label="Total Balance" prefix={`${base} `} value={totalBalance}
          sub={`${accounts.length} account${accounts.length === 1 ? "" : "s"}`} />
        <StatCard accent icon={ShieldCheck} label="Spendable Balance" prefix={`${base} `} value={spendable}
          sub={totalAllocation > 0
            ? <>After <Money prefix={`${base} `} value={totalAllocation} decimals={0} /> reserved</>
            : "Nothing reserved"} />
        <StatCard icon={TrendingUp} label="Monthly Income" prefix={`${base} `}
          value={overview?.monthly_income_base ?? 0} sub="Recurring" />
        <StatCard icon={TrendingDown} label="Monthly Expenses" prefix={`${base} `}
          value={overview?.monthly_expense_base ?? 0} sub="Recurring" />
        {net >= 0 ? (
          <StatCard icon={Timer} label="Net / Month" prefix={`+${base} `} value={net} sub="At or above breakeven" />
        ) : (
          <StatCard icon={Timer} label="Runway" decimals={0} value={runway ?? 0} suffix=" mo" money={false}
            sub={<>Burning <Money prefix={`${base} `} value={Math.abs(net)} />/mo</>} />
        )}
      </MotionGrid>

      {/* Secondary analytics strip */}
      <MotionGrid className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="Largest account share"><AnimatedNumber value={topShare} decimals={1} suffix="%" maskable={false} /></MiniStat>
        <MiniStat label="Currencies held"><AnimatedNumber value={numCurrencies} decimals={0} maskable={false} /></MiniStat>
        <MiniStat label="Net per month"><Money prefix={`${net >= 0 ? "+" : "−"}${base} `} value={Math.abs(net)} /></MiniStat>
        <MiniStat label="Runway">{runway != null ? `≈ ${runway} mo` : "∞ (growing)"}</MiniStat>
      </MotionGrid>

      {/* Financial goals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Financial Goals</CardTitle>
              <CardDescription>
                Milestones funded by your spendable balance · <span className="font-mono font-medium text-foreground"><Money prefix={`${base} `} value={spendable} /></span>
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openAddGoal}>
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Target className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No goals yet. Add a target like “My First Million” or “Civic FC”.</p>
            </div>
          ) : (
            <MotionGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {goals.map((g) => {
                const Icon = goalIcon(g.icon);
                const pct = g.progress_pct ?? 0;
                const accent = g.color || undefined;
                return (
                  <MotionItem key={g.id}>
                    <div className={cn(
                      "group relative rounded-lg border p-4 h-full transition-shadow hover:shadow-[var(--shadow-soft)]",
                      g.achieved ? "border-foreground/40 bg-muted/30" : "border-border",
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-foreground shrink-0"
                            style={accent ? { background: accent, color: "#fff" } : undefined}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold truncate flex items-center gap-1">
                              {g.name}
                              {g.achieved && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              Target <Money value={g.target_base ?? g.target_amount} prefix={`${base} `} decimals={0} />
                              {g.currency !== base && <> · {g.currency} <Money value={g.target_amount} decimals={0} /></>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditGoal(g)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteGoal(g)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-mono tabular-nums font-semibold text-foreground">{pct.toFixed(1)}%</span>
                          <span className="text-muted-foreground">
                            {g.achieved
                              ? "Reached"
                              : <>{base} <Money value={g.remaining_base ?? 0} decimals={0} /> to go</>}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-foreground transition-all"
                            style={{ width: `${Math.min(pct, 100)}%`, background: accent }} />
                        </div>
                        {g.target_date && (
                          <div className="mt-2 text-[11px] text-muted-foreground">Target date · {g.target_date}</div>
                        )}
                      </div>
                    </div>
                  </MotionItem>
                );
              })}
            </MotionGrid>
          )}
        </CardContent>
      </Card>

      {/* Capital allocation (reserved capital) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Capital Allocation</CardTitle>
              <CardDescription>
                Reserved capital deducted from your balance · <span className="font-mono font-medium text-foreground"><Money prefix={`${base} `} value={totalAllocation} /></span> of <Money prefix={`${base} `} value={totalBalance} decimals={0} />
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openAddAlloc}>
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {allocations.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Lock className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No allocations yet. Reserve capital like “Property Down-payment” or “Locked BTC”.</p>
            </div>
          ) : (
            <MotionGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allocations.map((a) => {
                const Icon = allocIcon(a.icon);
                const accent = a.color || undefined;
                const amtBase = a.amount_base ?? a.amount;
                const share = totalBalance > 0 ? Math.min(100, (amtBase / totalBalance) * 100) : 0;
                return (
                  <MotionItem key={a.id}>
                    <div className="group relative rounded-lg border border-border p-4 h-full transition-shadow hover:shadow-[var(--shadow-soft)]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-foreground shrink-0"
                            style={accent ? { background: accent, color: "#fff" } : undefined}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{a.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              Reserved <Money value={amtBase} prefix={`${base} `} decimals={0} />
                              {a.currency !== base && <> · {a.currency} <Money value={a.amount} decimals={0} /></>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditAlloc(a)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteAlloc(a)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-mono tabular-nums font-semibold text-foreground">{share.toFixed(1)}%</span>
                          <span className="text-muted-foreground">of total balance</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-foreground transition-all"
                            style={{ width: `${Math.min(share, 100)}%`, background: accent }} />
                        </div>
                        {a.notes && (
                          <div className="mt-2 text-[11px] text-muted-foreground truncate">{a.notes}</div>
                        )}
                      </div>
                    </div>
                  </MotionItem>
                );
              })}
            </MotionGrid>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <MotionGrid className="grid lg:grid-cols-2 gap-4">
        {/* Cash allocation donut — "hatian" */}
        <ChartCard title="Cash Allocation"
          description={<>Share of total balance per bank · <span className="font-mono font-medium text-foreground"><Money prefix={`${base} `} value={totalBalance} /></span></>}
          empty={allocation.length === 0} emptyHint="No balances yet">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={allocation} cx="50%" cy="50%" innerRadius={58} outerRadius={88}
                dataKey="value" nameKey="name" paddingAngle={2} stroke="hsl(var(--background))" strokeWidth={2}
                isAnimationActive={!reduce} animationDuration={700}>
                {allocation.map((_, i) => <Cell key={i} fill={MONO_RAMP[i % MONO_RAMP.length]} />)}
              </Pie>
              <Tooltip content={<MonoTooltip valuePrefix={`${base} `} />} />
              <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Balance per bank */}
        <ChartCard title="Balance per Bank" description={`Current balance (${base} equivalent)`}
          empty={bankBars.length === 0} emptyHint="No accounts yet">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bankBars} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={INK.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: INK.g500 }} axisLine={{ stroke: INK.g200 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: INK.g500 }} tickFormatter={yFmt} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: INK.g100 }} content={<MonoTooltip valuePrefix={`${base} `} />} />
              <Bar dataKey="value" name="Balance" radius={[4, 4, 0, 0]} isAnimationActive={!reduce}>
                {bankBars.map((_, i) => <Cell key={i} fill={MONO_RAMP[i % MONO_RAMP.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </MotionGrid>

      {/* Runway projection + currency split */}
      <MotionGrid className="grid lg:grid-cols-3 gap-4">
        <ChartCard className="lg:col-span-2" title="Runway Projection"
          description={
            <>Projected total balance at the current net monthly rate
              {net >= 0 ? " (growing — no burn)" : runway != null ? ` (≈ ${runway} months to zero)` : ""}</>
          }
          empty={(overview?.runway_projection ?? []).length === 0}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={overview?.runway_projection ?? []} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="runwayGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={INK.fg} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={INK.fg} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={INK.grid} vertical={false} />
              <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fontSize: 11, fill: INK.g500 }} axisLine={{ stroke: INK.g200 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: INK.g500 }} tickFormatter={yFmt} axisLine={false} tickLine={false} />
              <Tooltip content={<MonoTooltip valuePrefix={`${base} `} labelFormatter={shortMonth} />} />
              <Area type="monotone" dataKey="balance" name="Balance" stroke={INK.fg}
                strokeDasharray={net >= 0 ? undefined : "5 4"} fill="url(#runwayGrad)" strokeWidth={2}
                dot={{ r: 2, fill: INK.fg }} isAnimationActive={!reduce} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Balance by Currency" description="Raw totals per currency"
          empty={byCurrency.length === 0}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart layout="vertical" data={byCurrency} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={INK.grid} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: INK.g500 }} tickFormatter={yFmt} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: INK.g500 }} axisLine={false} tickLine={false} width={42} />
              <Tooltip cursor={{ fill: INK.g100 }} content={<MonoTooltip valuePrefix="" />} />
              <Bar dataKey="value" name="Balance" radius={[0, 4, 4, 0]} isAnimationActive={!reduce}>
                {byCurrency.map((_, i) => <Cell key={i} fill={MONO_RAMP[i % MONO_RAMP.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </MotionGrid>

      {/* Income vs expenses + expense breakdown */}
      <MotionGrid className="grid lg:grid-cols-2 gap-4">
        {/* Income vs Expenses */}
        <ChartCard title="Income vs Expenses" description={`Recurring, per month (${base})`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={incomeVsExpense} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <HatchDef id="acctExpHatch" />
              <CartesianGrid strokeDasharray="3 3" stroke={INK.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: INK.g500 }} axisLine={{ stroke: INK.g200 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: INK.g500 }} tickFormatter={yFmt} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: INK.g100 }} content={<MonoTooltip valuePrefix={`${base} `} />} />
              <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
              <Bar dataKey="income" name="Income" fill={INK.fg} radius={[4, 4, 0, 0]} isAnimationActive={!reduce} />
              <Bar dataKey="expense" name="Expense" fill="url(#acctExpHatch)" stroke={INK.g500}
                radius={[4, 4, 0, 0]} isAnimationActive={!reduce} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Expense breakdown */}
        <ChartCard title="Expense Breakdown" description="Recurring expenses by category"
          empty={expensePie.length === 0} emptyHint="No expenses yet">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={expensePie} cx="50%" cy="50%" innerRadius={50} outerRadius={85}
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

      {/* Manage accounts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bank Accounts</CardTitle>
              <CardDescription>Your balances, each in its own currency</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openAddAccount}>
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
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
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a, i) => {
                    const share = totalBalance > 0 ? ((a.balance_base ?? 0) / totalBalance) * 100 : 0;
                    return (
                      <tr key={a.id} className="border-b transition-colors hover:bg-muted/40">
                        <td className="py-2.5 pr-3 font-medium">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: MONO_RAMP[i % MONO_RAMP.length] }} />
                            {a.name}
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
                        <td className="py-2.5">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditAccount(a)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteAccount(a)}>
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

      {/* Manage recurring */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recurring Items</CardTitle>
              <CardDescription>Monthly income & expenses / subscriptions</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openAddRecurring}>
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recurring.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Repeat className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No recurring items yet. Add your salary, subscriptions and bills.</p>
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
                  {recurring.map((r) => (
                    <tr key={r.id} className={`border-b transition-colors hover:bg-muted/40 ${r.active ? "" : "opacity-50"}`}>
                      <td className="py-2.5 pr-3"><TypeBadge type={r.type} /></td>
                      <td className="py-2.5 pr-3 font-medium">{r.label}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{categoryLabel(r.category)}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{r.day_of_month ?? "—"}</td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums font-semibold whitespace-nowrap">
                        {r.type === "income" ? "+" : "−"}<Money prefix={`${r.currency} `} value={r.amount} />
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground">{r.active ? "Active" : "Paused"}</td>
                      <td className="py-2.5">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditRecurring(r)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRecurring(r)}>
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

      {/* Account dialog */}
      <Dialog open={acctForm.open} onOpenChange={(o) => setAcctForm((f) => ({ ...f, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{acctForm.mode === "add" ? "Add Bank Account" : "Edit Bank Account"}</DialogTitle>
            <DialogDescription>Track a bank or wallet balance.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Bank / Account name *</label>
              <Input className="mt-1" placeholder="e.g. BPI Savings, GCash"
                value={acctForm.name}
                onChange={(e) => setAcctForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Balance *</label>
                <Input className="mt-1" type="number" step="0.01" placeholder="0.00"
                  value={acctForm.balance}
                  onChange={(e) => setAcctForm((f) => ({ ...f, balance: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Currency</label>
                <Select value={acctForm.currency}
                  onValueChange={(v) => setAcctForm((f) => ({ ...f, currency: v, fx_to_base: v === "PHP" ? "1" : f.fx_to_base }))}>
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
                  disabled={acctForm.currency === "PHP"}
                  value={acctForm.fx_to_base}
                  onChange={(e) => setAcctForm((f) => ({ ...f, fx_to_base: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Marker</label>
                <Input className="mt-1" type="color"
                  value={acctForm.color || "#0a0a0a"}
                  onChange={(e) => setAcctForm((f) => ({ ...f, color: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={savingAcct}
              onClick={() => setAcctForm((f) => ({ ...f, open: false }))}>Cancel</Button>
            <Button onClick={saveAccount} disabled={savingAcct}>
              {savingAcct && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {acctForm.mode === "add" ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recurring dialog */}
      <Dialog open={recForm.open} onOpenChange={(o) => setRecForm((f) => ({ ...f, open: o }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{recForm.mode === "add" ? "Add Recurring Item" : "Edit Recurring Item"}</DialogTitle>
            <DialogDescription>A monthly income or expense / subscription.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Type *</label>
                <Select value={recForm.type}
                  onValueChange={(v) => {
                    const t = v as TransactionType;
                    const cats = t === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
                    setRecForm((f) => ({ ...f, type: t, category: cats[0].value }));
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
                <Select value={recForm.category} onValueChange={(v) => setRecForm((f) => ({ ...f, category: v }))}>
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
                value={recForm.label}
                onChange={(e) => setRecForm((f) => ({ ...f, label: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="text-sm font-medium">Amount *</label>
                <Input className="mt-1" type="number" step="0.01" min="0" placeholder="0.00"
                  value={recForm.amount}
                  onChange={(e) => setRecForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Currency</label>
                <Select value={recForm.currency}
                  onValueChange={(v) => setRecForm((f) => ({ ...f, currency: v, fx_to_base: v === "PHP" ? "1" : f.fx_to_base }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Rate → PHP</label>
                <Input className="mt-1" type="number" step="0.0001" placeholder="1"
                  disabled={recForm.currency === "PHP"}
                  value={recForm.fx_to_base}
                  onChange={(e) => setRecForm((f) => ({ ...f, fx_to_base: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="text-sm font-medium">Billing day (1–31)</label>
                <Input className="mt-1" type="number" min="1" max="31" placeholder="Optional"
                  value={recForm.day_of_month}
                  onChange={(e) => setRecForm((f) => ({ ...f, day_of_month: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={recForm.active}
                  onCheckedChange={(c) => setRecForm((f) => ({ ...f, active: c }))} />
                <span className="text-sm">{recForm.active ? "Active" : "Paused"}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea className="mt-1" rows={2} placeholder="Optional"
                value={recForm.notes}
                onChange={(e) => setRecForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={savingRec}
              onClick={() => setRecForm((f) => ({ ...f, open: false }))}>Cancel</Button>
            <Button onClick={saveRecurring} disabled={savingRec}>
              {savingRec && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {recForm.mode === "add" ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goal dialog */}
      <Dialog open={goalForm.open} onOpenChange={(o) => setGoalForm((f) => ({ ...f, open: o }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{goalForm.mode === "add" ? "Add Financial Goal" : "Edit Financial Goal"}</DialogTitle>
            <DialogDescription>
              A milestone funded by your total balance — e.g. “My First Million” or a “Civic FC”.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Goal name *</label>
              <Input className="mt-1" placeholder="e.g. My First Million, Civic FC, Yamaha NMAX"
                value={goalForm.name}
                onChange={(e) => setGoalForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Icon</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {GOAL_ICON_KEYS.map((key) => {
                  const Ic = GOAL_ICONS[key];
                  const active = goalForm.icon === key;
                  return (
                    <button key={key} type="button"
                      onClick={() => setGoalForm((f) => ({ ...f, icon: key }))}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-md border transition-colors",
                        active ? "border-foreground bg-foreground text-background"
                               : "border-border text-muted-foreground hover:bg-muted",
                      )}>
                      <Ic className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="text-sm font-medium">Target *</label>
                <Input className="mt-1" type="number" step="0.01" min="0" placeholder="0.00"
                  value={goalForm.target_amount}
                  onChange={(e) => setGoalForm((f) => ({ ...f, target_amount: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Currency</label>
                <Select value={goalForm.currency}
                  onValueChange={(v) => setGoalForm((f) => ({ ...f, currency: v, fx_to_base: v === "PHP" ? "1" : f.fx_to_base }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Rate → PHP</label>
                <Input className="mt-1" type="number" step="0.0001" placeholder="1"
                  disabled={goalForm.currency === "PHP"}
                  value={goalForm.fx_to_base}
                  onChange={(e) => setGoalForm((f) => ({ ...f, fx_to_base: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Target date</label>
                <Input className="mt-1" type="date"
                  value={goalForm.target_date}
                  onChange={(e) => setGoalForm((f) => ({ ...f, target_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Marker</label>
                <Input className="mt-1" type="color"
                  value={goalForm.color || "#2b2b2b"}
                  onChange={(e) => setGoalForm((f) => ({ ...f, color: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea className="mt-1" rows={2} placeholder="Optional"
                value={goalForm.notes}
                onChange={(e) => setGoalForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={savingGoal}
              onClick={() => setGoalForm((f) => ({ ...f, open: false }))}>Cancel</Button>
            <Button onClick={saveGoal} disabled={savingGoal}>
              {savingGoal && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {goalForm.mode === "add" ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Capital allocation dialog */}
      <Dialog open={allocForm.open} onOpenChange={(o) => setAllocForm((f) => ({ ...f, open: o }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{allocForm.mode === "add" ? "Add Capital Allocation" : "Edit Capital Allocation"}</DialogTitle>
            <DialogDescription>
              Reserved capital deducted from your total balance to compute the Spendable Balance — e.g. “Property Down-payment” or “Locked BTC”.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Allocation name *</label>
              <Input className="mt-1" placeholder="e.g. Property Down-payment, Locked BTC, Emergency Fund"
                value={allocForm.name}
                onChange={(e) => setAllocForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Icon</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {ALLOC_ICON_KEYS.map((key) => {
                  const Ic = ALLOC_ICONS[key];
                  const active = allocForm.icon === key;
                  return (
                    <button key={key} type="button"
                      onClick={() => setAllocForm((f) => ({ ...f, icon: key }))}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-md border transition-colors",
                        active ? "border-foreground bg-foreground text-background"
                               : "border-border text-muted-foreground hover:bg-muted",
                      )}>
                      <Ic className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="text-sm font-medium">Amount *</label>
                <Input className="mt-1" type="number" step="0.01" min="0" placeholder="0.00"
                  value={allocForm.amount}
                  onChange={(e) => setAllocForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Currency</label>
                <Select value={allocForm.currency}
                  onValueChange={(v) => setAllocForm((f) => ({ ...f, currency: v, fx_to_base: v === "PHP" ? "1" : f.fx_to_base }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Rate → PHP</label>
                <Input className="mt-1" type="number" step="0.0001" placeholder="1"
                  disabled={allocForm.currency === "PHP"}
                  value={allocForm.fx_to_base}
                  onChange={(e) => setAllocForm((f) => ({ ...f, fx_to_base: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Marker</label>
                <Input className="mt-1" type="color"
                  value={allocForm.color || "#2b2b2b"}
                  onChange={(e) => setAllocForm((f) => ({ ...f, color: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea className="mt-1" rows={2} placeholder="Optional"
                value={allocForm.notes}
                onChange={(e) => setAllocForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={savingAlloc}
              onClick={() => setAllocForm((f) => ({ ...f, open: false }))}>Cancel</Button>
            <Button onClick={saveAlloc} disabled={savingAlloc}>
              {savingAlloc && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {allocForm.mode === "add" ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================================================
//  Cash Flow view
// ============================================================

const CashFlow = ({ email }: { email: string }) => {
  const { toast } = useToast();
  const reduce = useReducedMotion();
  const masked = useMask();
  const yFmt = (v: number) => (masked ? "•" : kFmt(v));

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

  const s = summary?.summary;

  // ---- Derived analytics (client-side, from existing summary) ----
  const trend = [...(summary?.monthly_trend ?? [])].sort((a, b) => a.month.localeCompare(b.month));
  const lastT = trend[trend.length - 1];
  const prevT = trend[trend.length - 2];
  const incomeDelta = prevT ? { pct: pctChange(prevT.income, lastT.income), label: "vs last month" } : undefined;
  const expenseDelta = prevT ? { pct: pctChange(prevT.expense, lastT.expense), invert: true, label: "vs last month" } : undefined;

  const savingsRate = s && s.total_income > 0 ? (s.net_cash_flow / s.total_income) * 100 : 0;
  const avgNet = trend.length ? trend.reduce((x, t) => x + t.net, 0) / trend.length : 0;
  const monthsTracked = trend.length;

  // cumulative income vs expense
  let ci = 0, ce = 0;
  const cumulative = trend.map((t) => { ci += t.income; ce += t.expense; return { month: t.month, income: ci, expense: ce }; });

  // top expense categories
  const topExpenseCats = (summary?.category_breakdown ?? [])
    .filter((c) => c.type === "expense")
    .map((c) => ({ name: categoryLabel(c.category), value: c.total }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const biggestExpense = topExpenseCats[0];

  const expensePie = summary?.category_breakdown
    .filter((c) => c.type === "expense")
    .map((c) => ({ name: categoryLabel(c.category), value: c.total })) ?? [];
  const incomePie = summary?.category_breakdown
    .filter((c) => c.type === "income")
    .map((c) => ({ name: categoryLabel(c.category), value: c.total })) ?? [];

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">Finance Cash Flow</h1>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <MotionGrid className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard accent icon={TrendingUp} label="Total Income" prefix="PHP " value={s?.total_income ?? 0}
            delta={incomeDelta} sub="Selected period" />
          <StatCard icon={TrendingDown} label="Total Expenses" prefix="PHP " value={s?.total_expense ?? 0}
            delta={expenseDelta} sub="Selected period" />
          <StatCard icon={Wallet} label="Net Cash Flow" prefix="PHP " value={s?.net_cash_flow ?? 0} sub="Income − Expenses" />
          <StatCard icon={DollarSign} label="Running Equity" prefix="PHP " value={s?.equity ?? 0} sub="All-time cumulative" />
        </MotionGrid>
      )}

      {/* Secondary analytics strip */}
      {!summaryLoading && summary && (
        <MotionGrid className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MiniStat label="Savings rate"><AnimatedNumber value={savingsRate} decimals={1} suffix="%" maskable={false} /></MiniStat>
          <MiniStat label="Avg net / month"><Money prefix={`${avgNet >= 0 ? "+" : "−"}PHP `} value={Math.abs(avgNet)} /></MiniStat>
          <MiniStat label="Months tracked"><AnimatedNumber value={monthsTracked} decimals={0} maskable={false} /></MiniStat>
          <MiniStat label="Biggest expense">{biggestExpense ? biggestExpense.name : "—"}</MiniStat>
        </MotionGrid>
      )}

      {/* Charts */}
      {!summaryLoading && summary && (
        <MotionGrid className="grid lg:grid-cols-3 gap-4">
          {/* Monthly Cash Flow — composed (bars + net line) */}
          <ChartCard className="lg:col-span-1" title="Monthly Cash Flow" description="Income, expense & net (last 12 months)">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={trend} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <HatchDef id="cfExpHatch" />
                <CartesianGrid strokeDasharray="3 3" stroke={INK.grid} vertical={false} />
                <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fontSize: 11, fill: INK.g500 }} axisLine={{ stroke: INK.g200 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: INK.g500 }} tickFormatter={yFmt} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: INK.g100 }} content={<MonoTooltip labelFormatter={shortMonth} />} />
                <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                <Bar dataKey="income" name="Income" fill={INK.fg} radius={[3, 3, 0, 0]} isAnimationActive={!reduce} />
                <Bar dataKey="expense" name="Expense" fill="url(#cfExpHatch)" stroke={INK.g500} radius={[3, 3, 0, 0]} isAnimationActive={!reduce} />
                <Line type="monotone" dataKey="net" name="Net" stroke={INK.g600} strokeWidth={2} dot={{ r: 2, fill: INK.g600 }} isAnimationActive={!reduce} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Expense Pie */}
          <ChartCard title="Expense Breakdown" description="By category for period"
            empty={expensePie.length === 0} emptyHint="No expense data">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expensePie} cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                  dataKey="value" nameKey="name" paddingAngle={2} stroke="hsl(var(--background))" strokeWidth={2}
                  isAnimationActive={!reduce} animationDuration={700}>
                  {expensePie.map((_, i) => <Cell key={i} fill={MONO_RAMP[i % MONO_RAMP.length]} />)}
                </Pie>
                <Tooltip content={<MonoTooltip />} />
                <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Equity Curve */}
          <ChartCard title="Equity Curve" description="Cumulative net cash flow over time"
            empty={summary.equity_curve.length === 0}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={summary.equity_curve} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={INK.fg} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={INK.fg} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={INK.grid} vertical={false} />
                <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fontSize: 11, fill: INK.g500 }} axisLine={{ stroke: INK.g200 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: INK.g500 }} tickFormatter={yFmt} axisLine={false} tickLine={false} />
                <Tooltip content={<MonoTooltip labelFormatter={shortMonth} />} />
                <Area type="monotone" dataKey="equity" name="Equity" stroke={INK.fg}
                  fill="url(#equityGrad)" strokeWidth={2} dot={{ r: 2, fill: INK.fg }} isAnimationActive={!reduce} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </MotionGrid>
      )}

      {/* Cumulative + Top categories + Income sources */}
      {!summaryLoading && summary && (
        <MotionGrid className="grid lg:grid-cols-3 gap-4">
          {/* Cumulative income vs expense */}
          <ChartCard title="Cumulative Cash Flow" description="Running income vs expense"
            empty={cumulative.length === 0}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={cumulative} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="cumIncGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={INK.fg} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={INK.fg} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={INK.grid} vertical={false} />
                <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fontSize: 11, fill: INK.g500 }} axisLine={{ stroke: INK.g200 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: INK.g500 }} tickFormatter={yFmt} axisLine={false} tickLine={false} />
                <Tooltip content={<MonoTooltip labelFormatter={shortMonth} />} />
                <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                <Area type="monotone" dataKey="income" name="Income" stroke={INK.fg} fill="url(#cumIncGrad)" strokeWidth={2} dot={false} isAnimationActive={!reduce} />
                <Area type="monotone" dataKey="expense" name="Expense" stroke={INK.g400} fill="transparent" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={!reduce} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Top expense categories */}
          <ChartCard title="Top Expense Categories" description="Ranked by spend for period"
            empty={topExpenseCats.length === 0} emptyHint="No expense data">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart layout="vertical" data={topExpenseCats} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={INK.grid} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: INK.g500 }} tickFormatter={yFmt} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: INK.g500 }} axisLine={false} tickLine={false} width={96} />
                <Tooltip cursor={{ fill: INK.g100 }} content={<MonoTooltip />} />
                <Bar dataKey="value" name="Spend" radius={[0, 4, 4, 0]} isAnimationActive={!reduce}>
                  {topExpenseCats.map((_, i) => <Cell key={i} fill={MONO_RAMP[i % MONO_RAMP.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Income sources */}
          <ChartCard title="Income Sources" description="By category for period"
            empty={incomePie.length === 0} emptyHint="No income data">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={incomePie} cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                  dataKey="value" nameKey="name" paddingAngle={2} stroke="hsl(var(--background))" strokeWidth={2}
                  isAnimationActive={!reduce} animationDuration={700}>
                  {incomePie.map((_, i) => <Cell key={i} fill={MONO_RAMP[i % MONO_RAMP.length]} />)}
                </Pie>
                <Tooltip content={<MonoTooltip />} />
                <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </MotionGrid>
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
                <TabsTrigger value="high"><span className={cn("w-2 h-2 rounded-full mr-1.5 inline-block", PRIORITY_DOT.high)} />High</TabsTrigger>
                <TabsTrigger value="mid"><span className={cn("w-2 h-2 rounded-full mr-1.5 inline-block", PRIORITY_DOT.mid)} />Mid</TabsTrigger>
                <TabsTrigger value="low"><span className={cn("w-2 h-2 rounded-full mr-1.5 inline-block", PRIORITY_DOT.low)} />Low</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {tableLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted animate-pulse" />
              ))}
            </div>
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
                      <tr key={tx.id} className="border-b transition-colors hover:bg-muted/40">
                        <td className="py-2.5 pr-3 font-mono tabular-nums whitespace-nowrap">{tx.transaction_date}</td>
                        <td className="py-2.5 pr-3"><TypeBadge type={tx.type} /></td>
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
                          <span className={cn("text-xs px-2 py-0.5 rounded", PRIORITY_CHIP[tx.priority])}>
                            {tx.priority}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums font-semibold whitespace-nowrap">
                          <span className="inline-flex items-center justify-end gap-1">
                            {tx.type === "income"
                              ? <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
                              : <ArrowDownRight className="w-3.5 h-3.5 text-muted-foreground" />}
                            {tx.type === "income" ? "+" : "−"}<Money prefix={`${tx.currency} `} value={tx.amount} />
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-muted-foreground text-xs">{tx.payment_method ?? "—"}</td>
                        <td className="py-2.5">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tx)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {!tx.reference_type && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(tx)}>
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
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Priority *</label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as Priority }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="mid">Mid</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
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
    </>
  );
};

// ============================================================
//  Page shell
// ============================================================

const MASK_KEY = "napai.finance.hideBalances";

const AdminFinance = () => {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const reduce = useReducedMotion();

  const [view, setView] = useState<"cashflow" | "accounts">("cashflow");
  const [masked, setMasked] = useState<boolean>(() => {
    try { return localStorage.getItem(MASK_KEY) === "1"; } catch { return false; }
  });

  const toggleMask = () =>
    setMasked((m) => {
      const next = !m;
      try { localStorage.setItem(MASK_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });

  return (
    <MaskProvider value={masked}>
      <div className="space-y-6">
        {/* View switcher + privacy toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={view} onValueChange={(v) => setView(v as "cashflow" | "accounts")}>
            <TabsList>
              <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
              <TabsTrigger value="accounts">Accounts &amp; Runway</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={toggleMask}
            aria-pressed={masked} title={masked ? "Show balances" : "Hide balances"}>
            {masked ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {masked ? "Show Balances" : "Hide Balances"}
          </Button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-6"
          >
            {view === "accounts" ? <AccountsRunway email={email} /> : <CashFlow email={email} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </MaskProvider>
  );
};

export default AdminFinance;
