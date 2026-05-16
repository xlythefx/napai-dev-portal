import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, Info, ShieldAlert, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ConfirmTone = "default" | "danger" | "warning" | "info";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

let pushPending: ((c: PendingConfirm) => void) | null = null;

/**
 * Drop-in replacement for window.confirm — returns a Promise<boolean>
 * and renders a styled, animated modal instead of the native dialog.
 */
export const confirm = (opts: ConfirmOptions | string): Promise<boolean> => {
  const normalized: ConfirmOptions =
    typeof opts === "string" ? { title: opts } : opts;
  return new Promise((resolve) => {
    if (!pushPending) {
      // Fallback if host hasn't mounted yet — should never happen in practice.
      resolve(window.confirm(normalized.title));
      return;
    }
    pushPending({ ...normalized, resolve });
  });
};

const TONE_STYLES: Record<ConfirmTone, { icon: typeof AlertTriangle; iconBg: string; iconColor: string; btn: string }> = {
  default: {
    icon: Info,
    iconBg: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
    btn: "",
  },
  danger: {
    icon: Trash2,
    iconBg: "from-red-500/20 to-red-500/5",
    iconColor: "text-red-500",
    btn: "bg-red-500 hover:bg-red-600 text-white",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "from-amber-500/20 to-amber-500/5",
    iconColor: "text-amber-500",
    btn: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  info: {
    icon: ShieldAlert,
    iconBg: "from-cyan-500/20 to-cyan-500/5",
    iconColor: "text-cyan-500",
    btn: "",
  },
};

export const ConfirmHost = () => {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    pushPending = (c) => {
      setSubmitting(false);
      setPending(c);
    };
    return () => {
      pushPending = null;
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleResolve(false);
      if (e.key === "Enter") handleResolve(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const handleResolve = (value: boolean) => {
    if (!pending || submitting) return;
    if (value) setSubmitting(true);
    pending.resolve(value);
    // small delay so the spinner is visible before unmount on confirm
    setTimeout(() => {
      setPending(null);
      setSubmitting(false);
    }, value ? 120 : 0);
  };

  const tone = pending?.tone ?? "default";
  const T = TONE_STYLES[tone];
  const Icon = T.icon;

  return (
    <AnimatePresence>
      {pending && (
        <motion.div
          key="confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/70 backdrop-blur-md"
          onClick={() => handleResolve(false)}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            key="confirm-card"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="relative w-full max-w-md rounded-2xl border border-border/70 bg-card shadow-2xl shadow-primary/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* glow */}
            <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gradient-to-br ${T.iconBg} blur-3xl opacity-70 pointer-events-none`} />

            {/* close */}
            <button
              type="button"
              onClick={() => handleResolve(false)}
              disabled={submitting}
              className="absolute top-3 right-3 w-8 h-8 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative p-6 sm:p-7">
              <div className="flex items-start gap-4 mb-1">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${T.iconBg} inline-flex items-center justify-center shrink-0`}>
                  <Icon className={`w-6 h-6 ${T.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1 pt-1.5">
                  <h2 className="text-lg font-bold tracking-tight leading-snug pr-6">
                    {pending.title}
                  </h2>
                </div>
              </div>

              {pending.description && (
                <p className="text-sm text-muted-foreground leading-relaxed mt-2 ml-16">
                  {pending.description}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => handleResolve(false)}
                  disabled={submitting}
                  className="rounded-full"
                >
                  {pending.cancelText ?? "Cancel"}
                </Button>
                <Button
                  onClick={() => handleResolve(true)}
                  disabled={submitting}
                  className={`rounded-full shadow-lg ${T.btn || "shadow-primary/20"}`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Working…
                    </>
                  ) : (
                    pending.confirmText ?? "Confirm"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
