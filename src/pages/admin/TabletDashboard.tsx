import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Smartphone, KeyRound, ShieldOff, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { tabletMetrics, type MetricsResponse } from "@/lib/tabletApi";
import { formatDate } from "@/lib/format";

type Period = "daily" | "weekly" | "monthly";

const TabletDashboard = () => {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("daily");

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    tabletMetrics(email)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [email]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (error) return <div className="text-destructive">{error}</div>;
  if (!data) return null;

  const series =
    period === "daily"
      ? data.series.daily.map((d) => ({ x: d.date, count: d.count }))
      : period === "weekly"
      ? data.series.weekly.map((d) => ({ x: `W${String(d.yearweek).slice(-2)}`, count: d.count }))
      : data.series.monthly.map((d) => ({ x: d.month, count: d.count }));

  const earnings = (n: number) => `${data.currency}${(n * data.price).toLocaleString()}`;

  const cards = [
    { label: "Today", value: data.today, sub: earnings(data.today), delta: data.deltas.today_vs_yesterday, icon: TrendingUp, accent: "from-primary/20 to-primary/5", iconColor: "text-primary" },
    { label: "This Week", value: data.this_week, sub: earnings(data.this_week), delta: data.deltas.week_vs_last, icon: TrendingUp, accent: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-500" },
    { label: "This Month", value: data.this_month, sub: earnings(data.this_month), delta: data.deltas.month_vs_last, icon: TrendingUp, accent: "from-violet-500/20 to-violet-500/5", iconColor: "text-violet-500" },
    { label: "Total Sold", value: data.total_sold, sub: earnings(data.total_sold), delta: null, icon: KeyRound, accent: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-500" },
    { label: "Active Devices", value: data.active_devices, sub: "currently bound", delta: null, icon: Smartphone, accent: "from-cyan-500/20 to-cyan-500/5", iconColor: "text-cyan-500" },
    { label: "Revoked Keys", value: data.revoked_keys, sub: "blocked", delta: null, icon: ShieldOff, accent: "from-red-500/20 to-red-500/5", iconColor: "text-red-500" },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-xs font-medium mb-3">
          <Smartphone className="w-3 h-3 text-primary" />
          <span className="uppercase tracking-wider">Tablet SaaS</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Tablet Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">QuanTab license metrics — activations, revenue, and device state.</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="group relative overflow-hidden hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 h-full">
                <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${c.accent} blur-2xl opacity-70 group-hover:opacity-100 transition-opacity`} />
                <CardHeader className="relative pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{c.label}</CardTitle>
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${c.accent} inline-flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-3.5 h-3.5 ${c.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-2xl font-bold tabular-nums">{c.value}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
                  {c.delta !== null && c.delta !== undefined && (
                    <p className={`text-[11px] mt-1.5 inline-flex items-center gap-0.5 font-medium ${c.delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {c.delta >= 0 ? "▲" : "▼"} {Math.abs(c.delta)}%
                      <span className="text-muted-foreground font-normal ml-0.5">vs prev</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Activations</CardTitle>
            <CardDescription>License keys activated over time</CardDescription>
          </div>
          <div className="flex gap-1">
            {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? "default" : "outline"}
                onClick={() => setPeriod(p)}
              >
                {p}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="x" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <ChartTooltip />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activations</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">No activations yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase border-b">
                <tr>
                  <th className="text-left py-2">Serial</th>
                  <th className="text-left py-2">Device ID</th>
                  <th className="text-left py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 font-mono">{r.serial}</td>
                    <td className="py-2 font-mono text-xs">{r.android_id?.slice(0, 16)}…</td>
                    <td className="py-2 text-muted-foreground">{formatDate(r.activated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TabletDashboard;
