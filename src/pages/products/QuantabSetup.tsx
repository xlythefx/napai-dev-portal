import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCopy,
  Coins,
  Cpu,
  Download,
  HelpCircle,
  Lock,
  Power,
  QrCode,
  Smartphone,
  Sparkles,
  Terminal,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";
import { initAOS } from "@/lib/aos-init";

// Mock values — swap to live data later
const MOCK = {
  apkVersion: "1.4.2",
  apkSizeMb: "18.6 MB",
  apkSha256: "9f3b1c4e7d2a86f0c5e9b73a44d1e8a2f6c0b1d9e4a3725c8f6a91d2b3c4e5f6",
  defaultPin: "1234",
  supportedAndroid: "Android 11 – 15",
  minRam: "2 GB",
  minStorage: "8 GB",
  coinPulse: "1 pulse = ₱1",
  defaultRate: "₱5 per 3 minutes",
  trialDuration: "3 days",
  setupTime: "~5–10 minutes",
};

const requirements = [
  { icon: Smartphone, label: "Android tablet", value: MOCK.supportedAndroid },
  { icon: Cpu, label: "Minimum RAM", value: MOCK.minRam },
  { icon: Download, label: "Free storage", value: MOCK.minStorage },
  { icon: Wifi, label: "Wi-Fi", value: "Required for first activation" },
  { icon: Coins, label: "Coin acceptor", value: "Optional · charger-port relay" },
  { icon: Power, label: "Power", value: "USB-C / micro-USB charger" },
];

const phases = [
  {
    n: 1,
    icon: Wrench,
    title: "Prepare the tablet",
    duration: "2 min",
    steps: [
      "Factory-reset any Android tablet (Settings → System → Reset → Erase all data).",
      "Skip the welcome screen. Do NOT sign in to a Google account — this is critical for device-owner mode.",
      "Connect to Wi-Fi when prompted, then skip everything else.",
      "Once you reach the home screen, you're ready for provisioning.",
    ],
    tip: "If you accidentally added a Google account, just factory-reset again. Device-owner mode only works on a fresh device with no accounts.",
  },
  {
    n: 2,
    icon: QrCode,
    title: "Provision via QR code (recommended)",
    duration: "3 min",
    steps: [
      "On the tablet's welcome screen, tap 6 times in the same spot to open the QR scanner.",
      "Allow camera and location permissions when asked.",
      "Scan the QR code we emailed you after purchase.",
      "Wait while Android downloads QuanTab and sets it as device owner (~2 min on Wi-Fi).",
      `When QuanTab opens, enter the default admin PIN: ${MOCK.defaultPin}`,
    ],
    tip: "Lost your QR? Reply to your purchase email and we'll regenerate it within an hour.",
  },
  {
    n: 3,
    icon: Terminal,
    title: "Alternative: PC install via ADB",
    duration: "5 min",
    steps: [
      "Download the QuanTab APK + ADB setup scripts from the Download section on the product page.",
      "Enable USB debugging on the tablet: Settings → About → tap Build number 7 times → Developer Options → toggle USB debugging.",
      "Plug the tablet into your PC via USB and tap Allow on the authorization prompt.",
      "Run quantab-setup-step1-adb.bat (Windows) or .sh (Mac/Linux) — installs ADB tools.",
      "Run quantab-setup-step2-install.bat — installs the APK and sets device owner.",
      `Open QuanTab on the tablet and enter the default PIN: ${MOCK.defaultPin}`,
    ],
    tip: "Use this path if your tablet's QR scanner is glitchy or you're provisioning a batch.",
  },
  {
    n: 4,
    icon: Lock,
    title: "Configure kiosk settings",
    duration: "2 min",
    steps: [
      `Inside QuanTab, tap the gear icon and enter your admin PIN (default ${MOCK.defaultPin}).`,
      "Change the default PIN to something only you know.",
      `Set your rate. Default is ${MOCK.defaultRate}. Pulse value = ${MOCK.coinPulse}.`,
      "Pick which apps customers can access (Play Store, Chrome, YouTube, games, etc).",
      "Enable DeepFreeze if you want customer-installed apps auto-cleared on logout.",
      "Tap Save. QuanTab will lock down the tablet immediately.",
    ],
    tip: "You can change any of these later from the admin dashboard at napai.com/admin — no need to touch the tablet again.",
  },
  {
    n: 5,
    icon: Coins,
    title: "Wire up the coin timer (optional)",
    duration: "3 min",
    steps: [
      "Plug your coin acceptor's relay output into the tablet's charger port via a USB-OTG splitter.",
      "QuanTab detects charging-state changes as session signals — power on means session active.",
      `Verify by dropping a coin: ${MOCK.coinPulse}, so a ${MOCK.defaultRate.split(" per ")[0]} drop should grant 3 minutes.`,
      "When the charger drops (session ends), a 1-minute countdown starts before all accounts auto-clear.",
    ],
    tip: "No coin acceptor? You can still run QuanTab as a paid-by-the-hour rental — just use the manual unlock from your dashboard.",
  },
  {
    n: 6,
    icon: Zap,
    title: "Go live",
    duration: "1 min",
    steps: [
      "Mount the tablet, plug in the coin acceptor, lock the enclosure.",
      "Log in to napai.com/admin to see your tablet's heartbeat appear within 30 seconds.",
      "Drop a test coin from your own pocket and start a session to verify everything works end-to-end.",
      "You're earning. Average operator clears ₱8,000/month per tablet.",
    ],
    tip: "Watch the first week's session log closely — that's where you'll spot bad coins, jammed relays, or curious customers trying to escape the kiosk.",
  },
];

