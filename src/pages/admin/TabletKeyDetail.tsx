import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, QrCode } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { confirm } from "@/components/ui/confirm-dialog";
import { keyDetail, keysNoteUpdate, keysRelease, keysRevoke, keysConvert, type KeyDetailResponse } from "@/lib/tabletApi";
import { formatDate } from "@/lib/format";

const TabletKeyDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const email = user?.email ?? "";
  const numId = parseInt(id ?? "0", 10);

  const [data, setData] = useState<KeyDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const load = () => {
    if (!email || !numId) return;
    setLoading(true);
    keyDetail(email, numId)
      .then((d) => {
        setData(d);
        setNote(d.key.note ?? "");
      })
      .catch((e) => toast({ title: "Failed to load", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(load, [email, numId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveNote = async () => {
    setSavingNote(true);
    try {
      await keysNoteUpdate(email, numId, note);
      toast({ title: "Note saved" });
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSavingNote(false);
    }
  };

  const release = async () => {
    if (!(await confirm({
      title: "Release device binding?",
      description: "This key will be unbound from its current device and free to activate on a new tablet.",
      confirmText: "Release",
      tone: "warning",
    }))) return;
    try {
      await keysRelease(email, numId);
      toast({ title: "Released" });
      load();
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const revoke = async (r: 0 | 1) => {
    if (r === 1 && !(await confirm({
      title: "Revoke this key?",
      description: "Devices using this key will be locked out on next heartbeat. You can un-revoke later.",
      confirmText: "Revoke",
      tone: "danger",
    }))) return;
    try {
      await keysRevoke(email, numId, r);
      toast({ title: r === 1 ? "Revoked" : "Un-revoked" });
      load();
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const convertToLifetime = async () => {
    if (!(await confirm({
      title: "Convert to lifetime license?",
      description: "Trial expiry will be removed. The buyer keeps using this tablet permanently.",
      confirmText: "Convert to lifetime",
      tone: "default",
    }))) return;
    try {
      await keysConvert(email, numId, "lifetime");
      toast({ title: "Converted to lifetime — buyer can keep using the tablet." });
      load();
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const extendTrial = async () => {
    const days = parseInt(prompt("Extend trial by how many days?", "3") ?? "0", 10);
    if (!days || days <= 0) return;
    try {
      await keysConvert(email, numId, "trial", days);
      toast({ title: `Trial extended by ${days} days` });
      load();
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data) return null;
  const k = data.key;

  return (
    <div className="space-y-4 max-w-4xl">
      <Link to="/admin/tablet/keys" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to keys
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-2xl">{k.serial}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {k.kind === "trial" ? (
              <Badge variant="outline" className="border-amber-500 text-amber-700">Trial</Badge>
            ) : (
              <Badge variant="outline">Lifetime</Badge>
            )}
            {k.revoked === 1 ? (
              <Badge variant="destructive">Revoked</Badge>
            ) : k.android_id ? (
              <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>
            ) : (
              <Badge variant="secondary">Unbound</Badge>
            )}
            {k.expires_at && (() => {
              const ms = new Date(k.expires_at).getTime() - Date.now();
              const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
              return (
                <Badge variant={days > 0 ? "secondary" : "destructive"}>
                  {days > 0 ? `Expires in ${days}d` : "Expired"}
                </Badge>
              );
            })()}
          </div>
          <table className="text-sm">
            <tbody>
              <tr><td className="pr-6 text-muted-foreground py-1">Device ID</td><td className="font-mono text-xs">{k.android_id ?? "—"}</td></tr>
              <tr><td className="pr-6 text-muted-foreground py-1">Activated</td><td>{k.activated_at ? formatDate(k.activated_at) : "—"}</td></tr>
              {k.expires_at && <tr><td className="pr-6 text-muted-foreground py-1">Expires</td><td>{formatDate(k.expires_at)}</td></tr>}
              {k.buyer_email && <tr><td className="pr-6 text-muted-foreground py-1">Buyer</td><td>{k.buyer_email}</td></tr>}
              <tr><td className="pr-6 text-muted-foreground py-1">Created</td><td>{formatDate(k.created_at)}</td></tr>
              {data.last_heartbeat && (
                <tr><td className="pr-6 text-muted-foreground py-1">Last heartbeat</td>
                <td>{formatDate(data.last_heartbeat.created_at)} · battery {data.last_heartbeat.battery_pct ?? "?"}% · v{data.last_heartbeat.app_version ?? "?"}</td></tr>
              )}
            </tbody>
          </table>
          <div className="flex flex-wrap gap-2 pt-3">
            <Link to={`/admin/tablet/provisioning?key_id=${k.id}`}>
              <Button variant="outline"><QrCode className="w-4 h-4 mr-2" /> Provisioning QR</Button>
            </Link>
            {k.revoked !== 1 && k.android_id && (
              <Button variant="outline" onClick={release}>Transfer to new device</Button>
            )}
            {k.kind === "trial" && (
              <>
                <Button variant="outline" onClick={convertToLifetime}>Convert to lifetime</Button>
                <Button variant="outline" onClick={extendTrial}>Extend trial</Button>
              </>
            )}
            {k.revoked === 1 ? (
              <Button variant="outline" onClick={() => revoke(0)}>Un-revoke</Button>
            ) : (
              <Button variant="destructive" onClick={() => revoke(1)}>Revoke</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Note</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" onClick={saveNote} disabled={savingNote}>
            {savingNote && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save note
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Activation history</CardTitle></CardHeader>
        <CardContent>
          {data.activations.length === 0 ? (
            <p className="text-muted-foreground text-sm">No activations yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase border-b">
                <tr><th className="text-left py-2">When</th><th className="text-left py-2">Device ID</th><th className="text-left py-2">IP</th><th className="text-left py-2">Result</th></tr>
              </thead>
              <tbody>
                {data.activations.map((a, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2">{formatDate(a.created_at)}</td>
                    <td className="py-2 font-mono text-xs">{a.android_id}</td>
                    <td className="py-2 text-muted-foreground">{a.ip ?? "—"}</td>
                    <td className="py-2">
                      <Badge variant={a.result === "ok" ? "default" : a.result === "already_bound" ? "secondary" : "destructive"}>
                        {a.result}
                      </Badge>
                    </td>
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

export default TabletKeyDetail;
