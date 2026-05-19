import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Smartphone,
  Lock,
  Snowflake,
  Timer,
  QrCode,
  Cloud,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ExternalLink,
  Menu,
  X,
  Play,
  Flame,
  ShoppingBag,
  Zap,
  Wifi,
  BatteryCharging,
  Bell,
  Users,
  TrendingUp,
  Twitter,
  Linkedin,
  Github,
  Instagram,
  Download,
  Terminal,
  Trash2,
  XCircle,
  BookOpen,
} from "lucide-react";
import { publicActiveApk, setupScriptUrl, type PublicActiveApk } from "@/lib/tabletApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { API_BASE } from "@/lib/api";
import { initAOS } from "@/lib/aos-init";

const APK_DOWNLOAD_URL = `${API_BASE}/apk/vendotab`;

const features = [
  {
    icon: Lock,
    title: "Bulletproof Kiosk Mode",
    body: "Customers can't escape the app. Swipe-up, recents, status bar — all blocked via Android device-owner. Only your admin PIN gets out.",
    accent: "from-red-500/20 to-orange-500/10",
  },
  {
    icon: Snowflake,
    title: "DeepFreeze",
    body: "Snapshot the device, then auto-uninstall anything customers add on every logout. Tablets stay clean forever.",
    accent: "from-cyan-500/20 to-blue-500/10",
  },
  {
    icon: Timer,
    title: "1-Minute Idle Reset",
    body: "After charger drops, a 1-minute countdown clears all customer accounts automatically — Play, browsers, games — so the next coin starts fresh.",
    accent: "from-amber-500/20 to-yellow-500/10",
  },
  {
    icon: QrCode,
    title: "QR-Code Provisioning",
    body: "No ADB. No technical skills. Buyer scans a QR on a fresh tablet and 5 minutes later it's a kiosk.",
    accent: "from-violet-500/20 to-purple-500/10",
  },
  {
    icon: Cloud,
    title: "Remote License Control",
    body: "Revoke or transfer keys from your dashboard. Stolen tablet? One click locks it out worldwide on next heartbeat.",
    accent: "from-sky-500/20 to-indigo-500/10",
  },
  {
    icon: Smartphone,
    title: "Coin-Timer Ready",
    body: "Plug your existing coin-acceptor + relay into the charger port. The session unlocks the moment power flows.",
    accent: "from-emerald-500/20 to-green-500/10",
  },
];

const steps = [
  { n: 1, title: "Buy a license", body: "Send payment via GCash. We email you a QR code within an hour." },
  { n: 2, title: "Reset your tablet", body: "Factory-reset any Android tablet. No technical setup needed." },
  { n: 3, title: "Scan the QR", body: "Tap the welcome screen 6 times → scan QR. Android does the rest." },
  { n: 4, title: "Drop in coins", body: "Plug the coin timer into the charger port. You're earning." },
];

// Marquee strip items
const tickerItems = [
  { icon: Flame, text: "27 licenses sold this week" },
  { icon: Zap, text: "5-minute setup — guaranteed" },
  { icon: Wifi, text: "Works offline · syncs later" },
  { icon: BatteryCharging, text: "Coin-timer ready out of the box" },
  { icon: Lock, text: "Android device-owner lockdown" },
  { icon: TrendingUp, text: "Avg ₱8,000/month per tablet" },
  { icon: ShoppingBag, text: "Lifetime from ₱300 — no monthly fees" },
  { icon: Users, text: "200+ shops running QuanTab" },
];

// Sample names for "just availed" popup
const recentBuyers = [
  { name: "Juan from Cebu", time: "2 minutes ago" },
  { name: "Maria from Davao", time: "8 minutes ago" },
  { name: "Carlos from Quezon City", time: "15 minutes ago" },
  { name: "Aileen from Iloilo", time: "23 minutes ago" },
  { name: "Marvin from Pampanga", time: "31 minutes ago" },
  { name: "Joana from Bacolod", time: "44 minutes ago" },
  { name: "Renz from Cagayan de Oro", time: "1 hour ago" },
  { name: "Bea from Baguio", time: "1 hour ago" },
];

