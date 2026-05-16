import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { devicesList, type DeviceRow } from "@/lib/tabletApi";
import { formatDate } from "@/lib/format";

const TabletDevices = () => {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const [rows, setRows] = useState<DeviceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) return;
    devicesList(email).then((d) => setRows(d.rows)).catch((e) => setError(e.message));
  }, [email]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Smartphone className="w-6 h-6" /> Devices
        </h1>
        <p className="text-muted-foreground text-sm">Active tablets reporting heartbeats</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="text-destructive p-6">{error}</div>
          ) : !rows ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">No active devices yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase border-b bg-muted/30">
                  <tr>
                    <th className="text-left p-3">Serial</th>
                    <th className="text-left p-3">Device ID</th>
                    <th className="text-left p-3">Last heartbeat</th>
                    <th className="text-left p-3">Battery</th>
                    <th className="text-left p-3">App ver</th>
                    <th className="text-left p-3">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-mono">
                        <Link to={`/admin/tablet/keys/${d.id}`} className="hover:underline">{d.serial}</Link>
                      </td>
                      <td className="p-3 font-mono text-xs">{d.android_id.slice(0, 16)}…</td>
                      <td className="p-3">
                        {d.last_seen ? (
                          <span className="text-muted-foreground">
                            {formatDate(d.last_seen)}{" "}
                            {d.stale ? <Badge variant="secondary" className="ml-1">stale</Badge> : <Badge className="bg-emerald-500 hover:bg-emerald-600 ml-1">online</Badge>}
                          </span>
                        ) : (
                          <Badge variant="outline">never</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        {d.battery_pct === null ? "—" : (
                          <Badge
                            className={
                              d.battery_pct < 20 ? "bg-red-500 hover:bg-red-600"
                              : d.battery_pct < 50 ? "bg-amber-500 hover:bg-amber-600"
                              : "bg-emerald-500 hover:bg-emerald-600"
                            }
                          >
                            {d.battery_pct}%
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">{d.app_version ?? "—"}</td>
                      <td className="p-3 text-muted-foreground">{d.note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TabletDevices;
