import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, KeyRound, Plus, QrCode, Search, Mail, CheckCircle2, Tag, ShieldOff, Smartphone, Unlock, ArrowRightLeft, Undo2, ChevronLeft, ChevronRight, Package2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { confirm } from "@/components/ui/confirm-dialog";
import {
  keysList,
  keysGenerate,
  keysRevoke,
  keysRelease,
  provisioningUniversalQr,
  bulkEmail,
  provisioningEmail,
  type LicenseKey,
  type KeyFilter,
  type KeyTier,
  type SellType,
  type KeysListResponse,
  type GeneratedKey,
} from "@/lib/tabletApi";
import { formatDate } from "@/lib/format";
import { API_BASE } from "@/lib/api";

const TIER_OPTIONS: { value: KeyTier; label: string; price: number; subtitle: string }[] = [
  { value: "plus", label: "Plus", price: 299, subtitle: "Entry tier" },
  { value: "pro", label: "Pro", price: 349, subtitle: "Most popular" },
  { value: "max", label: "Max", price: 499, subtitle: "Premium" },
];

// 5 or fewer = retail (per-key QR, auto-filled). 6+ = bulk (universal QR, manual entry).
const RETAIL_MAX_COUNT = 5;
const deriveSellType = (count: number): SellType => (count <= RETAIL_MAX_COUNT ? "retail" : "bulk");

