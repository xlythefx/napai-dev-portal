import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Sparkles } from "lucide-react";

type Section = "hero" | "partners" | "services" | "projects" | "testimonials" | "contact";

const MESSAGES: Record<Section, { title: string; body: string; emoji: string }> = {
  hero: {
    emoji: "👋",
    title: "Welcome to Nap.AI",
    body: "I'm your guide. Scroll down — I'll point things out as we go.",
  },
  partners: {
    emoji: "🤝",
    title: "Trusted partners",
    body: "These teams already ship with us. You'd be in good company.",
  },
  services: {
    emoji: "⚡",
    title: "What we build",
    body: "Custom systems, AI agents, automations, SaaS. Pick what you need — or all of it.",
  },
  projects: {
    emoji: "🚀",
    title: "Real work, shipped",
    body: "Browse what we've actually delivered. Not demos — production systems.",
  },
  testimonials: {
    emoji: "💬",
    title: "Hear it from them",
    body: "What clients say after we ship. Honest, unedited.",
  },
  contact: {
    emoji: "📞",
    title: "Ready to chat?",
    body: "Drop us a line and let's talk about your project.",
  },
};

const SECTION_ORDER: { id: Section; selector: string }[] = [
  { id: "hero", selector: "section" }, // first section is hero
  { id: "partners", selector: "#partners" },
  { id: "services", selector: "#services" },
  { id: "projects", selector: "#projects" },
  { id: "testimonials", selector: "[data-section='testimonials']" },
  { id: "contact", selector: "#contact" },
];

const AICompanion = () => {
  const [section, setSection] = useState<Section>("hero");
  const [open, setOpen] = useState(true);
  const [hasGreeted, setHasGreeted] = useState(false);

  // Detect which section is closest to the viewport center.
  useEffect(() => {
    const findActive = () => {
      const center = window.scrollY + window.innerHeight / 2;
      let active: Section = "hero";
      for (const { id, selector } of SECTION_ORDER) {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (!el) continue;
        const top = el.offsetTop;
        if (center >= top - 100) active = id;
      }
      setSection((prev) => (prev !== active ? active : prev));
    };

    findActive();
    window.addEventListener("scroll", findActive, { passive: true });
    window.addEventListener("resize", findActive);
    return () => {
      window.removeEventListener("scroll", findActive);
      window.removeEventListener("resize", findActive);
    };
  }, []);

  // Auto-open the bubble when the section changes (after the initial greeting).
  useEffect(() => {
    if (!hasGreeted) {
      // hide initial greeting after a few seconds
      const t = setTimeout(() => {
        setOpen(false);
        setHasGreeted(true);
      }, 5500);
      return () => clearTimeout(t);
    }
    setOpen(true);
    const t = setTimeout(() => setOpen(false), 4500);
    return () => clearTimeout(t);
  }, [section]); // eslint-disable-line react-hooks/exhaustive-deps

  const msg = MESSAGES[section];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
      {/* Speech bubble */}
      <AnimatePresence>
        {open && (
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="pointer-events-auto relative max-w-[260px] sm:max-w-[300px]"
          >
            <div className="relative rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl shadow-primary/10 p-3.5 pr-4">
              {/* glow */}
              <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 via-transparent to-emerald-500/20 rounded-2xl blur-md -z-10 opacity-60" />

              <button
                onClick={() => setOpen(false)}
                className="absolute top-2 right-2 w-5 h-5 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>

              <div className="flex items-start gap-2.5 pr-3">
                <div className="text-xl leading-none mt-0.5">{msg.emoji}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Sparkles className="w-2.5 h-2.5 text-primary" />
                    <p className="text-[9px] uppercase tracking-widest font-semibold text-primary/80">
                      Nap.AI Companion
                    </p>
                  </div>
                  <p className="text-sm font-semibold leading-snug">{msg.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{msg.body}</p>
                </div>
              </div>

              {/* tail */}
              <div className="absolute -bottom-1.5 right-7 w-3 h-3 bg-background border-r border-b border-border rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating bot */}
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        whileHover={{ scale: 1.1, rotate: -6 }}
        whileTap={{ scale: 0.92 }}
        aria-label="Toggle Nap.AI Companion"
        className="pointer-events-auto relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-2xl shadow-primary/30 inline-flex items-center justify-center group"
      >
        {/* halo */}
        <span className="absolute inset-0 rounded-2xl bg-primary animate-ping opacity-20" />
        {/* outer glow */}
        <span className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-primary/30 via-transparent to-emerald-500/20 blur-xl opacity-70 group-hover:opacity-100 transition-opacity" />

        <Bot className="w-6 h-6 sm:w-7 sm:h-7 relative" />

        {/* unread / live dot */}
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-70 animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
        </span>
      </motion.button>
    </div>
  );
};

export default AICompanion;
