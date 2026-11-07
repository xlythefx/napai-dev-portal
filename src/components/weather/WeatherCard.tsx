import { ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shell every panel on the weather page sits in.
 *
 * Each panel owns its own loading, error and stale states so one dead upstream
 * never blanks the page — the rain answer must survive PAGASA being down.
 */
export interface WeatherCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Rendered at the top-right — usually a timestamp or severity chip. */
  aside?: ReactNode;
  isLoading?: boolean;
  error?: unknown;
  /** Shown instead of an error when the upstream is down but cached data exists. */
  stale?: boolean;
  /** Message used when `error` is set. */
  errorMessage?: string;
  className?: string;
  /** Optional so a panel can render as a pure loading or error state. */
  children?: ReactNode;
}

export const WeatherCard = ({
  title,
  subtitle,
  icon,
  aside,
  isLoading,
  error,
  stale,
  errorMessage = "This source could not be reached.",
  className,
  children,
}: WeatherCardProps) => (
  <section
    className={cn(
      "glass-panel rounded-2xl p-5 sm:p-6 transition-colors duration-200 hover:border-foreground/30",
      className
    )}
  >
    <header className="flex items-start justify-between gap-4 mb-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          {icon}
          {title}
        </h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {aside && <div className="shrink-0 text-right">{aside}</div>}
    </header>

    {isLoading ? (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    ) : error ? (
      <div className="flex items-start gap-2 py-4 text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warn-orange" />
        <span>{errorMessage}</span>
      </div>
    ) : (
      <>
        {stale && (
          <p className="mb-3 flex items-start gap-2 glass-inset rounded-xl px-3 py-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-warn-yellow" />
            The source is not responding — showing the last reading we received.
          </p>
        )}
        {children}
      </>
    )}
  </section>
);

/** Small label/value row used inside several panels. */
export const StatRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-border/60 last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm font-medium tabular-nums">{value}</span>
  </div>
);
