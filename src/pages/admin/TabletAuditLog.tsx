import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { tabletAuditList, type AuditRow, type AuditListResponse } from "@/lib/tabletApi";

const actionColor = (action: string): string => {
  if (action.startsWith("keys.revoke") || action.startsWith("apk.delete")) return "bg-destructive/15 text-destructive border-destructive/30";
  if (action.startsWith("keys.generate") || action.startsWith("apk.upload")) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  if (action.startsWith("settings.") || action.startsWith("apk.activate")) return "bg-primary/10 text-primary border-primary/30";
  return "bg-muted text-muted-foreground border-border";
};

const TabletAuditLog = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const email = user?.email ?? "";

  const [data, setData] = useState<AuditListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [serial, setSerial] = useState("");
  const [actor, setActor] = useState("");

  const load = (p: number = page) => {
    if (!email) return;
    setLoading(true);
    tabletAuditList(email, { page: p, per_page: 50, action, serial, actor })
      .then(setData)
      .catch((e: Error) => toast({ title: "Failed to load audit log", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const applyFilters = () => {
    setPage(1);
    load(1);
  };

  const clearFilters = () => {
    setAction("");
    setSerial("");
    setActor("");
    setPage(1);
    setTimeout(() => load(1), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 inline-flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Audit Log</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Every key generation, revoke, release, email send, and settings change — with who did it and when.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Action (exact)</label>
              <Input
                placeholder="e.g. keys.revoke"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Serial contains</label>
              <Input
                placeholder="ABCD"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Actor email contains</label>
              <Input
                placeholder="napaychristian"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} disabled={loading}>Apply</Button>
              <Button onClick={clearFilters} variant="outline" disabled={loading}>Clear</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && data && data.rows.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">No audit rows match.</div>
          )}
          {!loading && data && data.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 px-4">When</th>
                    <th className="py-2 px-4">Actor</th>
                    <th className="py-2 px-4">Action</th>
                    <th className="py-2 px-4">Target</th>
                    <th className="py-2 px-4">IP</th>
                    <th className="py-2 px-4">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.rows.map((r: AuditRow) => (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="py-2 px-4 whitespace-nowrap text-xs text-muted-foreground tabular-nums">{r.created_at}</td>
                      <td className="py-2 px-4 font-mono text-xs">{r.actor_email}</td>
                      <td className="py-2 px-4">
                        <Badge variant="outline" className={actionColor(r.action) + " font-mono text-[10px]"}>
                          {r.action}
                        </Badge>
                      </td>
                      <td className="py-2 px-4 font-mono text-xs">{r.target_serial ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-2 px-4 font-mono text-xs text-muted-foreground">{r.ip ?? "—"}</td>
                      <td className="py-2 px-4 max-w-md">
                        {r.payload ? (
                          <details>
                            <summary className="cursor-pointer text-xs text-primary hover:underline">view</summary>
                            <pre className="mt-2 p-2 bg-muted/50 rounded text-[11px] whitespace-pre-wrap break-all">
                              {JSON.stringify(r.payload, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && data && data.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {data.page} of {data.total_pages} · {data.total} rows total
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.page <= 1}
              onClick={() => { const p = data.page - 1; setPage(p); load(p); }}
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.page >= data.total_pages}
              onClick={() => { const p = data.page + 1; setPage(p); load(p); }}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabletAuditLog;
