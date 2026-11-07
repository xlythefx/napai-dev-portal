import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneColor, toneText, type Tone } from "./tone";
import { Dot } from "./Dot";
import { WeatherIcon, type WeatherGlyph } from "./WeatherIcon";

export interface Answer {
  id: string;
  icon: ReactNode;
  /** The question this card answers, in plain words. */
  question: string;
  /** The answer, two or three words. This is the thing people read. */
  answer: string;
  /** One line of supporting detail. */
  detail: string;
  tone: Tone;
  /** Severity word shown beside the dot. */
  status: string;
  pulse?: boolean;
  /** Large animated glyph for the top-right corner. */
  glyph?: WeatherGlyph;
}

const spring = { type: "spring", stiffness: 260, damping: 26, mass: 0.8 } as const;

/**
 * The three questions this page exists to answer, given equal weight and made
 * scannable in one glance. Everything below them is supporting evidence.
 */
export const AnswerCards = ({
  answers,
  onSelect,
  activeId,
}: {
  answers: Answer[];
  onSelect?: (id: string) => void;
  activeId?: string | null;
}) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="grid gap-3 sm:grid-cols-3"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: reduceMotion ? 0 : 0.07 } } }}
    >
      {answers.map((a) => {
        const interactive = Boolean(onSelect);
        const active = activeId === a.id;
        return (
          <motion.button
            key={a.id}
            type="button"
            disabled={!interactive}
            onClick={() => onSelect?.(a.id)}
            variants={{
              hidden: { opacity: 0, y: reduceMotion ? 0 : 14, scale: reduceMotion ? 1 : 0.985 },
              show: { opacity: 1, y: 0, scale: 1, transition: spring },
            }}
            whileHover={interactive && !reduceMotion ? { y: -2 } : undefined}
            whileTap={interactive && !reduceMotion ? { scale: 0.99 } : undefined}
            transition={spring}
            aria-expanded={interactive ? active : undefined}
            className={cn(
              "glass-panel group relative overflow-hidden rounded-2xl p-5 text-left transition-[border-color,box-shadow] duration-300",
              interactive && "cursor-pointer hover:border-foreground/30",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active && "border-foreground/40 shadow-[0_12px_40px_-16px_hsl(0_0%_0%/0.25)]"
            )}
          >
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10"
              animate={{
                background: `radial-gradient(90% 70% at 100% 0%, ${toneColor(a.tone, active ? 0.22 : 0.14)} 0%, transparent 65%)`,
              }}
              transition={{ duration: reduceMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
            />

            {a.glyph && (
              <span
                aria-hidden
                className="pointer-events-none absolute -right-2 -top-2 opacity-[0.18] transition-opacity duration-300 group-hover:opacity-[0.28]"
                style={{ color: `hsl(var(--warn-${a.tone}))` }}
              >
                <WeatherIcon glyph={a.glyph} className="h-24 w-24" />
              </span>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-muted-foreground/80">{a.icon}</span>
                {a.question}
              </span>
              <Dot tone={a.tone} pulse={a.pulse} />
            </div>

            <motion.p
              key={a.answer}
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mt-3 text-2xl font-semibold leading-tight tracking-tight"
            >
              {a.answer}
            </motion.p>

            <p className={cn("mt-1 text-xs font-medium", toneText[a.tone])}>{a.status}</p>

            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{a.detail}</p>

            {interactive && (
              <span className="mt-3 inline-block text-[11px] text-muted-foreground/80 transition-colors duration-200 group-hover:text-foreground">
                {active ? "Hide details" : "See details"}
              </span>
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
};
