import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Lock,
  Snowflake,
  Timer,
  QrCode,
  Cloud,
  Smartphone,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Play,
  BookOpen,
} from "lucide-react";

const featurePills = [
  { icon: Lock, label: "Kiosk lockdown" },
  { icon: Snowflake, label: "DeepFreeze" },
  { icon: Timer, label: "Idle auto-reset" },
  { icon: QrCode, label: "QR provisioning" },
  { icon: Cloud, label: "Remote license control" },
  { icon: Smartphone, label: "Coin-timer ready" },
];

const QuantabPromo = () => {
  return (
    <section id="quantab" className="relative isolate py-20 md:py-28 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 -z-10 bg-center bg-cover"
        style={{ backgroundImage: "url('/vendo/image-background.jpg')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 -z-10 bg-background/90 backdrop-blur-sm" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/70 to-background" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/15 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10" />

      <div className="container mx-auto max-w-6xl px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div data-aos="fade-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold mb-5">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="uppercase tracking-wider">Our SaaS · QuanTab</span>
            </div>

            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5 leading-[1.05]">
              Turn any tablet into a{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-emerald-500 bg-clip-text text-transparent">
                coin-operated kiosk
              </span>{" "}
              in 5 minutes
            </h2>

            <p className="text-muted-foreground text-lg mb-7 leading-relaxed max-w-xl">
              QuanTab is our flagship tablet-SaaS product — the launcher Philippine vendo-shop owners
              trust to lock customers into Play Store, games, and browsing, all paid by the minute,
              hands-off.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 mb-7">
              {featurePills.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-border bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:text-foreground transition-colors"
                >
                  <Icon className="w-3.5 h-3.5 text-primary" />
                  {label}
                </span>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-3 flex-wrap mb-6">
              <Link to="/products/quantab">
                <Button size="lg" className="shadow-lg shadow-primary/20 group">
                  Explore QuanTab
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/products/quantab/trial">
                <Button size="lg" variant="outline" className="backdrop-blur-sm group">
                  <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Try free for 3 days
                </Button>
              </Link>
            </div>

            <p className="text-xs text-muted-foreground mb-5">
              Lifetime license from ₱300 · No monthly fees · Avg ₱8,000/month per tablet
            </p>

            {/* Setup guide teaser */}
            <Link
              to="/products/quantab/setup"
              className="group inline-flex items-center gap-3 rounded-2xl border border-border bg-card/60 backdrop-blur-sm px-4 py-3 hover:border-primary/40 hover:bg-card/80 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 inline-flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Full setup guide</p>
                <p className="text-sm font-medium leading-tight">From factory-reset to first coin in ~5 minutes</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
          </div>

          {/* Right: Visual stack */}
          <div data-aos="fade-left" data-aos-delay="100" className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/25 via-transparent to-emerald-500/15 blur-3xl" />

            {/* Main image */}
            <motion.div
              initial={{ y: 0 }}
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <img
                src="/vendo/isometric.png"
                alt="QuanTab tablet kiosk ecosystem"
                className="relative w-full h-auto drop-shadow-2xl"
              />
            </motion.div>

            {/* Floating earnings chip */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="absolute top-6 -left-2 md:left-4 rounded-2xl border border-border bg-background/95 backdrop-blur-md p-3 pr-4 shadow-2xl flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 inline-flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground leading-tight">
                  Avg monthly
                </p>
                <p className="text-sm font-bold leading-tight">₱8,000 / tablet</p>
              </div>
            </motion.div>

            {/* Floating lockdown chip */}
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-8 -right-2 md:right-4 rounded-2xl border border-border bg-background/95 backdrop-blur-md p-3 pr-4 shadow-2xl flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/15 inline-flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground leading-tight">
                  Customer escapes
                </p>
                <p className="text-sm font-bold leading-tight">Zero · Locked</p>
              </div>
            </motion.div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default QuantabPromo;