const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const formatDate = (iso: string) => {
  const d = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

const VendotabLanding = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [popupIdx, setPopupIdx] = useState(0);
  const [popupVisible, setPopupVisible] = useState(false);
  const [activeApk, setActiveApk] = useState<PublicActiveApk | null>(null);

  useEffect(() => {
    initAOS();
  }, []);

  useEffect(() => {
    let cancelled = false;
    publicActiveApk()
      .then((res) => { if (!cancelled) setActiveApk(res.active); })
      .catch(() => { /* silent — section still renders with placeholders */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Recent-buyer popup loop
  useEffect(() => {
    let mounted = true;
    const cycle = () => {
      if (!mounted) return;
      setPopupVisible(true);
      setTimeout(() => mounted && setPopupVisible(false), 5000);
      setTimeout(() => {
        if (!mounted) return;
        setPopupIdx((i) => (i + 1) % recentBuyers.length);
      }, 5500);
    };
    const initial = setTimeout(cycle, 2500);
    const interval = setInterval(cycle, 9000);
    return () => {
      mounted = false;
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  const buyer = recentBuyers[popupIdx];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* TOP NAV — inspired by root Navbar */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/95 backdrop-blur-md shadow-lg border-b border-border"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center space-x-2 group">
              <img src="/assets/logonew.png" alt="Nap.AI" className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-300" />
              <span className="text-2xl font-bold tracking-tighter">
                Nap<span className="text-primary">.AI</span>
              </span>
              <span className="hidden sm:inline-flex ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                QuanTab
              </span>
            </Link>

            <div className="hidden lg:flex items-center space-x-1">
              <Link to="/" className="px-4 py-2 text-sm font-medium rounded-lg text-foreground hover:text-primary hover:bg-primary/5 transition-all">Home</Link>
              <a href="#features" className="px-4 py-2 text-sm font-medium rounded-lg text-foreground hover:text-primary hover:bg-primary/5 transition-all">Features</a>
              <a href="#how" className="px-4 py-2 text-sm font-medium rounded-lg text-foreground hover:text-primary hover:bg-primary/5 transition-all">How it works</a>
              <a href="#pricing" className="px-4 py-2 text-sm font-medium rounded-lg text-foreground hover:text-primary hover:bg-primary/5 transition-all">Pricing</a>
              <a href="#download" className="px-4 py-2 text-sm font-medium rounded-lg text-foreground hover:text-primary hover:bg-primary/5 transition-all">Download</a>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg text-foreground hover:text-primary hover:bg-primary/5 transition-all outline-none data-[state=open]:text-primary data-[state=open]:bg-primary/10">
                  Other Products
                  <ChevronDown className="w-3.5 h-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56">
                  <DropdownMenuItem asChild>
                    <a href="https://flowehn.com" target="_blank" rel="noreferrer" className="flex cursor-pointer items-center justify-between">
                      <span>Flowehn.com</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="justify-between">
                    <span>Other</span>
                    <span className="text-xs text-muted-foreground">Coming soon</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="hidden lg:flex items-center space-x-3">
              <Link to="/products/quantab/trial">
                <Button variant="outline" size="lg" className="rounded-full">
                  <Timer className="w-4 h-4 mr-2" /> Try free
                </Button>
              </Link>
              <a href="#contact">
                <Button size="lg" className="rounded-full bg-primary hover:bg-primary/90">
                  Get a license
                </Button>
              </a>
            </div>

            <button
              className="lg:hidden p-2 rounded-lg hover:bg-primary/10 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>

          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden overflow-hidden"
              >
                <div className="py-4 space-y-2">
                  {[
                    { name: "Home", href: "/" },
                    { name: "Features", href: "#features" },
                    { name: "How it works", href: "#how" },
                    { name: "Pricing", href: "#pricing" },
                    { name: "Download", href: "#download" },
                  ].map((l) =>
                    l.href.startsWith("#") ? (
                      <a key={l.name} href={l.href} onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-sm font-medium rounded-lg text-foreground hover:text-primary hover:bg-primary/5">
                        {l.name}
                      </a>
                    ) : (
                      <Link key={l.name} to={l.href} onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-sm font-medium rounded-lg text-foreground hover:text-primary hover:bg-primary/5">
                        {l.name}
                      </Link>
                    )
                  )}
                  <div className="pt-3 space-y-2">
                    <Link to="/products/quantab/trial" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" size="lg" className="w-full rounded-full">Try free</Button>
                    </Link>
                    <a href="#contact" onClick={() => setMobileOpen(false)}>
                      <Button size="lg" className="w-full rounded-full">Get a license</Button>
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>

      {/* HERO with full landing-hero image */}
      <section className="relative isolate min-h-[92vh] flex items-center overflow-hidden pt-20">
        <div className="absolute inset-0 -z-10">
          <img src="/vendo/landing-hero.jpg" alt="QuanTab kiosk in action" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse -z-10" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse -z-10" />

        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 w-full">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
              Turn any tablet into a{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-emerald-500 bg-clip-text text-transparent">
                coin-operated kiosk
              </span>{" "}
              in 5 minutes
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl mb-8 leading-relaxed">
              QuanTab is the launcher software vendo-shop owners trust to lock customers into Play Store, games, and browsing — all paid by the minute, hands-off.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <a href="#contact">
                <Button size="lg" className="group shadow-lg shadow-primary/20">
                  Buy a license — from ₱300 lifetime
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
              <a href="#video">
                <Button size="lg" variant="outline" className="backdrop-blur-sm group">
                  <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" /> Watch 60s demo
                </Button>
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              <Link to="/products/quantab/trial" className="underline underline-offset-2 hover:text-foreground">
                Or try free for 3 days
              </Link>{" "}
              · No credit card · Email required
            </p>
          </motion.div>
        </div>
      </section>

      {/* MARQUEE STRIP */}
      <div className="relative border-y bg-primary text-primary-foreground overflow-hidden">
        <div className="flex whitespace-nowrap py-3 animate-[marquee_40s_linear_infinite] hover:[animation-play-state:paused]">
          {[...tickerItems, ...tickerItems, ...tickerItems].map((it, i) => {
            const Icon = it.icon;
            return (
              <div key={i} className="flex items-center gap-2 mx-8 text-sm font-medium">
                <Icon className="w-4 h-4 opacity-90" />
                <span>{it.text}</span>
                <span className="ml-8 opacity-50">·</span>
              </div>
            );
          })}
        </div>
        <style>{`
          @keyframes marquee {
            from { transform: translateX(0); }
            to { transform: translateX(-33.3333%); }
          }
        `}</style>
      </div>

      {/* VIDEO PLACEHOLDER */}
      <section id="video" className="max-w-5xl mx-auto px-4 py-20 md:py-24">
        <div className="text-center mb-10" data-aos="fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-xs font-medium mb-4">
            <Play className="w-3 h-3 text-primary" /> Live demo
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-3 tracking-tight">See it lock down a tablet in 60 seconds</h2>
          <p className="text-muted-foreground text-lg">From factory reset to first paying customer.</p>
        </div>

        <div data-aos="zoom-in" data-aos-delay="100" className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-emerald-500/20 to-primary/30 rounded-2xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-muted via-background to-muted shadow-2xl">
            {/* Placeholder content — swap for <video> or <iframe> later */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(var(--primary-rgb,16,185,129),0.15),transparent_60%)]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <button className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center shadow-2xl shadow-primary/40 group-hover:scale-110 transition-transform">
                <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-30" />
                <Play className="w-8 h-8 md:w-10 md:h-10 relative ml-1" fill="currentColor" />
              </button>
              <div className="text-center">
                <p className="text-sm font-medium">Demo video coming soon</p>
                <p className="text-xs text-muted-foreground mt-1">Full provisioning walkthrough · 60 seconds</p>
              </div>
            </div>
            <div className="absolute bottom-4 left-4 px-2.5 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs font-mono">
              0:00 / 1:00
            </div>
            <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-red-500/90 text-white text-xs font-semibold inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> PREVIEW
            </div>
          </div>
        </div>
      </section>

      {/* ISOMETRIC SHOWCASE */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div data-aos="fade-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-xs font-medium mb-5">
              <Sparkles className="w-3 h-3 text-primary" /> The full stack
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5 leading-tight">
              Tablet, coin-timer, dashboard — <span className="text-primary">one ecosystem.</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
              Hardware plugs straight into the charger port. Your dashboard sees every tablet's heartbeat in real-time. Customers see a clean, locked-down kiosk. Nobody messes with anything.
            </p>
            <ul className="space-y-3">
              {[
                "Real-time tablet status from any browser",
                "Push remote lock or kill-switch on stolen units",
                "Per-device session logs for audit & GCash reconciliation",
                "Works offline — syncs when connection returns",
              ].map((b, i) => (
                <li
                  key={b}
                  data-aos="fade-up"
                  data-aos-delay={i * 60}
                  className="flex items-start gap-3 text-sm"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div data-aos="fade-left" data-aos-delay="100" className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-emerald-500/10 blur-3xl" />
            <motion.img
              src="/vendo/isometric.png"
              alt="QuanTab ecosystem"
              className="relative w-full h-auto drop-shadow-2xl"
              initial={{ y: 0 }}
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
      </section>

      {/* FEATURES — improved with colored accents + numbered hover reveal */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-20 md:py-24">
        <div className="text-center mb-14" data-aos="fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-xs font-medium mb-4">
            Features
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-3 tracking-tight">
            Everything you need to run a vendo-tablet shop
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Built specifically for Philippine coin-operated tablet operators. No fluff, just the things that earn you money.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={f.title} data-aos="fade-up" data-aos-delay={(i % 3) * 100}>
                <Card className="h-full group relative overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
                  {/* gradient accent */}
                  <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${f.accent} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />

                  {/* number badge */}
                  <div className="absolute top-4 right-4 text-5xl font-black text-foreground/[0.04] group-hover:text-primary/10 transition-colors tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </div>

                  <CardHeader className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 inline-flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="relative text-sm text-muted-foreground leading-relaxed">
                    {f.body}
                  </CardContent>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                </Card>
              </div>
            );
          })}
        </div>

        {/* Mini comparison strip */}
        <div className="mt-12 grid sm:grid-cols-3 gap-4" data-aos="fade-up">
          {[
            { label: "Setup time", value: "5 min", note: "vs. 2+ hours with stock Android" },
            { label: "Customer escapes", value: "0", note: "device-owner level lockdown" },
            { label: "Recurring fees", value: "₱0", note: "pay once, own forever" },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl border bg-card/50 backdrop-blur p-5 hover:border-primary/30 transition-colors">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{m.label}</p>
              <p className="text-3xl font-bold mt-1 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-2">{m.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-gradient-to-b from-muted/30 via-muted/10 to-transparent py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14" data-aos="fade-up">
            <h2 className="text-3xl md:text-5xl font-bold mb-3 tracking-tight">How it works</h2>
            <p className="text-muted-foreground text-lg">From payment to your first coin — under 10 minutes.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-5 relative">
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            {steps.map((s, i) => (
              <div key={s.n} data-aos="fade-up" data-aos-delay={i * 120} className="relative">
                <Card className="h-full hover:border-primary/40 hover:shadow-md transition-all">
                  <CardContent className="pt-7 pb-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground inline-flex items-center justify-center font-bold mb-4 shadow-lg shadow-primary/20">
                      {s.n}
                    </div>
                    <h3 className="font-semibold mb-2">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Full setup guide CTA */}
          <div data-aos="fade-up" className="mt-12">
            <Link to="/products/quantab/setup" className="block group">
              <Card className="relative overflow-hidden border-primary/30 hover:border-primary/60 transition-all hover:shadow-xl hover:shadow-primary/10">
                <div className="absolute -top-16 -right-16 w-56 h-56 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />
                <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl" />
                <CardContent className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground inline-flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Want the full walkthrough?</p>
                    <h3 className="text-xl md:text-2xl font-bold tracking-tight mb-1.5">
                      Read the complete QuanTab setup guide
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Every phase, every screen, every gotcha — including ADB install, coin-timer wiring, kiosk configuration, and a full troubleshooting section.
                    </p>
                  </div>
                  <Button size="lg" className="shrink-0 shadow-lg shadow-primary/20 group-hover:translate-x-1 transition-transform">
                    Open guide
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* DOWNLOAD & ADB SETUP */}
      <section id="download" className="max-w-5xl mx-auto px-4 py-20 md:py-24">
        <div className="text-center mb-10" data-aos="fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-xs font-medium mb-4">
            <Download className="w-3 h-3 text-primary" /> Self-install
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-3 tracking-tight">Prefer to install via PC?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Download the APK plus our ADB setup scripts. Three clicks on Windows or Mac and your tablet is locked into kiosk mode — no QR scanning needed.
          </p>
        </div>

        <div data-aos="zoom-in" data-aos-delay="100">
          <Card className="border-primary/20 shadow-2xl shadow-primary/5 overflow-hidden">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 inline-flex items-center justify-center shrink-0">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-2xl">QuanTab</CardTitle>
                    {activeApk && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
                        v{activeApk.version}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Coin-operated tablet gaming kiosk</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {activeApk?.notes && (
                <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3 whitespace-pre-line">
                  {activeApk.notes}
                </p>
              )}

              {/* APK download */}
              <div className="rounded-xl border bg-muted/30 p-4 flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 rounded-lg bg-primary/10 inline-flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="font-semibold text-sm">Android APK</p>
                  <p className="text-xs text-muted-foreground">For any Android tablet (ARM/ARM64)</p>
                  {activeApk?.sha256_b64 && (
                    <p className="text-[10px] text-muted-foreground/70 font-mono mt-1.5 break-all">
                      SHA256: {activeApk.sha256_b64}
                    </p>
                  )}
                </div>
                <a href={APK_DOWNLOAD_URL}>
                  <Button size="sm" className="shadow-sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download APK{activeApk ? ` (${formatMb(activeApk.size_bytes)})` : ""}
                  </Button>
                </a>
              </div>

              {/* Setup steps */}
              <div className="rounded-xl border bg-amber-500/[0.03] divide-y divide-border/60">
                {[
                  { icon: Wifi, title: "Step 1: ADB Setup", body: "Downloads ADB and connects to the tablet via USB.", step: "adb" as const, tone: "amber" as const },
                  { icon: Terminal, title: "Step 2: Install & Kiosk Setup", body: "Installs APK, sets device owner, and launches QuanTab.", step: "install" as const, tone: "amber" as const },
                  { icon: Trash2, title: "Uninstall Script", body: "Removes device owner and uninstalls QuanTab.", step: "uninstall" as const, tone: "destructive" as const },
                ].map(({ icon: Icon, title, body, step, tone }) => (
                  <div key={step} className="p-4 flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg inline-flex items-center justify-center shrink-0 ${tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{title}</p>
                      <p className="text-xs text-muted-foreground mb-2.5">{body}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <a href={setupScriptUrl(step, "win")}>
                          <Button variant="outline" size="sm">
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            Windows (.bat)
                          </Button>
                        </a>
                        <a href={setupScriptUrl(step, "unix")}>
                          <Button variant="outline" size="sm">
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            Mac / Linux (.sh)
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                <span>{activeApk ? `Released ${formatDate(activeApk.uploaded_at)}` : ""}</span>
                <Link to="/products/quantab/setup" className="inline-flex items-center gap-1 text-primary hover:underline">
                  Full Setup Guide <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <p className="text-xs text-muted-foreground/80 leading-relaxed border-t pt-4">
                <strong>Heads up:</strong> device-owner mode requires a freshly factory-reset tablet
                with no Google account added. If Step 2 fails with "Not allowed to set the device
                owner", reset the tablet and skip the welcome screen without signing in to Google,
                then re-run.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative isolate py-20 md:py-28 overflow-hidden">
        {/* parallax-ish background image */}
        <div
          className="absolute inset-0 -z-10 bg-fixed bg-center bg-cover"
          style={{ backgroundImage: "url('/vendo/image-background.jpg')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 -z-10 bg-background/85 backdrop-blur-sm" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/70 to-background" />

        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12" data-aos="fade-up">
            <h2 className="text-3xl md:text-5xl font-bold mb-3 tracking-tight">Pick your license</h2>
            <p className="text-muted-foreground text-lg">Lifetime, one tablet per key. No monthly fees, ever.</p>
          </div>

          {(() => {
            const tiers = [
              {
                key: "plus",
                name: "Plus",
                tagline: "Just the essentials",
                price: 300,
                highlight: false,
                cta: "Get Plus",
                features: [
                  { ok: true, text: "Kiosk lockdown (device-owner)" },
                  { ok: true, text: "Session clear on charger unplug" },
                  { ok: true, text: "1-minute idle reset" },
                  { ok: true, text: "QR-code provisioning" },
                  { ok: true, text: "Coin-timer ready" },
                  { ok: false, text: "Free APK updates" },
                  { ok: false, text: "DeepFreeze snapshot & restore" },
                  { ok: false, text: "Battery charge health limit" },
                  { ok: false, text: "White-label & full branding" },
                  { ok: false, text: "Earnings & session analytics" },
                ],
              },
              {
                key: "pro",
                name: "Pro",
                tagline: "A little more headroom",
                price: 399,
                highlight: false,
                cta: "Get Pro",
                features: [
                  { ok: true, text: "Everything in Plus" },
                  { ok: true, text: "DeepFreeze snapshot & restore" },
                  { ok: true, text: "Session clear on charger unplug" },
                  { ok: true, text: "Priority email support" },
                  { ok: true, text: "Transferable to a new tablet" },
                  { ok: false, text: "Battery charge health limit" },
                  { ok: false, text: "White-label & full branding" },
                  { ok: false, text: "Earnings & session analytics" },
                ],
              },
              {
                key: "max",
                name: "Max",
                tagline: "Everything unlocked",
                price: 449,
                highlight: true,
                cta: "Get Max",
                features: [
                  { ok: true, text: "Everything in Pro" },
                  { ok: true, text: "Battery charge health limit" },
                  { ok: true, text: "Full white-label & branding" },
                  { ok: true, text: "Earnings & session analytics" },
                  { ok: true, text: "Logo, color, title, rates text" },
                  { ok: true, text: "Custom background w/ blur & darken" },
                  { ok: true, text: "Early access to new features" },
                ],
              },
            ];

            return (
              <div className="grid md:grid-cols-3 gap-5 items-stretch">
                {tiers.map((t, i) => (
                  <div
                    key={t.key}
                    data-aos="fade-up"
                    data-aos-delay={i * 100}
                    className={t.highlight ? "md:-my-3" : ""}
                  >
                    <Card
                      className={`h-full flex flex-col relative overflow-hidden transition-all ${
                        t.highlight
                          ? "border-primary shadow-2xl shadow-primary/20 ring-1 ring-primary/40"
                          : "hover:border-primary/30"
                      }`}
                    >
                      {t.highlight && (
                        <>
                          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/15 rounded-full blur-3xl" />
                          <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            Best value
                          </div>
                        </>
                      )}
                      <CardHeader className={`text-center ${t.highlight ? "pt-10" : "pt-8"}`}>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">{t.name}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">{t.tagline}</p>
                        <div className="mt-4">
                          <span className="text-muted-foreground text-2xl align-top">₱</span>
                          <span
                            className={`text-5xl md:text-6xl font-bold ${
                              t.highlight
                                ? "bg-gradient-to-br from-primary to-emerald-500 bg-clip-text text-transparent"
                                : "bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent"
                            }`}
                          >
                            {t.price}
                          </span>
                          <span className="text-muted-foreground"> / tablet</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2">Lifetime · pay once</p>
                      </CardHeader>
                      <CardContent className="flex flex-col flex-1 pb-7">
                        <div className="space-y-2.5 flex-1">
                          {t.features.map((f) => (
                            <div
                              key={f.text}
                              className={`flex items-start gap-2.5 text-sm ${
                                f.ok ? "" : "text-muted-foreground/60 line-through decoration-muted-foreground/30"
                              }`}
                            >
                              {f.ok ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                              ) : (
                                <XCircle className="w-5 h-5 text-muted-foreground/40 mt-0.5 shrink-0" />
                              )}
                              <span>{f.text}</span>
                            </div>
                          ))}
                        </div>
                        <a href="#contact" className="block pt-6 mt-auto">
                          <Button
                            className={`w-full group ${
                              t.highlight ? "shadow-lg shadow-primary/20" : ""
                            }`}
                            size="lg"
                            variant={t.highlight ? "default" : "outline"}
                          >
                            {t.cta}
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </a>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            );
          })()}

          <div
            data-aos="fade-up"
            className="mt-10 relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-emerald-500/10 to-primary/10 p-5 md:p-6"
          >
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
            <div className="relative flex flex-col md:flex-row md:items-center gap-5 md:gap-6">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-primary/15 inline-flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-xs uppercase tracking-widest font-semibold text-primary">Try before you buy</p>
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    Max features unlocked
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold tracking-tight">
                  3 days free on the Max plan — no credit card
                </h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  White-label, battery health limit, earnings analytics, everything. Just enter your
                  email and we'll send you a trial QR.
                </p>
              </div>
              <Link to="/products/quantab/trial" className="shrink-0">
                <Button size="lg" className="w-full md:w-auto shadow-lg shadow-primary/20 group">
                  Start free trial
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6 max-w-xl mx-auto">
            All tiers include kiosk lockdown and session clear. Pro adds DeepFreeze
            snapshot-and-restore plus free APK updates. Only Max unlocks the customization features
            that let you brand the tablet as your own and see what each unit is earning you.
          </p>
        </div>
      </section>

      {/* CONTACT CTA */}
      <section id="contact" className="max-w-4xl mx-auto px-4 py-20 md:py-24">
        <div data-aos="fade-up" className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-emerald-500/10 border border-primary/20 px-6 md:px-12 py-14 md:py-16 text-center">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Ready to start earning?</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto leading-relaxed">
              Message us on Facebook with your name + the email you want the QR sent to.
              We'll reply with GCash payment details. Once paid, you'll get the QR within an hour.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <a href="https://m.me/napai" target="_blank" rel="noreferrer">
                <Button size="lg" className="shadow-lg shadow-primary/20">Message us on Facebook</Button>
              </a>
              <a href="mailto:napaychristianpaolo@gmail.com">
                <Button size="lg" variant="outline">Email napaychristianpaolo@gmail.com</Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER — inspired by root site footer */}
      <footer className="bg-primary text-primary-foreground py-16 relative overflow-hidden mt-8">
        {/* Grid pattern background */}
        <div className="absolute inset-0 opacity-5" aria-hidden="true">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        {/* Soft glow accents */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary-foreground/5 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="w-8 h-8" />
                <span className="text-3xl font-bold tracking-tighter">QuanTab</span>
                <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary-foreground/15 border border-primary-foreground/20 uppercase tracking-wider">
                  by Nap.AI
                </span>
              </div>
              <p className="opacity-90 leading-relaxed max-w-md mb-6">
                Turn any Android tablet into a coin-operated kiosk in 5 minutes.
                Built specifically for Philippine vendo-shop owners — locked down, hands-off, lifetime from ₱300.
              </p>
              <div className="flex items-center space-x-4">
                {[Twitter, Linkedin, Github, Instagram].map((Icon, index) => (
                  <a
                    key={index}
                    href="#"
                    className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-all duration-300 hover:scale-110"
                    aria-label="Social link"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-bold text-lg mb-4">Product</h4>
              <ul className="space-y-3 opacity-90">
                <li><a href="#features" className="hover:underline hover:opacity-100 transition-opacity">Features</a></li>
                <li><a href="#how" className="hover:underline hover:opacity-100 transition-opacity">How it works</a></li>
                <li><a href="#pricing" className="hover:underline hover:opacity-100 transition-opacity">Pricing</a></li>
                <li><a href="#video" className="hover:underline hover:opacity-100 transition-opacity">Demo video</a></li>
                <li>
                  <Link to="/products/quantab/trial" className="hover:underline hover:opacity-100 transition-opacity">
                    3-day free trial
                  </Link>
                </li>
                <li>
                  <Link to="/products/quantab/setup" className="inline-flex items-center gap-1.5 hover:underline hover:opacity-100 transition-opacity">
                    <BookOpen className="w-3.5 h-3.5" />
                    Full setup guide
                  </Link>
                </li>
                <li>
                  <a
                    href="#download"
                    className="hover:underline hover:opacity-100 transition-opacity"
                    title="APK + ADB setup scripts for self-install."
                  >
                    Download &amp; ADB setup
                  </a>
                </li>
                <li>
                  <a
                    href={APK_DOWNLOAD_URL}
                    className="hover:underline hover:opacity-100 transition-opacity"
                    title="For existing customers — side-load updates onto an already-provisioned tablet."
                  >
                    APK only
                  </a>
                </li>
              </ul>
            </div>

            {/* Support / Legal */}
            <div>
              <h4 className="font-bold text-lg mb-4">Support</h4>
              <ul className="space-y-3 opacity-90">
                <li><a href="https://m.me/napai" target="_blank" rel="noreferrer" className="hover:underline hover:opacity-100 transition-opacity">Facebook Messenger</a></li>
                <li><a href="mailto:napaychristianpaolo@gmail.com" className="hover:underline hover:opacity-100 transition-opacity">napaychristianpaolo@gmail.com</a></li>
                <li><Link to="/" className="hover:underline hover:opacity-100 transition-opacity">Nap.AI home</Link></li>
                <li><a href="#" className="hover:underline hover:opacity-100 transition-opacity">Privacy Policy</a></li>
                <li><a href="#" className="hover:underline hover:opacity-100 transition-opacity">Terms of Service</a></li>
                <li><a href="#" className="hover:underline hover:opacity-100 transition-opacity">License Agreement</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-primary-foreground/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm opacity-90">
              <p>© {new Date().getFullYear()} Nap.AI Digital Solutions. QuanTab is a product of Napai.</p>
              <p>Engineered for the Philippine vendo-tablet hustle</p>
            </div>
          </div>
        </div>
      </footer>

      {/* FLOATING "JUST AVAILED" POPUP */}
      <AnimatePresence>
        {popupVisible && (
          <motion.div
            initial={{ opacity: 0, x: -40, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -40, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed bottom-5 left-5 z-40 max-w-xs"
          >
            <div className="relative flex items-start gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl p-3.5 pr-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-primary/20 inline-flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Bell className="w-3 h-3 text-primary" />
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">New purchase</p>
                </div>
                <p className="text-sm font-semibold leading-tight truncate">{buyer.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">just availed QuanTab · {buyer.time}</p>
              </div>
              <button
                onClick={() => setPopupVisible(false)}
                className="absolute top-2 right-2 w-5 h-5 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendotabLanding;
