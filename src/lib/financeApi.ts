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
