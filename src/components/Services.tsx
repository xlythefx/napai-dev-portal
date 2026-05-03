import {
  Brain,
  Globe,
  Code,
  Shield,
  Zap,
  Target,
  Rocket,
  ArrowUpRight,
  Workflow,
  Palette,
  BookOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { IconCloud } from "@/components/ui/interactive-icon-cloud";

type Service = {
  icon: typeof Brain;
  title: string;
  description: string;
  category: "Build" | "Automate" | "Scale" | "Advise";
  span?: "wide" | "tall";
};

const services: Service[] = [
  {
    icon: Brain,
    title: "AI & Agentic Systems",
    description:
      "Custom agents, copilots, and pipelines that act on real business data — not chat toys.",
    category: "Automate",
    span: "wide",
  },
  {
    icon: Code,
    title: "Custom Software",
    description:
      "Bespoke platforms engineered for your workflows, integrations, and edge cases.",
    category: "Build",
  },
  {
    icon: Globe,
    title: "Web & Mobile",
    description:
      "Fast, accessible, beautifully crafted apps across every screen.",
    category: "Build",
  },
  {
    icon: Workflow,
    title: "AI Automation",
    description:
      "No-code and code-based automations that take repetitive work off your team's plate.",
    category: "Automate",
  },
  // IconCloud (square 2x2) is rendered between index 4 and 5 below
  {
    icon: Shield,
    title: "Security & Compliance",
    description:
      "Audit-ready foundations — SSO, RBAC, encryption, monitoring, the lot.",
    category: "Scale",
  },
  {
    icon: Zap,
    title: "Performance Engineering",
    description:
      "Profiling, optimization, and rework on systems that need to be faster.",
    category: "Scale",
  },
  {
    icon: Target,
    title: "Strategy & Discovery",
    description:
      "Workshops and roadmaps that align tech investment with business outcomes.",
    category: "Advise",
  },
  {
    icon: Rocket,
    title: "MVPs & Product Launches",
    description:
      "From zero to validated launch — fast iteration loops with real users.",
    category: "Build",
  },
  {
    icon: BookOpen,
    title: "Research Papers",
    description:
      "Technical writeups, white papers, and applied research — clear, sourced, and rigorous.",
    category: "Advise",
    span: "wide",
  },
  {
    icon: Palette,
    title: "Graphics Design",
    description:
      "Brand systems, UI design, marketing assets — visuals that look the part.",
    category: "Build",
  },
];

const techSlugs = [
  "typescript",
  "javascript",
  "dart",
  "java",
  "react",
  "flutter",
  "android",
  "html5",
  "css3",
  "nodedotjs",
  "express",
  "nextdotjs",
  "prisma",
  "amazonaws",
  "postgresql",
  "firebase",
  "nginx",
  "vercel",
  "testinglibrary",
  "jest",
  "cypress",
  "docker",
  "git",
  "jira",
  "github",
  "gitlab",
  "visualstudiocode",
  "androidstudio",
  "sonarqube",
  "figma",
];

const categoryStyles: Record<Service["category"], string> = {
  Build: "from-primary/15 to-transparent",
  Automate: "from-emerald-500/15 to-transparent",
  Scale: "from-blue-500/15 to-transparent",
  Advise: "from-amber-500/15 to-transparent",
};

const categoryDot: Record<Service["category"], string> = {
  Build: "bg-primary",
  Automate: "bg-emerald-500",
  Scale: "bg-blue-500",
  Advise: "bg-amber-500",
};

const ServiceCard = ({ service, index }: { service: Service; index: number }) => {
  const Icon = service.icon;
  const spanClass =
    service.span === "wide"
      ? "md:col-span-2"
      : service.span === "tall"
      ? "md:row-span-2"
      : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3) }}
      className={`group relative ${spanClass}`}
    >
      <div className="relative h-full overflow-hidden rounded-2xl border border-border bg-card hover:border-foreground/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${categoryStyles[service.category]} opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
        />

        <span className="absolute top-5 right-5 text-xs font-mono text-muted-foreground/60 tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="relative p-7 flex flex-col h-full min-h-[220px]">
          <div className="flex items-center gap-1.5 mb-5">
            <span className={`w-1.5 h-1.5 rounded-full ${categoryDot[service.category]}`} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {service.category}
            </span>
          </div>

          <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center mb-5 group-hover:bg-foreground group-hover:border-foreground transition-all duration-500">
            <Icon className="w-5 h-5 text-foreground group-hover:text-background transition-colors duration-500" />
          </div>

          <h3 className="text-xl font-bold tracking-tight mb-2 leading-tight">
            {service.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed flex-1">
            {service.description}
          </p>

          <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            <span>Learn more</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const TechCloudTile = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.6 }}
    className="relative md:col-span-2 md:row-span-2"
  >
    <div className="relative h-full overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm hover:border-foreground/30 transition-colors duration-500">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Tech we master
          </span>
        </div>
        <span className="text-xs font-mono text-muted-foreground/60 tabular-nums">
          {techSlugs.length}+
        </span>
      </div>

      <div className="relative w-full h-full flex items-center justify-center pt-8">
        <IconCloud iconSlugs={techSlugs} />
      </div>
    </div>
  </motion.div>
);

const Services = () => {
  return (
    <section
      id="services"
      className="py-32 bg-muted/20 relative overflow-hidden"
    >
      <FlickeringGrid
        className="absolute inset-0 z-0"
        squareSize={4}
        gridGap={8}
        color="hsl(var(--primary))"
        maxOpacity={0.04}
        flickerChance={0.08}
      />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.05),transparent_70%)] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/15 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs font-medium tracking-wide uppercase">
              What we do
            </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-5 tracking-tighter leading-tight">
            Services for teams that{" "}
            <span className="text-primary">build serious things</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            We build, automate, scale, and advise — across the full lifecycle of
            a digital system.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8">
            {(Object.keys(categoryDot) as Array<Service["category"]>).map((c) => (
              <div key={c} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${categoryDot[c]}`} />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {c}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bento grid with embedded tech cloud square */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 auto-rows-[minmax(220px,auto)]">
          {services.slice(0, 4).map((service, index) => (
            <ServiceCard key={service.title} service={service} index={index} />
          ))}
          <TechCloudTile />
          {services.slice(4).map((service, index) => (
            <ServiceCard
              key={service.title}
              service={service}
              index={index + 4}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
