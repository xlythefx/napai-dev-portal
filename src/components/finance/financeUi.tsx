import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useReducedMotion, type Variants } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus, type LucideIcon } from "lucide-react";

/* ============================================================
 *  Monochrome finance design language
 *  The whole app is grayscale (see index.css). These tokens keep
 *  every chart / KPI on the same black-&-white ramp.
 * ============================================================ */

export const INK = {
  fg: "#2b2b2b",   // softened near-black (was #0a0a0a) — easier on the eyes
  g800: "#363636",
  g700: "#474747",
  g600: "#565656",
  g500: "#777777",
  g400: "#a3a3a3",
  g300: "#d4d4d4",
  g200: "#e5e5e5",
  g100: "#f5f5f5",
  grid: "#eeeeee",
  axis: "#9ca3af",
};

/** Dark→light ramp for pies / multi-series, distinguishable in pure B&W. */
export const MONO_RAMP = [
  "#2e2e2e", "#474747", "#606060", "#797979",
  "#929292", "#ababab", "#c8c8c8", "#e2e2e2",
];

export const fmt = (n: number, d = 2) =>
  n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

/* ---- Balance privacy ("Hide Balances") ---- */

const MaskContext = createContext(false);
export const MaskProvider = MaskContext.Provider;
export const useMask = () => useContext(MaskContext);
export const MASK = "••••";

/** A monetary figure that collapses to •••• when balances are hidden. */
export function Money({
  value, prefix = "", decimals = 2, className,
}: {
  value: number; prefix?: string; decimals?: number; className?: string;
}) {
  const masked = useMask();
  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}{masked ? MASK : fmt(value, decimals)}
    </span>
  );
}

export const shortMonth = (m: string) => {
  if (!m) return m;
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1).toLocaleString("en", { month: "short", year: "2-digit" });
};

export const kFmt = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return `${v}`;
};

/* ---- Motion variants (respect reduced-motion via hook below) ---- */

export const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

/** Wraps a stagger container; collapses to no-motion when the user prefers it. */
export const MotionGrid = ({ className, children }: { className?: string; children: ReactNode }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={reduce ? undefined : containerVariants}
      initial={reduce ? false : "hidden"}
      animate={reduce ? false : "show"}
    >
      {children}
    </motion.div>
  );
};

export const MotionItem = ({ className, children }: { className?: string; children: ReactNode }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} variants={reduce ? undefined : itemVariants}>
      {children}
    </motion.div>
  );
};

/* ---- Count-up number ---- */

export function AnimatedNumber({
  value, decimals = 2, prefix = "", suffix = "", className, maskable = true,
}: {
  value: number; decimals?: number; prefix?: string; suffix?: string; className?: string;
  /** when true (default), this figure is hidden by the Hide-Balances toggle */
  maskable?: boolean;
}) {
  const reduce = useReducedMotion();
  const masked = useMask();
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (reduce || prev.current === value) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce]);

  if (masked && maskable) {
    return <span className={cn("tabular-nums", className)}>{prefix}{MASK}{suffix}</span>;
  }

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}{fmt(display, decimals)}{suffix}
    </span>
  );
}

/* ---- KPI / stat card ---- */

export interface DeltaInfo {
  /** signed percentage change, e.g. -12.4 */
  pct: number;
  /** lower is better (expense, burn) flips the good/bad reading */
  invert?: boolean;
  label?: string;
}