const troubleshooting = [
  {
    q: "Provisioning fails with 'Not allowed to set device owner'",
    a: "A Google account is still on the device. Factory-reset and skip the sign-in step entirely.",
  },
  {
    q: "QR scanner won't open after 6 taps",
    a: "Some OEM skins disable this. Use the ADB setup path instead (Phase 3 above).",
  },
  {
    q: "Tablet shows 'offline' in dashboard",
    a: "Check Wi-Fi on the tablet. QuanTab will buffer sessions and sync once connection returns — no data is lost.",
  },
  {
    q: "Coin drops don't start a session",
    a: "Test the relay with a multimeter — it should close the charger circuit on each pulse. Replace if dead. Also check the OTG splitter is rated for power passthrough.",
  },
  {
    q: "I forgot the admin PIN",
    a: "From your napai.com/admin dashboard, push a remote PIN-reset to the device. The tablet will pick it up on its next heartbeat.",
  },
  {
    q: "How do I move QuanTab to a different tablet?",
    a: "Pro and Max licenses are transferable. From the dashboard, revoke the key on the old tablet, then re-provision the new one with the same QR.",
  },
];

const QuantabSetup = () => {
  const [copiedSha, setCopiedSha] = useState(false);

  useEffect(() => {
    initAOS();
  }, []);

  const copySha = () => {
    navigator.clipboard.writeText(MOCK.apkSha256);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 1500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <section className="relative isolate overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/15 rounded-full blur-3xl -z-10" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10" />

        <div className="container mx-auto max-w-5xl px-4 py-12 md:py-20">
          <Link
            to="/products/quantab"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to QuanTab
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold mb-5">
              <BookOpen className="w-3 h-3 text-primary" />
              <span className="uppercase tracking-wider">Setup guide</span>
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5 leading-[1.05]">
              The full QuanTab{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-emerald-500 bg-clip-text text-transparent">
                setup guide
              </span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
              Everything you need to take a fresh Android tablet from factory-reset to coin-earning
              kiosk. Total time: {MOCK.setupTime}.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#phases">
                <Button size="lg" className="shadow-lg shadow-primary/20 group">
                  Start with Phase 1
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
              <a href="#troubleshooting">
                <Button size="lg" variant="outline">
                  <HelpCircle className="w-4 h-4 mr-2" /> Skip to troubleshooting
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* APK + REQUIREMENTS */}
      <section className="container mx-auto max-w-5xl px-4 py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-5">
          <Card data-aos="fade-up">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 inline-flex items-center justify-center">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Current build</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-mono font-semibold">v{MOCK.apkVersion}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Size</span>
                <span className="font-mono font-semibold">{MOCK.apkSizeMb}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Android</span>
                <span className="font-mono font-semibold">{MOCK.supportedAndroid}</span>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">SHA-256</p>
                <button
                  onClick={copySha}
                  className="w-full text-left flex items-start gap-2 text-[11px] font-mono break-all p-2 rounded-lg bg-muted/40 hover:bg-muted transition-colors group"
                >
                  <span className="flex-1">{MOCK.apkSha256}</span>
                  <ClipboardCopy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0 mt-0.5" />
                </button>
                {copiedSha && <p className="text-[10px] text-emerald-600 mt-1">Copied</p>}
              </div>
            </CardContent>
          </Card>

          <Card data-aos="fade-up" data-aos-delay="100">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 inline-flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-lg">What you need</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {requirements.map(({ icon: Icon, label, value }) => (
                  <li key={label} className="flex items-start gap-3 text-sm">
                    <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 flex items-baseline justify-between gap-3 flex-wrap">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-right">{value}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* PHASES */}
      <section id="phases" className="container mx-auto max-w-5xl px-4 py-12 md:py-16">
        <div className="text-center mb-12" data-aos="fade-up">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Step-by-step</h2>
          <p className="text-muted-foreground">Six phases, in order. Don't skip ahead.</p>
        </div>

        <div className="space-y-6">
          {phases.map((phase, i) => {
            const Icon = phase.icon;
            return (
              <div key={phase.n} data-aos="fade-up" data-aos-delay={(i % 3) * 80}>
                <Card className="relative overflow-hidden hover:border-primary/40 transition-colors">
                  <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-primary/5 blur-3xl" />
                  <CardHeader className="relative">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground inline-flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/20 shrink-0">
                        {phase.n}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Icon className="w-4 h-4 text-primary" />
                          <CardTitle className="text-xl md:text-2xl">{phase.title}</CardTitle>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Phase {phase.n} · ~{phase.duration}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <ol className="space-y-2.5 mb-5">
                      {phase.steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">Tip:</strong> {phase.tip}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </section>

      {/* TROUBLESHOOTING */}
      <section id="troubleshooting" className="bg-muted/20 border-y py-16 md:py-20">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="text-center mb-10" data-aos="fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-xs font-medium mb-4">
              <HelpCircle className="w-3 h-3 text-primary" /> Troubleshooting
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              Common problems &amp; fixes
            </h2>
            <p className="text-muted-foreground">
              Hit one of these? Try the fix below before messaging support.
            </p>
          </div>

          <div className="space-y-3">
            {troubleshooting.map((t, i) => (
              <div key={t.q} data-aos="fade-up" data-aos-delay={i * 40}>
                <Card className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-5">
                    <p className="font-semibold mb-1.5 flex items-start gap-2">
                      <span className="text-primary text-lg leading-none">›</span>
                      <span>{t.q}</span>
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed pl-5">{t.a}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto max-w-4xl px-4 py-16 md:py-20">
        <div
          data-aos="fade-up"
          className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-emerald-500/10 p-8 md:p-12 text-center"
        >
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-3">
              Still stuck after the guide?
            </h2>
            <p className="text-muted-foreground mb-7 max-w-xl mx-auto leading-relaxed">
              Message us on Facebook with a screenshot or short video. We usually reply within
              the hour during business hours.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <a href="https://m.me/napai" target="_blank" rel="noreferrer">
                <Button size="lg" className="shadow-lg shadow-primary/20">
                  Message us on Facebook
                </Button>
              </a>
              <Link to="/products/quantab/trial">
                <Button size="lg" variant="outline">
                  Or try free for {MOCK.trialDuration}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default QuantabSetup;
