import { Button } from "@/components/ui/button";
import { ArrowRight, Phone, TrendingUp, Bot, Database, Cpu, Layout, Brain, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const Hero = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7 },
    },
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-background">
      {/* Background photo — shifted left so tablet reads on the left side */}
      <div
        className="absolute inset-0 z-0 bg-cover"
        style={{
          backgroundImage: "url('/assets/landing-hero.jpg')",
          backgroundPosition: "20% center",
        }}
        aria-hidden="true"
      />
      {/* Wash + gradient: stronger on the right to soften the sharp bright area */}
      <div className="absolute inset-0 z-0 bg-background/30 dark:bg-background/55" />
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-background/60 via-background/40 to-background/85" />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/30 via-transparent to-background/80" />

      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.07),transparent_60%)]" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--primary)/0.05),transparent_55%)]" />

      <div className="container relative z-10 mx-auto max-w-7xl px-4 py-32 lg:py-40">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center"
        >
          {/* Left: copy */}
          <div className="lg:col-span-7 space-y-8">
            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/products/quantab"
                className="group inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-gradient-to-r from-primary/15 via-emerald-500/15 to-primary/15 border border-primary/30 hover:border-primary/60 transition-colors"
              >
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-2.5 h-2.5" />
                  New
                </span>
                <span className="text-xs font-medium">
                  Looking for <span className="font-bold text-primary">QuanTab</span>? Coin-operated tablet kiosk — from ₱300
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-primary group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[1.05]"
            >
              We design, build, and ship{" "}
              <span className="text-primary">digital systems.</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed"
            >
              Customized systems, full AI agentic integrations, automation
              pipelines, and our own line of SaaS — engineered end-to-end for
              teams that need to move now.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2"
            >
              <a href="#contact">
                <Button size="lg" className="h-12 px-7 rounded-full group">
                  Book a Call
                  <Phone className="ml-2 w-4 h-4 group-hover:scale-110 transition-transform" />
                </Button>
              </a>
              <a href="#projects">
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-12 px-5 rounded-full group text-muted-foreground hover:text-foreground"
                >
                  See our work
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
            </motion.div>

            {/* Capability chips */}
            <motion.div variants={itemVariants} className="pt-6">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  "Customized Systems",
                  "AI Agentic Integration",
                  "Automation Pipelines",
                  "SaaS Products",
                ].map((label) => (
                  <span
                    key={label}
                    className="px-3 py-1.5 text-xs font-medium rounded-full border border-border bg-card/60 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: animated system diagram */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 relative"
          >
            <SystemDiagram />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

/* ---------- System diagram visual ---------- */

type NodeDef = {
  id: string;
  label: string;
  sub: string;
  icon: typeof Bot;
  x: number; // 0–100 (% inside the SVG viewbox 0..400)
  y: number; // 0–100 (% inside the SVG viewbox 0..400)
  accent: string;
};

const NODES: NodeDef[] = [
  { id: "agent", label: "AGENT", sub: "agentic.flow", icon: Bot, x: 18, y: 18, accent: "from-primary/30 to-primary/5" },
  { id: "api", label: "STACK", sub: "web · mobile · AI", icon: Cpu, x: 78, y: 22, accent: "from-violet-500/30 to-violet-500/5" },
  { id: "data", label: "DATA", sub: "vector + sql", icon: Database, x: 18, y: 78, accent: "from-emerald-500/30 to-emerald-500/5" },
  { id: "ui", label: "REACT", sub: "react · native", icon: Layout, x: 78, y: 78, accent: "from-amber-500/30 to-amber-500/5" },
];

const LINKS: [string, string][] = [
  ["agent", "api"],
  ["agent", "data"],
  ["api", "ui"],
  ["data", "ui"],
  ["agent", "ui"],
];

const SystemDiagram = () => {
  const find = (id: string) => NODES.find((n) => n.id === id)!;

  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square">
      {/* background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.18),transparent_60%)] blur-3xl" />

      {/* concentric rings */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 80, ease: "linear" }}
        className="absolute inset-[8%] rounded-full border border-dashed border-primary/20"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 110, ease: "linear" }}
        className="absolute inset-[18%] rounded-full border border-dashed border-primary/15"
      />
      <div className="absolute inset-[32%] rounded-full border border-primary/10" />

      {/* center pulse */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground inline-flex items-center justify-center shadow-2xl shadow-primary/30">
          <span className="absolute inset-0 rounded-2xl bg-primary animate-ping opacity-25" />
          <Brain className="w-7 h-7 md:w-8 md:h-8 relative" />
        </div>
        <p className="text-center mt-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          NAP.AI
        </p>
      </div>

      {/* connector lines */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <defs>
          <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {LINKS.map(([from, to], i) => {
          const a = find(from);
          const b = find(to);
          return (
            <g key={`${from}-${to}`}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="url(#line-grad)"
                strokeWidth="0.4"
                strokeDasharray="1.5 1.5"
                vectorEffect="non-scaling-stroke"
              />
              {/* moving dot */}
              <motion.circle
                r="0.9"
                fill="hsl(var(--primary))"
                initial={{ opacity: 0 }}
                animate={{
                  cx: [a.x, b.x],
                  cy: [a.y, b.y],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.5,
                }}
              />
            </g>
          );
        })}
      </svg>

      {/* nodes */}
      {NODES.map((n, i) => {
        const Icon = n.icon;
        return (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.12, duration: 0.5 }}
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                repeat: Infinity,
                duration: 3.5 + i * 0.4,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
              className="group relative"
            >
              <div className={`absolute -inset-3 bg-gradient-to-br ${n.accent} rounded-2xl blur-xl opacity-70`} />
              <div className="relative flex items-center gap-2.5 rounded-xl border border-border bg-background/95 backdrop-blur-md px-3 py-2.5 shadow-xl hover:border-primary/40 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-primary/10 inline-flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground leading-tight">
                    {n.label}
                  </p>
                  <p className="text-xs font-semibold leading-tight whitespace-nowrap">{n.sub}</p>
                </div>
                <span className="relative flex h-1.5 w-1.5 ml-1">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
              </div>
            </motion.div>
          </motion.div>
        );
      })}

      {/* floating solutions-shipped chip */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
        className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-xl border border-border bg-background/95 backdrop-blur p-2.5 pr-3.5 shadow-xl flex items-center gap-2"
      >
        <div className="w-7 h-7 rounded-lg bg-primary/10 inline-flex items-center justify-center">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <p className="text-[9px] font-mono text-muted-foreground leading-tight uppercase tracking-wider">
            solutions delivered
          </p>
          <p className="text-xs font-semibold leading-tight">20+ shipped</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Hero;
