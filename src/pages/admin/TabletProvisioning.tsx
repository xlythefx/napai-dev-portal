import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, QrCode, Download, Mail, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  keysList,
  provisioningQrJson,
  provisioningEmail,
  type LicenseKey,
  type ProvisioningQrResponse,
} from "@/lib/tabletApi";

const TabletProvisioning = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const email = user?.email ?? "";
  const [params, setParams] = useSearchParams();

  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [keyId, setKeyId] = useState<number>(parseInt(params.get("key_id") ?? "0", 10) || 0);
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [wifiType, setWifiType] = useState("WPA");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [qr, setQr] = useState<ProvisioningQrResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [sending, setSending] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!email) return;
    keysList(email, { per_page: 500 }).then((d) => setKeys(d.rows));
  }, [email]);

  useEffect(() => {
    if (!email || !keyId) return;
    setLoading(true);
    provisioningQrJson(email, { keyId, wifiSsid, wifiPass, wifiType })
      .then(setQr)
      .catch((e) => {
        setQr(null);
        toast({ title: "Cannot generate", description: e.message, variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [email, keyId, wifiSsid, wifiPass, wifiType, toast]);

  const onPickKey = (id: number) => {
    setKeyId(id);
    if (id > 0) {
      params.set("key_id", String(id));
    } else {
      params.delete("key_id");
    }
    setParams(params);
  };

  const getCanvas = () => qrRef.current?.querySelector("canvas") as HTMLCanvasElement | null;

  const downloadPng = () => {
    const canvas = getCanvas();
    if (!canvas || !qr) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `vendotab-${qr.key.serial}.png`;
    a.click();
  };

  const sendEmail = async () => {
    if (!buyerEmail || !qr) return;
    const canvas = getCanvas();
    if (!canvas) return;
    setSending(true);
    try {
      const res = await provisioningEmail(email, buyerEmail, qr.key.serial, canvas.toDataURL("image/png"));
      if (!res.ok) throw new Error(res.error || "send failed");
      toast({ title: `Sent to ${buyerEmail}` });
      setBuyerEmail("");
    } catch (e) {
      toast({ title: "Send failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode className="w-6 h-6" /> Provisioning QR
        </h1>
        <p className="text-muted-foreground text-sm">
          Scan on a freshly factory-reset tablet (6 taps on the welcome screen). Android downloads the APK,
          sets it as device-owner, and pre-fills the license key.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="text-sm">License key</label>
            <select
              className="w-full mt-1 p-2 border rounded bg-background"
              value={keyId || ""}
              onChange={(e) => onPickKey(parseInt(e.target.value, 10) || 0)}
            >
              <option value="">— pick a key —</option>
              {keys.map((k) => {
                const tag = k.revoked === 1 ? "[REVOKED] " : k.android_id ? "[BOUND] " : "";
                return (
                  <option key={k.id} value={k.id}>
                    {tag}{k.serial}
                  </option>
                );
              })}
            </select>
          </div>

          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <ChevronDown className={`w-4 h-4 mr-1 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                Advanced — Pre-bake Wi-Fi into the QR
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 p-4 bg-muted/30 rounded border border-dashed space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Skip this if you're emailing the QR to a buyer.</strong> The fields below auto-connect
                the tablet to your Wi-Fi during setup — only useful if <em>you</em> hold the tablet
                (e.g. assembling boxes in your shop). The buyer's home Wi-Fi is irrelevant here.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Wi-Fi SSID</label>
                  <Input value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} placeholder="MyShopWiFi" />
                </div>
                <div>
                  <label className="text-sm">Wi-Fi password</label>
                  <Input value={wifiPass} onChange={(e) => setWifiPass(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span>Security:</span>
                {["WPA", "WEP", "NONE"].map((t) => (
                  <label key={t} className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" checked={wifiType === t} onChange={() => setWifiType(t)} /> {t}
                  </label>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      )}

      {!loading && keyId === 0 && (
        <Card><CardContent className="py-6 text-muted-foreground text-sm">Pick a license key above to generate a QR.</CardContent></Card>
      )}

      {!loading && qr && (
        <Card>
          <CardHeader>
            <CardTitle>Scan this on the fresh tablet</CardTitle>
            <CardDescription>
              Active APK v{qr.active_apk.version} · {(qr.active_apk.size_bytes / 1048576).toFixed(2)} MB
            </CardDescription>
          </CardHeader>
          <CardContent>
            {qr.key.revoked === 1 && (
              <div className="text-destructive text-sm mb-3">⚠ This key is revoked. Provisioning will fail license activation.</div>
            )}
            {qr.key.android_id && qr.key.revoked !== 1 && (
              <div className="text-amber-600 text-sm mb-3">
                ⚠ Already bound to a device. Click <strong>Transfer</strong> on the key first.
              </div>
            )}

            <div className="grid md:grid-cols-[340px_1fr] gap-6 items-start">
              <div className="space-y-3">
                <div ref={qrRef} className="bg-white p-4 rounded-lg inline-block">
                  <QRCodeCanvas value={JSON.stringify(qr.json)} size={300} level="M" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={downloadPng}><Download className="w-4 h-4 mr-2" />PNG</Button>
                  <Button variant="outline" onClick={() => window.print()}>Print</Button>
                </div>
                <div className="pt-3 border-t space-y-2">
                  <label className="text-sm">Email QR to buyer</label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="buyer@example.com"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                    />
                    <Button onClick={sendEmail} disabled={sending || !buyerEmail}>
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Steps for the buyer</h3>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Factory-reset the Android tablet (Settings → System → Reset).</li>
                  <li>On the very first <strong>Welcome</strong> screen, tap the screen <strong>6 times</strong>. The QR scanner opens.</li>
                  <li>Scan this QR.</li>
                  <li>Wait 2–5 minutes — Android downloads QuanTab and sets it as device-owner.</li>
                  <li>QuanTab opens. License key <Badge variant="secondary" className="font-mono">{qr.key.serial}</Badge> is pre-filled. Tap Activate.</li>
                </ol>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground">Show JSON payload</summary>
                  <pre className="mt-2 p-3 bg-muted rounded text-[10px] overflow-auto">{JSON.stringify(qr.json, null, 2)}</pre>
                </details>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TabletProvisioning;
