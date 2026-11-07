import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "framer-motion";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Activity, Loader2, RefreshCw } from "lucide-react";
import {
  financeListAccountLogs,
  type FinanceAccount, type FinanceAccountLog,
} from "@/lib/financeApi";
import {
  INK, MONO_RAMP, kFmt, MonoTooltip, Money, DeltaBadge, pctChange, useMask,
} from "@/components/finance/financeUi";

/* ============================================================
 *  Equity line — every bank balance re-drawn over time.
 *
 *  There is no balance-snapshot table: the change trail
 *  (finance_account_logs) is the only record of what a balance
 *  used to be. So the curve is reconstructed by replaying each
 *  account's log forward and carrying the last known balance
 *  across days with no change.
 * ============================================================ */

const DAY_MS = 86_400_000;
/** keep recharts to a sane number of points on long ranges */
const MAX_POINTS = 160;
/** per-account log page — the API caps `limit` at 200 */
const LOG_LIMIT = 200;

const RANGES = [
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
  { key: "6m",  label: "6M",  days: 182 },
  { key: "1y",  label: "1Y",  days: 365 },
  { key: "all", label: "All", days: null },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const parseTs = (s: string) => {
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? 0 : d.getTime();
};
const startOfDay = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const endOfDay = (ts: number) => startOfDay(ts) + DAY_MS - 1;
const fmtDayFull = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
/**
 * Axis label. It doubles as the row key the tooltip looks up, so once a range
 * spans two calendar years the year has to be part of it to stay unique.
 */
const fmtDay = (ts: number, withYear: boolean) =>
  new Date(ts).toLocaleDateString(undefined, {
    month: "short", day: "numeric", ...(withYear ? { year: "2-digit" as const } : {}),
  });

/** one step in an account's life: a new balance, a status flip, or both */
interface Ev { ts: number; balance: number | null; active: boolean | null }

interface Series {
  account: FinanceAccount;
  key: string;            // recharts dataKey, e.g. "acct_7"
  color: string;
  events: Ev[];
  /**
   * Balance in the account's own currency *before* the earliest log we have.
   * null = the account did not exist yet (its `create` entry is in range).
   */
  seed: number | null;
}

function buildSeries(a: FinanceAccount, logs: FinanceAccountLog[], i: number): Series {
  const ordered = logs
    .slice()
    .sort((x, y) => parseTs(x.changed_at) - parseTs(y.changed_at) || x.id - y.id);

  const events: Ev[] = ordered.map((l) => ({
    ts: parseTs(l.changed_at),
    balance: l.balance_after ?? null,
    active:
      l.action === "create" || l.action === "restore" ? true
      : l.action === "archive" || l.action === "delete" ? false
      : null,
  }));

  const first = ordered[0];
  // `create` present -> the account starts from nothing. Otherwise the trail is
  // truncated (200-row cap) and the earliest entry tells us where it stood.
  const seed =
    !first ? a.balance
    : first.action === "create" ? null
    : first.balance_before ?? first.balance_after ?? a.balance;

  return {
    account: a,
    key: `acct_${a.id}`,
    color: a.color || MONO_RAMP[i % MONO_RAMP.length],
    events,
    seed,
  };
}

/** Replay a series over `samples`, carrying the last known balance forward. */
function sampleSeries(s: Series, samples: number[]): number[] {
  const out: number[] = [];
  let i = 0;
  let balance = s.seed ?? 0;
  let active = s.seed !== null;

  for (const t of samples) {
    while (i < s.events.length && s.events[i].ts <= t) {
      const e = s.events[i];
      if (e.balance !== null) balance = e.balance;
      if (e.active !== null) active = e.active;
      i++;
    }
    out.push(active ? balance : 0);
  }

  // The last point is "now" — take it from the account record, which is
  // authoritative even if the trail was trimmed.
  if (out.length) {
    out[out.length - 1] = s.account.status === "archived" ? 0 : s.account.balance;
  }
  return out;
}

interface Props {
  email: string;
  accounts: FinanceAccount[];
  base: string;
}

const AccountEquityLine = ({ email, accounts, base }: Props) => {
  const reduce = useReducedMotion();
  const masked = useMask();

  const [logsByAccount, setLogsByAccount] = useState<Record<number, FinanceAccountLog[]>>({});
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<"combined" | "split">("combined");
  const [bank, setBank] = useState("all");        // "all" | account id
  const [range, setRange] = useState<RangeKey>("90d");

  // accounts is a fresh array on every parent reload — key the fetch on what
  // actually changed so an unrelated re-render doesn't re-hit the API.
  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;
  const sig = useMemo(
    () => accounts
      .map((a) => `${a.id}:${a.balance}:${a.status ?? "active"}:${a.updated_at ?? ""}`)
      .join("|"),
    [accounts],
  );

  const load = useCallback(async () => {
    const list = accountsRef.current;
    if (!email || list.length === 0) {
      setLogsByAccount({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const pairs = await Promise.all(
        list.map((a) =>
          financeListAccountLogs({ requester_email: email, account_id: a.id, limit: LOG_LIMIT })
            .then((r) => [a.id, r.logs] as const)
            .catch(() => [a.id, [] as FinanceAccountLog[]] as const),
        ),
      );
      setLogsByAccount(Object.fromEntries(pairs));
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => { load(); }, [load, sig]);

  // ---- Reconstruct the curve ----
  const { rows, shown, spanLabel } = useMemo(() => {
    const all = accounts.map((a, i) => buildSeries(a, logsByAccount[a.id] ?? [], i));
    const scoped = bank === "all" ? all : all.filter((s) => String(s.account.id) === bank);
    if (scoped.length === 0) return { rows: [], shown: [] as Series[], spanLabel: "" };

    const now = Date.now();
    const today = startOfDay(now);
    const firstEvent = Math.min(
      ...scoped.map((s) => (s.events.length ? s.events[0].ts : now)),
    );

    const days = RANGES.find((r) => r.key === range)?.days ?? null;
    const dataStart = startOfDay(Math.min(firstEvent, now));
    const windowStart = days ? startOfDay(now - (days - 1) * DAY_MS) : dataStart;
    // never draw a flat run of zeros before the oldest account existed
    const start = Math.max(windowStart, dataStart);

    const dayCount = Math.max(1, Math.round((today - start) / DAY_MS) + 1);
    const step = Math.max(1, Math.ceil(dayCount / MAX_POINTS));

    // step with setDate() rather than +DAY_MS so DST shifts don't drift
    const samples: number[] = [];
    const cursor = new Date(start);
    while (startOfDay(cursor.getTime()) <= today) {
      samples.push(endOfDay(cursor.getTime()));
      cursor.setDate(cursor.getDate() + step);
    }
    if (!samples.length || startOfDay(samples[samples.length - 1]) !== today) {
      samples.push(endOfDay(today));
    }

    const values = new Map(scoped.map((s) => [s.key, sampleSeries(s, samples)]));
    const withYear = new Date(start).getFullYear() !== new Date(today).getFullYear();

    const rows = samples.map((t, idx) => {
      const row: Record<string, number | string> = { t: startOfDay(t), label: fmtDay(t, withYear) };
      let total = 0;
      for (const s of scoped) {
        const v = (values.get(s.key)?.[idx] ?? 0) * (s.account.fx_to_base || 1);
        row[s.key] = v;
        total += v;
      }
      row.total = total;
      return row;
    });

    return {
      rows,
      shown: scoped,
      spanLabel: rows.length > 1 ? `${fmtDayFull(rows[0].t as number)} → today` : "today",
    };
  }, [accounts, logsByAccount, bank, range]);

  // ---- Range stats ----
  const first = rows.length ? Number(rows[0].total) : 0;
  const last = rows.length ? Number(rows[rows.length - 1].total) : 0;
  const delta = last - first;

  const yFmt = (v: number) => (masked ? "" : kFmt(v));
  const labelFor = (l: string | number) => {
    const row = rows.find((r) => r.label === l);
    return row ? fmtDayFull(row.t as number) : String(l);
  };

  const empty = accounts.length === 0;
  const flatline = !loading && !empty && rows.length > 0 && rows.every((r) => Number(r.total) === first);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4" /> Equity Line
            </CardTitle>
            <CardDescription>
              {mode === "combined"
                ? bank === "all"
                  ? `Combined balance across all accounts, in ${base}`
                  : `${shown[0]?.account.name ?? ""} balance over time, in ${base}`
                : `Each account plotted separately, in ${base}`}
              {rows.length > 1 && <> · {spanLabel}</>}
            </CardDescription>
          </div>

          {/* Filters: combined vs per-bank, which bank, how far back */}
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "combined" | "split")}>
              <TabsList className="h-8">
                <TabsTrigger value="combined" className="text-xs px-2.5">Combined</TabsTrigger>
                <TabsTrigger value="split" className="text-xs px-2.5">Per bank</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={bank} onValueChange={setBank}>
              <SelectTrigger className="h-8 w-[150px] text-sm">
                <SelectValue placeholder="All banks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All banks</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Tabs value={range} onValueChange={(v) => setRange(v as RangeKey)}>
              <TabsList className="h-8">
                {RANGES.map((r) => (
                  <TabsTrigger key={r.key} value={r.key} className="text-xs px-2">{r.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Button variant="ghost" size="icon" className="h-8 w-8" title="Refresh"
              onClick={load} disabled={loading}>
              {loading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Range summary */}
        {!empty && rows.length > 0 && (
          <div className="mb-4 flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <div className="text-[11px] text-muted-foreground">Start of range</div>
              <div className="font-mono tabular-nums text-sm text-muted-foreground">
                <Money prefix={`${base} `} value={first} />
              </div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Now</div>
              <div className="font-mono tabular-nums text-lg font-bold">
                <Money prefix={`${base} `} value={last} />
              </div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Change</div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-mono tabular-nums text-sm font-semibold",
                  delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-600" : "text-muted-foreground",
                )}>
                  {delta > 0 ? "+" : delta < 0 ? "−" : ""}
                  <Money prefix={`${base} `} value={Math.abs(delta)} />
                </span>
                <DeltaBadge pct={pctChange(first, last)} />
              </div>
            </div>
          </div>
        )}

        {loading && rows.length === 0 ? (
          <div className="h-[280px] rounded bg-muted animate-pulse" />
        ) : empty ? (
          <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
            Add a bank account to start plotting your equity.
          </div>
        ) : mode === "combined" ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={rows} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={INK.fg} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={INK.fg} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={INK.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: INK.g500 }}
                axisLine={{ stroke: INK.g200 }} tickLine={false}
                interval="preserveStartEnd" minTickGap={28} />
              <YAxis tick={{ fontSize: 11, fill: INK.g500 }} tickFormatter={yFmt}
                axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip content={<MonoTooltip valuePrefix={`${base} `} labelFormatter={labelFor} />} />
              <Area type="monotone" dataKey="total"
                name={bank === "all" ? "Combined balance" : shown[0]?.account.name ?? "Balance"}
                stroke={INK.fg} fill="url(#equityGrad)" strokeWidth={2}
                dot={false} activeDot={{ r: 4, fill: INK.fg }} isAnimationActive={!reduce} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={rows} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={INK.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: INK.g500 }}
                axisLine={{ stroke: INK.g200 }} tickLine={false}
                interval="preserveStartEnd" minTickGap={28} />
              <YAxis tick={{ fontSize: 11, fill: INK.g500 }} tickFormatter={yFmt}
                axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip content={<MonoTooltip valuePrefix={`${base} `} labelFormatter={labelFor} />} />
              {shown.length > 1 && (
                <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
              )}
              {shown.map((s) => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.account.name}
                  stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }}
                  strokeDasharray={s.account.status === "archived" ? "5 4" : undefined}
                  isAnimationActive={!reduce} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}

        {flatline && (
          <p className="mt-3 text-xs text-muted-foreground">
            No balance changes recorded in this range — the line stays flat until an account is edited.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountEquityLine;