export function StatCard({
  icon: Icon, label, value, prefix = "", suffix = "", decimals = 2, sub, delta, accent = false, money = true,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  sub?: ReactNode;
  delta?: DeltaInfo;
  /** soft-dark hero card */
  accent?: boolean;
  /** when true (default) the value is hidden by Hide-Balances */
  money?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div variants={reduce ? undefined : itemVariants} whileHover={reduce ? undefined : { y: -3 }}>
      <Card
        className={cn(
          "relative overflow-hidden h-full transition-shadow duration-200 hover:shadow-[var(--shadow-medium)]",
          accent && "bg-neutral-800 text-neutral-50 border-neutral-800",
        )}
      >
        {/* top hairline accent */}
        <span className={cn("absolute inset-x-0 top-0 h-0.5", accent ? "bg-white/25" : "bg-neutral-700")} />
        <CardHeader className="pb-2">
          <CardDescription className={cn("flex items-center gap-2", accent && "text-neutral-300")}>
            <Icon className="w-4 h-4" /> {label}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono tracking-tight">
            <AnimatedNumber value={value} decimals={decimals} prefix={prefix} suffix={suffix} maskable={money} />
          </div>
          <div className="mt-1 flex items-center gap-2">
            {delta && <DeltaBadge {...delta} accent={accent} />}
            {sub && <p className={cn("text-xs", accent ? "text-neutral-400" : "text-muted-foreground")}>{sub}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function DeltaBadge({ pct, invert = false, label, accent = false }: DeltaInfo & { accent?: boolean }) {
  const flat = Math.abs(pct) < 0.05 || !isFinite(pct);
  const up = pct > 0;
  const good = flat ? true : invert ? !up : up;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        accent
          ? "bg-white/15 text-neutral-50"
          : good
            ? "bg-neutral-800 text-neutral-50"
            : "bg-muted text-foreground border border-border",
      )}
      title={label}
    >
      <Icon className="w-3 h-3" />
      {flat ? "0%" : `${Math.abs(pct).toFixed(1)}%`}
    </span>
  );
}

/* ---- Chart card frame with reveal + empty/loaded states ---- */

export function ChartCard({
  title, description, className, empty, emptyHint, children,
}: {
  title: string;
  description?: ReactNode;
  className?: string;
  empty?: boolean;
  emptyHint?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div variants={reduce ? undefined : itemVariants} className={className}>
      <Card className="h-full transition-shadow duration-200 hover:shadow-[var(--shadow-soft)]">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          {empty ? (
            <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
              {emptyHint ?? "No data yet"}
            </div>
          ) : children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ---- Monochrome recharts tooltip ---- */

export function MonoTooltip({
  active, payload, label, labelFormatter, valuePrefix = "PHP ",
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: Record<string, unknown> }>;
  label?: string | number;
  labelFormatter?: (l: string | number) => string;
  valuePrefix?: string;
}) {
  const masked = useMask();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background/95 backdrop-blur px-3 py-2 shadow-[var(--shadow-medium)]">
      {label != null && (
        <div className="mb-1 text-xs font-medium text-foreground">
          {labelFormatter ? labelFormatter(label) : String(label)}
        </div>
      )}
      <div className="space-y-0.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: p.color ?? INK.fg }} />
              {p.name}
            </span>
            <span className="font-mono font-medium tabular-nums text-foreground">
              {valuePrefix}{masked ? MASK : fmt(Number(p.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Loading skeletons ---- */

export const SkeletonCard = ({ lines = 1 }: { lines?: number }) => (
  <Card>
    <CardHeader className="pb-2">
      <div className="h-3 w-24 rounded bg-muted animate-pulse" />
    </CardHeader>
    <CardContent>
      <div className="h-7 w-32 rounded bg-muted animate-pulse" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="mt-2 h-2.5 w-20 rounded bg-muted animate-pulse" />
      ))}
    </CardContent>
  </Card>
);

export const SkeletonChart = ({ height = 220 }: { height?: number }) => (
  <Card>
    <CardHeader>
      <div className="h-4 w-32 rounded bg-muted animate-pulse" />
      <div className="mt-1 h-3 w-44 rounded bg-muted animate-pulse" />
    </CardHeader>
    <CardContent>
      <div className="rounded bg-muted animate-pulse" style={{ height }} />
    </CardContent>
  </Card>
);

/* ---- SVG diagonal-hatch pattern: differentiates a 2nd series without color ---- */

export const HatchDef = ({ id, color = INK.g500 }: { id: string; color?: string }) => (
  <defs>
    <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" fill="transparent" />
      <line x1="0" y1="0" x2="0" y2="6" stroke={color} strokeWidth="3" />
    </pattern>
  </defs>
);

/* ---- analytics helpers ---- */

/** signed % change from a→b; returns 0 when a is 0 to avoid Infinity noise. */
export const pctChange = (a: number, b: number) => (a === 0 ? (b === 0 ? 0 : 100) : ((b - a) / Math.abs(a)) * 100);
