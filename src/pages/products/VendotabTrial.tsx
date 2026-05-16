import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  Mail,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Download,
  Copy,
  Smartphone,
  ShieldCheck,
  Timer,
  AlertTriangle,
  Lock,
  Zap,
  Gift,
  QrCode,
  Printer,
  Users,
} from "lucide-react";
import { requestTrial, trialEmailQr, type RequestTrialResponse } from "@/lib/tabletApi";

type Step = "intro" | "form" | "submitting" | "success" | "error";

const stepIndex = (s: Step) => ({ intro: 0, form: 1, submitting: 2, success: 3, error: 3 }[s]);

const STEP_LABELS = ["Intro", "Your details", "Your trial QR"];

const StepBar = ({ step }: { step: Step }) => {
  const idx = Math.min(stepIndex(step), 2);
  const pct = (idx / (STEP_LABELS.length - 1)) * 100;
  return (
    <div className="mb-10">
      <div className="relative h-1.5 bg-muted rounded-full overflow-hidden mb-4">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-emerald-500 rounded-full"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <div className="flex items-center justify-between">
        {STEP_LABELS.map((label, i) => {
          const active = i === idx;
          const done = i < idx;
          return (
            <div key={label} className="flex items-center gap-2 min-w-0">
              <motion.div
                animate={{ scale: active ? 1.1 : 1 }}
                className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-[11px] font-semibold shrink-0 transition-colors ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {done ? "✓" : i + 1}
              </motion.div>
              <span className={`text-xs hidden sm:inline truncate ${active ? "font-semibold" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const VendotabTrial = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("intro");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [result, setResult] = useState<RequestTrialResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  // Auto-fire the QR-attachment email once we land on the success step.
  useEffect(() => {
    if (step !== "success" || !result || !result.qr_json) return;
    if (emailStatus !== "idle") return;

    const t = setTimeout(() => {
      const canvas = qrRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
      if (!canvas) {
        setEmailStatus("failed");
        setEmailError("Could not capture the QR — please use the Download button below.");
        return;
      }
      setEmailStatus("sending");
      trialEmailQr({
        email: result.email,
        serial: result.serial,
        name: result.name,
        pngDataUrl: canvas.toDataURL("image/png"),
      })
        .then((r) => {
          if (r.ok) setEmailStatus("sent");
          else {
            setEmailStatus("failed");
            setEmailError(r.error ?? "Email failed");
          }
        })
        .catch((e) => {
          setEmailStatus("failed");
          setEmailError((e as Error).message);
        });
    }, 350);
    return () => clearTimeout(t);
  }, [step, result, emailStatus]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep("submitting");
    try {
      const r = await requestTrial(email.trim(), name.trim());
      setResult(r);
      setStep("success");
    } catch (err) {
      setError((err as Error).message);
      setStep("error");
    }
  };

  const downloadQr = () => {
    if (!result) return;
    const canvas = qrRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `vendotab-${result.serial}.png`;
    a.click();
  };

  const copySerial = () => {
    if (result) navigator.clipboard?.writeText(result.serial);
  };

  return (
    <div className="relative min-h-screen text-foreground overflow-hidden">
      {/* GLOBAL BACKDROP — image-background */}
      <div
        className="fixed inset-0 -z-20 bg-center bg-cover"
        style={{ backgroundImage: "url('/vendo/image-background.jpg')" }}
        aria-hidden="true"
      />
      <div className="fixed inset-0 -z-10 bg-background/85 backdrop-blur-sm" />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background via-background/70 to-background" />
      {/* glow blobs */}
      <div className="fixed -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="fixed -bottom-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 animate-pulse" />

      {/* HEADER */}
      <header className="border-b border-border/60 bg-background/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/products/quantab" className="flex items-center space-x-2 group">
            <img src="/assets/logonew.png" alt="Nap.AI" className="w-8 h-8 object-contain group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold tracking-tighter">
              Nap<span className="text-primary">.AI</span>
            </span>
            <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
              QuanTab Trial
            </span>
          </Link>
          <Link
            to="/products/quantab"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 md:py-16 relative">
        <StepBar step={step} />

        <AnimatePresence mode="wait">
          {step === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <Card className="relative overflow-hidden border-primary/20 shadow-2xl shadow-primary/5">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />

                <CardContent className="relative pt-10 pb-10 px-6 md:px-10">
                  {/* Free badge */}
                  <div className="flex justify-center mb-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <Gift className="w-3.5 h-3.5" />
                      100% free · No credit card
                    </div>
                  </div>

                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.15, type: "spring", stiffness: 220, damping: 18 }}
                      className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary to-primary/60 inline-flex items-center justify-center mb-6 shadow-xl shadow-primary/30 relative"
                    >
                      <span className="absolute inset-0 rounded-3xl bg-primary animate-ping opacity-20" />
                      <Sparkles className="w-10 h-10 text-primary-foreground relative" />
                    </motion.div>

                    <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
                      Try QuanTab{" "}
                      <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
                        free for 3 days
                      </span>
                    </h1>
                    <p className="text-muted-foreground md:text-lg max-w-lg mx-auto mb-8 leading-relaxed">
                      Run a real coin-operated kiosk on a tablet you already own. No credit card,
                      no commitment — if you like it, ₱499 unlocks it for life.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 mb-8">
                    {[
                      {
                        icon: Timer,
                        t: "3 days, full features",
                        b: "Every kiosk feature is on. Clock starts when the tablet first activates.",
                        accent: "from-amber-500/20 to-amber-500/5",
                      },
                      {
                        icon: Smartphone,
                        t: "Works on any tablet",
                        b: "We email you a QR. Scan it on a freshly-reset Android tablet.",
                        accent: "from-primary/20 to-primary/5",
                      },
                      {
                        icon: ShieldCheck,
                        t: "One trial per tablet",
                        b: "Honor system + technical check. Don't try to cheese us — it won't work.",
                        accent: "from-emerald-500/20 to-emerald-500/5",
                      },
                    ].map(({ icon: Icon, t, b, accent }, i) => (
                      <motion.div
                        key={t}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.08 }}
                        className="relative rounded-xl border bg-card/60 backdrop-blur p-4 hover:border-primary/40 hover:shadow-lg transition-all overflow-hidden group"
                      >
                        <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br ${accent} blur-2xl opacity-70 group-hover:opacity-100 transition-opacity`} />
                        <div className="relative">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 inline-flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Icon className="w-4.5 h-4.5 text-primary" />
                          </div>
                          <p className="font-semibold text-sm mb-1">{t}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{b}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Social proof / urgency strip */}
                  <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      <span><span className="font-semibold text-foreground">200+</span> shops running QuanTab</span>
                    </div>
                    <span className="text-muted-foreground/50">·</span>
                    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span><span className="font-semibold text-foreground">5-min</span> setup</span>
                    </div>
                    <span className="text-muted-foreground/50">·</span>
                    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Lock className="w-3.5 h-3.5 text-primary" />
                      <span>device-owner lockdown</span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button size="lg" onClick={() => setStep("form")} className="group shadow-lg shadow-primary/20 px-8">
                      Start my free trial
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <Card className="relative overflow-hidden border-primary/20 shadow-2xl shadow-primary/5">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />

                <CardContent className="relative pt-10 pb-10 px-6 md:px-10">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 inline-flex items-center justify-center mb-4">
                      <Mail className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
                      Where should we send your QR?
                    </h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      We'll email a scannable QR that activates the trial in one tap.
                    </p>
                  </div>

                  <form onSubmit={submit} className="space-y-5 max-w-md mx-auto">
                    <div>
                      <label className="text-sm font-semibold flex items-center gap-1.5 mb-1.5">
                        Email <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="email"
                        required
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="h-11 text-base"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-1.5 block">Name <span className="text-muted-foreground font-normal">(optional)</span></label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Juan dela Cruz"
                        className="h-11 text-base"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">Used to greet you in the email — that's it.</p>
                    </div>

                    <div className="rounded-xl border bg-muted/30 p-3 flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        We don't sell or share emails. One-time message with your trial key, that's it.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setStep("intro")} className="h-11">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                      </Button>
                      <Button type="submit" className="flex-1 h-11 group shadow-lg shadow-primary/20">
                        Send my trial QR
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "submitting" && (
            <motion.div
              key="submitting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="border-primary/20 shadow-xl">
                <CardContent className="pt-16 pb-16 text-center">
                  <div className="relative w-20 h-20 mx-auto mb-5">
                    <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                    <div className="relative w-20 h-20 rounded-full bg-primary/10 inline-flex items-center justify-center">
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    </div>
                  </div>
                  <p className="text-lg font-semibold mb-1">Generating your trial key…</p>
                  <p className="text-sm text-muted-foreground">This usually takes a couple of seconds.</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Card className="border-destructive/30 shadow-xl">
                <CardContent className="pt-10 pb-10 text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 inline-flex items-center justify-center mb-5">
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2 tracking-tight">We couldn't create the trial</h2>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">{error}</p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => setStep("form")}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Try again
                    </Button>
                    <Button onClick={() => navigate("/products/quantab#contact")}>
                      Contact us
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "success" && result && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="relative overflow-hidden border-emerald-500/30 shadow-2xl shadow-emerald-500/10">
                <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />

                <CardContent className="relative pt-10 pb-10 px-6 md:px-10">
                  <div className="text-center mb-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 240, damping: 16 }}
                      className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 inline-flex items-center justify-center mb-5 shadow-xl shadow-emerald-500/30 relative"
                    >
                      <span className="absolute inset-0 rounded-3xl bg-emerald-500 animate-ping opacity-20" />
                      <CheckCircle2 className="w-10 h-10 text-white relative" />
                    </motion.div>

                    <h2 className="text-2xl md:text-4xl font-bold mb-2 tracking-tight">Your trial is ready! 🎉</h2>
                    <p className="text-muted-foreground">
                      Sent to <strong className="text-foreground">{result.email}</strong>
                    </p>

                    <div className="inline-flex items-center gap-2 mt-3 text-xs">
                      {emailStatus === "sending" && (
                        <span className="text-muted-foreground inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted">
                          <Loader2 className="w-3 h-3 animate-spin" /> Sending email…
                        </span>
                      )}
                      {emailStatus === "sent" && (
                        <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Email sent — check your inbox
                        </span>
                      )}
                      {emailStatus === "failed" && (
                        <span className="text-amber-600 dark:text-amber-400 inline-flex items-start gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-left max-w-md">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>Email didn't go through ({emailError}). Use the buttons below to save the QR manually.</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-[280px_1fr] gap-7">
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <div className="absolute -inset-3 bg-gradient-to-br from-primary/30 via-emerald-500/20 to-primary/30 rounded-3xl blur-xl opacity-60" />
                        <div ref={qrRef} className="relative bg-white p-4 rounded-2xl border-2 border-primary/20 shadow-2xl">
                          {result.qr_json ? (
                            <QRCodeCanvas value={JSON.stringify(result.qr_json)} size={236} level="M" />
                          ) : (
                            <div className="w-[236px] h-[236px] flex items-center justify-center text-xs text-center text-muted-foreground p-4 bg-muted rounded-md">
                              <div>
                                <QrCode className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                APK not yet published — your serial is still valid for side-load install.
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {result.qr_json && (
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" onClick={downloadQr}>
                            <Download className="w-3.5 h-3.5 mr-1.5" /> Save PNG
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => window.print()}>
                            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-5">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-semibold">Trial key</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 font-mono text-base bg-gradient-to-br from-muted to-muted/60 px-3.5 py-2.5 rounded-lg border tracking-wide">
                            {result.serial}
                          </code>
                          <Button size="sm" variant="outline" onClick={copySerial} className="h-[42px] px-3">
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-1.5">
                          <Timer className="w-3 h-3" />
                          Valid for {result.trial_days} days from first activation.
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-semibold mb-3 inline-flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-primary" /> Setup steps
                        </p>
                        <ol className="space-y-2.5">
                          {[
                            "Factory-reset your tablet (Settings → System → Reset).",
                            <>On the very first <strong>Welcome</strong> screen, tap 6 times in the same spot.</>,
                            "Scan the QR — Android downloads QuanTab automatically.",
                            <>Trial activates. Your <strong>{result.trial_days}-day</strong> timer starts.</>,
                          ].map((s, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold inline-flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span className="leading-relaxed">{s}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {!result.has_active_apk && (
                        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs p-3 rounded-lg flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>We're between APK releases. Your trial key is valid — drop us a line if you're ready to set up the tablet right away and we'll email a working QR.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3 mt-10 flex-wrap">
                    <Link to="/products/quantab">
                      <Button variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to product page
                      </Button>
                    </Link>
                    <Link to="/products/quantab#pricing">
                      <Button className="shadow-lg shadow-primary/20">
                        Love it? Buy lifetime — ₱499 <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Need help? <a href="https://m.me/napai" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">Message us on Facebook</a>
        </p>
      </main>
    </div>
  );
};

export default VendotabTrial;
