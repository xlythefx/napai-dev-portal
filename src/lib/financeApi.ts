import { API_BASE } from "./api";

const BASE = `${API_BASE}/controllers/finance`;

export type TransactionType = "income" | "expense";
export type Priority = "high" | "mid" | "low";

export interface FinanceTransaction {
  id: number;
  type: TransactionType;
  category: string;
  subcategory: string | null;
  amount: number;
  currency: string;
  transaction_date: string;
  description: string | null;
  priority: Priority;
  payment_method: string | null;
  reference_id: number | null;
  reference_type: string | null;
  tags: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceSummary {
  summary: {
    total_income: number;
    total_expense: number;
    net_cash_flow: number;
    equity: number;
  };
  monthly_trend: Array<{
    month: string;
    income: number;
    expense: number;
    net: number;
  }>;
  category_breakdown: Array<{
    type: TransactionType;
    category: string;
    total: number;
  }>;
  equity_curve: Array<{
    month: string;
    equity: number;
  }>;
}

export interface ListTransactionsParams {
  requester_email: string;
  page?: number;
  per_page?: number;
  type?: TransactionType | "all";
  category?: string;
  priority?: Priority | "all";
  from_date?: string;
  to_date?: string;
}

export interface ListTransactionsResult {
  transactions: FinanceTransaction[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

async function post<T>(url: string, body: object): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

export async function financeListTransactions(
  params: ListTransactionsParams
): Promise<ListTransactionsResult> {
  const clean: Record<string, unknown> = { ...params };
  if (clean.type === "all") delete clean.type;
  if (clean.priority === "all") delete clean.priority;
  if (clean.category === "all") delete clean.category;
  return post(`${BASE}/list.php`, clean);
}

export async function financeGetSummary(params: {
  requester_email: string;
  from_date?: string;
  to_date?: string;
}): Promise<FinanceSummary> {
  return post(`${BASE}/summary.php`, params);
}

export async function financeCreateTransaction(params: {
  requester_email: string;
  type: TransactionType;
  category: string;
  subcategory?: string;
  amount: number;
  currency?: string;
  transaction_date: string;
  description?: string;
  priority?: Priority;
  payment_method?: string;
  tags?: string;
}): Promise<{ success: boolean; transaction: FinanceTransaction }> {
  return post(`${BASE}/create.php`, params);
}

export async function financeUpdateTransaction(params: {
  requester_email: string;
  id: number;
  type?: TransactionType;
  category?: string;
  subcategory?: string;
  amount?: number;
  currency?: string;
  transaction_date?: string;
  description?: string;
  priority?: Priority;
  payment_method?: string;
  tags?: string;
}): Promise<{ success: boolean; transaction: FinanceTransaction }> {
  return post(`${BASE}/update.php`, params);
}

export async function financeDeleteTransaction(params: {
  requester_email: string;
  id: number;
}): Promise<{ success: boolean }> {
  return post(`${BASE}/delete.php`, params);
}

export async function financeSeed(params: {
  requester_email: string;
  force?: boolean;
}): Promise<{ success: boolean; inserted: number; message: string }> {
  return post(`${BASE}/seed.php`, params);
}

// ---- Accounts (bank/wallet balances) ----

export interface FinanceAccount {
  id: number;
  name: string;
  balance: number;
  currency: string;
  fx_to_base: number; // rate from `currency` -> base PHP
  color: string | null;
  sort_order: number;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
  balance_base?: number; // present in overview response
}

export async function financeListAccounts(params: {
  requester_email: string;
}): Promise<{ accounts: FinanceAccount[] }> {
  return post(`${BASE}/accounts/list.php`, params);
}

export async function financeSaveAccount(params: {
  requester_email: string;
  id?: number;
  name: string;
  balance?: number;
  currency?: string;
  fx_to_base?: number;
  color?: string | null;
  sort_order?: number;
}): Promise<{ success: boolean; account: FinanceAccount }> {
  return post(`${BASE}/accounts/save.php`, params);
}

export async function financeDeleteAccount(params: {
  requester_email: string;
  id: number;
}): Promise<{ success: boolean }> {
  return post(`${BASE}/accounts/delete.php`, params);
}

// ---- Recurring monthly income/expense items ----

export interface RecurringItem {
  id: number;
  type: TransactionType;
  label: string;
  category: string;
  amount: number;
  currency: string;
  fx_to_base: number;
  day_of_month: number | null;
  active: number; // 0 | 1
  notes: string | null;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

export async function financeListRecurring(params: {
  requester_email: string;
  type?: TransactionType;
  active?: boolean;
}): Promise<{ recurring: RecurringItem[] }> {
  return post(`${BASE}/recurring/list.php`, params);
}

export async function financeSaveRecurring(params: {
  requester_email: string;
  id?: number;
  type: TransactionType;
  label: string;
  category?: string;
  amount: number;
  currency?: string;
  fx_to_base?: number;
  day_of_month?: number | null;
  active?: boolean;
  notes?: string | null;
}): Promise<{ success: boolean; item: RecurringItem }> {
  return post(`${BASE}/recurring/save.php`, params);
}

export async function financeDeleteRecurring(params: {
  requester_email: string;
  id: number;
}): Promise<{ success: boolean }> {
  return post(`${BASE}/recurring/delete.php`, params);
}

// ---- Financial goals (net-worth milestones / savings targets) ----

export interface FinanceGoal {
  id: number;
  name: string;
  icon: string;            // lucide icon key (car, bike, home, trophy…)
  target_amount: number;
  currency: string;
  fx_to_base: number;      // rate from `currency` -> base PHP
  color: string | null;
  target_date: string | null;
  notes: string | null;
  sort_order: number;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
  // present in overview response (computed against total balance)
  target_base?: number;
  progress_pct?: number;   // 0–100, capped
  remaining_base?: number;
  achieved?: boolean;
}

export async function financeListGoals(params: {
  requester_email: string;
}): Promise<{ goals: FinanceGoal[] }> {
  return post(`${BASE}/goals/list.php`, params);
}

export async function financeSaveGoal(params: {
  requester_email: string;
  id?: number;
  name: string;
  icon?: string;
  target_amount: number;
  currency?: string;
  fx_to_base?: number;
  color?: string | null;
  target_date?: string | null;
  notes?: string | null;
  sort_order?: number;
}): Promise<{ success: boolean; goal: FinanceGoal }> {
  return post(`${BASE}/goals/save.php`, params);
}

export async function financeDeleteGoal(params: {
  requester_email: string;
  id: number;
}): Promise<{ success: boolean }> {
  return post(`${BASE}/goals/delete.php`, params);
}

// ---- Capital allocations (reserved capital, deducted from total balance) ----

export interface FinanceAllocation {
  id: number;
  name: string;
  icon: string;            // lucide icon key (lock, vault, home…)
  amount: number;          // reserved amount in `currency`
  currency: string;
  fx_to_base: number;      // rate from `currency` -> base PHP
  color: string | null;
  notes: string | null;
  sort_order: number;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
  amount_base?: number;    // present in overview response (amount * fx_to_base)
}

export async function financeListAllocations(params: {
  requester_email: string;
}): Promise<{ allocations: FinanceAllocation[] }> {
  return post(`${BASE}/capital_allocations/list.php`, params);
}

export async function financeSaveAllocation(params: {
  requester_email: string;
  id?: number;
  name: string;
  icon?: string;
  amount: number;
  currency?: string;
  fx_to_base?: number;
  color?: string | null;
  notes?: string | null;
  sort_order?: number;
}): Promise<{ success: boolean; allocation: FinanceAllocation }> {
  return post(`${BASE}/capital_allocations/save.php`, params);
}

export async function financeDeleteAllocation(params: {
  requester_email: string;
  id: number;
}): Promise<{ success: boolean }> {
  return post(`${BASE}/capital_allocations/delete.php`, params);
}

// ---- Accounts & runway overview ----

export interface FinanceOverview {
  base_currency: string;
  accounts: FinanceAccount[];
  total_balance_base: number;
  total_allocation_base: number;   // Σ capital allocations in base PHP
  spendable_balance_base: number;  // total_balance_base − total_allocation_base
  capital_allocations: FinanceAllocation[];
  balances_by_currency: Array<{ currency: string; total: number }>;
  monthly_income_base: number;
  monthly_expense_base: number;
  net_monthly_base: number;
  runway_months: number | null; // null = infinite (not burning)
  runway_projection: Array<{ month: string; balance: number }>;
  expense_breakdown: Array<{ category: string; total_base: number }>;
  goals: FinanceGoal[];
}

export async function financeGetOverview(params: {
  requester_email: string;
}): Promise<FinanceOverview> {
  return post(`${BASE}/overview.php`, params);
}

// ---- Category metadata ----

export const INCOME_CATEGORIES = [
  { value: "payroll",        label: "Payroll / Salary",   priority: "high" as Priority },
  { value: "client_payment", label: "Client Payment",     priority: "high" as Priority },
  { value: "profit_share",   label: "Profit Share (10%)", priority: "mid"  as Priority },
  { value: "other_income",   label: "Other Income",       priority: "low"  as Priority },
];

export const EXPENSE_CATEGORIES = [
  { value: "developer_salary", label: "Developer Salary", priority: "high" as Priority },
  { value: "ai_tools",         label: "AI Tools",         priority: "mid"  as Priority },
  { value: "subscription",     label: "Subscription",     priority: "mid"  as Priority },
  { value: "software",         label: "Software",         priority: "low"  as Priority },
  { value: "operational",      label: "Operational",      priority: "low"  as Priority },
  { value: "bank_fee",         label: "Bank Fee",         priority: "low"  as Priority },
  { value: "other_expense",    label: "Other Expense",    priority: "low"  as Priority },
];

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export function categoryLabel(value: string): string {
  return ALL_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