function downloadKeysCsv(rows: GeneratedKey[], sellType: SellType, generatedAt: string) {
  const header = "serial,type,sell_type,note,generated_at";
  const escape = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.serial, r.type, r.sell_type, escape(r.note ?? ""), generatedAt].join(","),
  );
  const blob = new Blob([header + "\n" + lines.join("\n") + "\n"], {
    type: "text/csv;charset=utf-8",
  });
  const stamp = generatedAt.replace(/[: ]/g, "-");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `quantab-keys-${stamp}-${sellType}-${rows.length}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const TabletKeys = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const email = user?.email ?? "";

  const [data, setData] = useState<KeysListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<KeyFilter>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [genOpen, setGenOpen] = useState(false);
  const [genCount, setGenCount] = useState(1);
  const [genNote, setGenNote] = useState("");
  const [genType, setGenType] = useState<KeyTier>("pro");
  // sell_type is derived from genCount but kept in state so the result panel
  // (which mirrors what the SERVER decided) doesn't drift while the count
  // input is being edited after generation.
  const [genResult, setGenResult] = useState<string[] | null>(null);
  const [genResultSellType, setGenResultSellType] = useState<SellType>("retail");
  const [genBusy, setGenBusy] = useState(false);

  // Bulk-only — admin can override the tier's default price for the whole batch.
  const [genCustomPrice, setGenCustomPrice] = useState<string>("");
  // Retail-only — auto-email per-key QRs to a single buyer after generation.
  const [genBuyerEmail, setGenBuyerEmail] = useState("");
  const [genBuyerName, setGenBuyerName] = useState("");

  // Universal-QR + bulk-email state (used after a bulk batch is generated).
  const [universalQrJson, setUniversalQrJson] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailSent, setEmailSent] = useState<{ to: string; count: number } | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const universalQrRef = useRef<HTMLDivElement>(null);

  // Retail per-key QR rendering — N hidden canvases keyed by serial.
  const [retailQrPayloads, setRetailQrPayloads] = useState<Record<string, string>>({});
  const retailQrRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [retailEmailProgress, setRetailEmailProgress] =
    useState<{ done: number; total: number; current: string | null } | null>(null);
  const [retailEmailDone, setRetailEmailDone] = useState<{ to: string; count: number } | null>(null);

  // Live-derived. The dialog's count input drives this; result panel uses genResultSellType (locked).
  const liveSellType = deriveSellType(genCount);

  const fetchKeys = useCallback(() => {
    if (!email) return;
    setLoading(true);
    keysList(email, { filter, q, page, per_page: 10 })
      .then(setData)
      .catch((e) => toast({ title: "Failed to load keys", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [email, filter, q, page, toast]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleGenerate = async () => {
    setGenBusy(true);
    setEmailSent(null);
    setEmailError(null);
    setRetailEmailDone(null);
    setRetailEmailProgress(null);
    setRetailQrPayloads({});
    const sellType = liveSellType;
    const customPrice =
      sellType === "bulk" && genCount >= 2 && genCustomPrice.trim() !== ""
        ? parseFloat(genCustomPrice)
        : null;
    try {
      const r = await keysGenerate(
        email,
        genCount,
        genNote,
        genType,
        sellType,
        Number.isFinite(customPrice) ? customPrice : null,
      );
      const serials = r.generated.map((g) => g.serial);
      setGenResult(serials);
      setGenResultSellType(r.sell_type);
      downloadKeysCsv(r.generated, r.sell_type, r.generated_at);
      toast({
        title: `Generated ${r.count} ${r.type} key(s) — CSV saved`,
      });

      // Fetch active APK metadata once. Used by both bulk (universal QR) and
      // retail (per-key QR) flows to build the QR JSON without N round trips.
      let activeApk: { sha256_b64: string } | null = null;
      try {
        const u = await provisioningUniversalQr(email);
        setUniversalQrJson(JSON.stringify(u.json));
        activeApk = u.active_apk;
      } catch (e) {
        setUniversalQrJson(null);
        toast({
          title: "QR backend unavailable",
          description: (e as Error).message + " — make sure an APK is published.",
          variant: "destructive",
        });
      }

      // Retail mode: pre-build per-key QR JSON for each serial. The hidden
      // canvases will render on next paint; auto-email kicks off after.
      if (r.sell_type === "retail" && activeApk) {
        const APK_URL = `${API_BASE}/apk/vendotab`; // stable canonical URL — uses API_BASE so dev/prod stay in sync
        const payloads: Record<string, string> = {};
        for (const s of serials) {
          payloads[s] = JSON.stringify({
            "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME":
              "com.xlythe.vendotab/.DeviceAdminReceiver",
            "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": APK_URL,
            "android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM": activeApk.sha256_b64,
            "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": true,
            "android.app.extra.PROVISIONING_SKIP_ENCRYPTION": false,
            "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": { license_serial: s },
          });
        }
        setRetailQrPayloads(payloads);

        // If a buyer email was provided, kick off the loop after canvases paint.
        const trimmedBuyer = genBuyerEmail.trim();
        if (trimmedBuyer) {
          // Wait two animation frames for QRCodeCanvas to paint, then capture+send.
          await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
          await sendRetailEmails(serials, trimmedBuyer, genBuyerName.trim());
        }
      }

      fetchKeys();
    } catch (e) {
      toast({ title: "Generate failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setGenBusy(false);
    }
  };

  const sendRetailEmails = async (serials: string[], to: string, name: string) => {
    setRetailEmailProgress({ done: 0, total: serials.length, current: serials[0] });
    let okCount = 0;
    let firstError: string | null = null;
    for (let i = 0; i < serials.length; i++) {
      const serial = serials[i];
      setRetailEmailProgress({ done: i, total: serials.length, current: serial });
      const div = retailQrRefs.current.get(serial);
      const canvas = div?.querySelector("canvas") as HTMLCanvasElement | null;
      if (!canvas) {
        firstError = firstError ?? `QR canvas missing for ${serial}`;
        continue;
      }
      try {
        const r = await provisioningEmail(email, to, serial, canvas.toDataURL("image/png"));
        if (r.ok) okCount++;
        else firstError = firstError ?? r.error ?? `Failed for ${serial}`;
      } catch (e) {
        firstError = firstError ?? (e as Error).message;
      }
    }
    setRetailEmailProgress({ done: serials.length, total: serials.length, current: null });
    setRetailEmailDone({ to, count: okCount });
    if (okCount === serials.length) {
      toast({
        title: `Sent ${okCount} per-key QR email${okCount === 1 ? "" : "s"} to ${to}`,
      });
    } else {
      toast({
        title: `Sent ${okCount} of ${serials.length} — see error below`,
        description: firstError ?? "",
        variant: "destructive",
      });
      setEmailError(firstError);
    }
  };

  const handleSendEmail = async () => {
    if (!genResult || !universalQrJson) return;
    if (!emailTo.trim()) {
      setEmailError("Enter the reseller's email first.");
      return;
    }
    const canvas = universalQrRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) {
      setEmailError("QR not ready yet. Try again in a second.");
      return;
    }
    setEmailBusy(true);
    setEmailError(null);
    try {
      const r = await bulkEmail({
        email,
        to: emailTo.trim(),
        serials: genResult,
        qrPngDataUrl: canvas.toDataURL("image/png"),
        note: genNote,
      });
      if (r.ok) {
        setEmailSent({ to: emailTo.trim(), count: r.sent_count ?? genResult.length });
        toast({ title: `Emailed ${r.sent_count ?? genResult.length} keys to ${emailTo}` });
        fetchKeys();
      } else {
        setEmailError(r.error ?? "Send failed");
      }
    } catch (e) {
      setEmailError((e as Error).message);
    } finally {
      setEmailBusy(false);
    }
  };

  const closeGenerateDialog = () => {
    setGenOpen(false);
    setGenResult(null);
    setUniversalQrJson(null);
    setEmailTo("");
    setEmailSent(null);
    setEmailError(null);
    setGenCustomPrice("");
    setGenBuyerEmail("");
    setGenBuyerName("");
    setRetailQrPayloads({});
    setRetailEmailProgress(null);
    setRetailEmailDone(null);
    retailQrRefs.current.clear();
  };

  const handleRevoke = async (k: LicenseKey, revoke: 0 | 1) => {
    if (revoke === 1 && !(await confirm({
      title: `Revoke ${k.serial}?`,
      description: "Devices using this key will be locked out on their next heartbeat. This can be reversed by un-revoking.",
      confirmText: "Revoke key",
      tone: "danger",
    }))) return;
    try {
      await keysRevoke(email, k.id, revoke);
      toast({ title: revoke ? "Revoked" : "Un-revoked" });
      fetchKeys();
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleRelease = async (k: LicenseKey) => {
    if (!(await confirm({
      title: `Release ${k.serial}?`,
      description: "The current device binding will be removed so this key can activate on a new tablet.",
      confirmText: "Release key",
      tone: "warning",
    }))) return;
    try {
      await keysRelease(email, k.id);
      toast({ title: "Released — key can now activate on a new device" });
      fetchKeys();
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const counts = data?.counts ?? { active: 0, unbound: 0, revoked: 0, total: 0 };

  const filterChip = (f: KeyFilter, label: string, count: number) => {
    const active = filter === f;
    return (
      <button
        key={f}
        type="button"
        onClick={() => { setFilter(f); setPage(1); }}
        className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
          active
            ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
            : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
        }`}
      >
        {label}
        <span className={`tabular-nums px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
          active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
        }`}>
          {count}
        </span>
      </button>
    );
  };

  const trialDaysLeft = (expiresAt: string | null): number | null => {
    if (!expiresAt) return null;
    const ms = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  const statCards = [
    { label: "Total keys",  value: counts.total,   icon: KeyRound,   accent: "from-primary/20 to-primary/5",       iconColor: "text-primary" },
    { label: "Active",      value: counts.active,  icon: Smartphone, accent: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-500" },
    { label: "Unbound",     value: counts.unbound, icon: Unlock,     accent: "from-cyan-500/20 to-cyan-500/5",     iconColor: "text-cyan-500" },
    { label: "Revoked",     value: counts.revoked, icon: ShieldOff,  accent: "from-red-500/20 to-red-500/5",       iconColor: "text-red-500" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-3 flex-wrap"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-xs font-medium mb-3">
            <KeyRound className="w-3 h-3 text-primary" />
            <span className="uppercase tracking-wider">QuanTab</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">License Keys</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate, revoke, and transfer keys across devices.
          </p>
        </div>
        <Dialog open={genOpen} onOpenChange={(o) => { if (o) setGenOpen(true); else closeGenerateDialog(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-lg shadow-primary/20 group">
              <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" /> Generate keys
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate license keys</DialogTitle>
              <DialogDescription>New keys are unbound and ready to activate.</DialogDescription>
            </DialogHeader>
            {genResult ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">
                    Generated {genResult.length} {genResultSellType} key(s). CSV downloaded automatically.
                  </p>
                  <textarea
                    readOnly
                    value={genResult.join("\n")}
                    rows={Math.min(8, genResult.length + 1)}
                    className="w-full font-mono text-xs p-2 border rounded mt-2"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                </div>

                {/* Hidden QR canvases (always mounted so refs exist when send fires). */}
                {genResultSellType === "bulk" && universalQrJson && (
                  <div ref={universalQrRef} style={{ position: "absolute", left: -9999, top: -9999 }}>
                    <QRCodeCanvas value={universalQrJson} size={400} level="M" />
                  </div>
                )}
                {genResultSellType === "retail" && (
                  <div style={{ position: "absolute", left: -9999, top: -9999 }}>
                    {Object.entries(retailQrPayloads).map(([serial, payload]) => (
                      <div
                        key={serial}
                        ref={(el) => {
                          if (el) retailQrRefs.current.set(serial, el);
                          else retailQrRefs.current.delete(serial);
                        }}
                      >
                        <QRCodeCanvas value={payload} size={400} level="M" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Bulk: email the CSV + universal QR */}
                {genResultSellType === "bulk" && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    {emailSent ? (
                      <div className="flex items-center gap-2 text-emerald-600 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        Sent {emailSent.count} keys + universal QR to <strong>{emailSent.to}</strong>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-sm font-medium mb-2">
                          <Mail className="w-4 h-4" />
                          Email this batch to a reseller
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          One email — CSV + universal QR (same QR works for all {genResult.length} keys).
                        </p>
                        {!universalQrJson && (
                          <p className="text-xs text-amber-600 mb-2">
                            ⚠ Universal QR not ready — make sure an active APK is published.
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="reseller@example.com"
                            value={emailTo}
                            onChange={(e) => setEmailTo(e.target.value)}
                            disabled={emailBusy}
                          />
                          <Button
                            onClick={handleSendEmail}
                            disabled={emailBusy || !emailTo.trim() || !universalQrJson}
                          >
                            {emailBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                            Send
                          </Button>
                        </div>
                        {emailError && (
                          <p className="text-xs text-destructive mt-2">{emailError}</p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Retail: progress / done state for the per-key auto-email loop */}
                {genResultSellType === "retail" && (retailEmailProgress || retailEmailDone) && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    {retailEmailDone ? (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                        Sent {retailEmailDone.count} per-key QR email
                        {retailEmailDone.count === 1 ? "" : "s"} to <strong>{retailEmailDone.to}</strong>.
                        Buyer scans each QR on each tablet — zero typing.
                      </div>
                    ) : retailEmailProgress ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending {retailEmailProgress.done + 1} of {retailEmailProgress.total}
                        {retailEmailProgress.current ? ` (${retailEmailProgress.current})` : ""}…
                      </div>
                    ) : null}
                    {emailError && (
                      <p className="text-xs text-destructive mt-2">{emailError}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Tier</label>
                  <div className="flex gap-2">
                    {TIER_OPTIONS.map((opt) => {
                      const selected = genType === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setGenType(opt.value)}
                          className={`flex-1 rounded-lg border p-3 text-left transition ${
                            selected
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "hover:border-primary/50"
                          }`}
                        >
                          <div className="font-semibold">{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.price} lifetime</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                            {opt.subtitle}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm">How many?</label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={genCount}
                    onChange={(e) => setGenCount(parseInt(e.target.value) || 1)}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <Badge
                      variant={liveSellType === "bulk" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {liveSellType}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {liveSellType === "retail"
                        ? `≤ ${RETAIL_MAX_COUNT} keys → per-key QR (zero-typing for buyer)`
                        : `> ${RETAIL_MAX_COUNT} keys → universal QR (one QR for the whole batch)`}
                    </span>
                  </div>
                </div>

                {/* Bulk-only: optional custom price for the whole batch */}
                {liveSellType === "bulk" && genCount >= 2 && (
                  <div>
                    <label className="text-sm flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" /> Custom price per key (optional)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder={`Default: ₱${TIER_OPTIONS.find((o) => o.value === genType)?.price}`}
                      value={genCustomPrice}
                      onChange={(e) => setGenCustomPrice(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Reseller discount? Set the per-key price you're charging the reseller. Leave blank for default tier price.
                    </p>
                  </div>
                )}

                {/* Retail-only: optional buyer email for auto-send of per-key QR */}
                {liveSellType === "retail" && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Mail className="w-4 h-4" />
                      Auto-email per-key QRs (optional)
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Fill the buyer's email and we'll send one QR-per-tablet automatically. Each scan auto-fills the serial — zero typing.
                    </p>
                    <Input
                      type="email"
                      placeholder="buyer@example.com"
                      value={genBuyerEmail}
                      onChange={(e) => setGenBuyerEmail(e.target.value)}
                    />
                    <Input
                      type="text"
                      placeholder="Buyer name (optional, used in email greeting)"
                      value={genBuyerName}
                      onChange={(e) => setGenBuyerName(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm">Note (optional)</label>
                  <Input
                    value={genNote}
                    onChange={(e) => setGenNote(e.target.value)}
                    placeholder={
                      liveSellType === "bulk"
                        ? "e.g. Reseller-Juan-2026-05"
                        : "e.g. Walk-in buyer Maria"
                    }
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              {genResult ? (
                <Button onClick={closeGenerateDialog}>Done</Button>
              ) : (
                <Button onClick={handleGenerate} disabled={genBusy}>
                  {genBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Generate
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="group relative overflow-hidden hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${c.accent} blur-2xl opacity-70 group-hover:opacity-100 transition-opacity`} />
                <CardContent className="relative p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.accent} inline-flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 ${c.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{c.label}</p>
                    <p className="text-2xl font-bold tabular-nums leading-tight">{c.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Toolbar: filters + search */}
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mr-1">Filter</span>
            {filterChip("all", "All", counts.total)}
            {filterChip("active", "Active", counts.active)}
            {filterChip("unbound", "Unbound", counts.unbound)}
            {filterChip("trial", "Trials", (counts as { trial?: number }).trial ?? 0)}
            {filterChip("expired", "Expired", (counts as { expired?: number }).expired ?? 0)}
            {filterChip("revoked", "Revoked", counts.revoked)}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search serial, device id, or note…"
              className="pl-10 h-10 bg-background/60"
            />
          </div>
        </CardContent>
      </Card>

      {/* Keys table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : !data?.rows.length ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/60 inline-flex items-center justify-center mb-3">
                <KeyRound className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-medium">No keys match this view</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different filter or generate a new batch.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] text-muted-foreground uppercase tracking-widest border-b bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Serial</th>
                    <th className="text-left px-4 py-3 font-semibold">Tier</th>
                    <th className="text-left px-4 py-3 font-semibold">Kind</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Device ID</th>
                    <th className="text-left px-4 py-3 font-semibold">Activated</th>
                    <th className="text-left px-4 py-3 font-semibold">Note</th>
                    <th className="text-right px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((k, i) => {
                    const days = trialDaysLeft(k.expires_at);
                    const expired = k.kind === "trial" && days !== null && days <= 0;
                    return (
                    <motion.tr
                      key={k.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.015, 0.2) }}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono">
                        <Link to={`/admin/tablet/keys/${k.id}`} className="hover:text-primary hover:underline underline-offset-2 transition-colors">
                          {k.serial}
                        </Link>
                        <span className="inline-flex items-center gap-1 ml-2">
                          {k.sell_type === "bulk" && (
                            <span title="Bulk-generated key" className="text-muted-foreground">
                              <Package2 className="w-3 h-3 inline" />
                            </span>
                          )}
                          {k.bulk_emailed_at && (
                            <span
                              title={`Emailed to ${k.bulk_emailed_to ?? ""} on ${k.bulk_emailed_at}`}
                              className="text-emerald-600"
                            >
                              <Mail className="w-3 h-3 inline" />
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {k.type === "max" ? (
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white capitalize">Max</Badge>
                        ) : k.type === "pro" ? (
                          <Badge className="capitalize">Pro</Badge>
                        ) : (
                          <Badge variant="outline" className="capitalize">Plus</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {k.kind === "trial" ? (
                          <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/5">
                            Trial{days !== null ? (expired ? " · expired" : ` · ${days}d`) : ""}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Lifetime</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {k.revoked === 1 ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Revoked
                          </span>
                        ) : expired ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Expired
                          </span>
                        ) : k.android_id ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            </span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                            Unbound
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.android_id ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{k.activated_at ? formatDate(k.activated_at) : "—"}</td>
                      <td className="px-4 py-3 max-w-[220px] truncate">
                        <div className="truncate" title={k.note ?? ""}>{k.note ?? "—"}</div>
                        {k.buyer_email && <div className="text-xs text-muted-foreground truncate">{k.buyer_email}</div>}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <Link to={`/admin/tablet/provisioning?key_id=${k.id}`}>
                            <Button size="sm" variant="outline" className="h-7 px-2.5">
                              <QrCode className="w-3 h-3 mr-1" /> QR
                            </Button>
                          </Link>
                          {k.revoked !== 1 && k.android_id && (
                            <Button size="sm" variant="outline" className="h-7 px-2.5" onClick={() => handleRelease(k)}>
                              <ArrowRightLeft className="w-3 h-3 mr-1" /> Transfer
                            </Button>
                          )}
                          {k.revoked === 1 ? (
                            <Button size="sm" variant="outline" className="h-7 px-2.5" onClick={() => handleRevoke(k, 0)}>
                              <Undo2 className="w-3 h-3 mr-1" /> Un-revoke
                            </Button>
                          ) : (
                            <Button size="sm" variant="destructive" className="h-7 px-2.5" onClick={() => handleRevoke(k, 1)}>
                              <ShieldOff className="w-3 h-3 mr-1" /> Revoke
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page <span className="font-semibold text-foreground">{data.page}</span> of {data.total_pages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-full" disabled={data.page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" disabled={data.page >= data.total_pages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabletKeys;
