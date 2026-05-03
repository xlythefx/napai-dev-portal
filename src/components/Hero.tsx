import { Button } from "@/components/ui/button";
import { ArrowRight, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

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
      <FlickeringGrid
        className="absolute inset-0 z-0"
        squareSize={4}
        gridGap={8}
        color="hsl(var(--primary))"
        maxOpacity={0.06}
        flickerChance={0.08}
      />

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
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/15"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-xs font-medium tracking-wide uppercase">
                Digital Solutions Studio
              </span>
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

          {/* Right: hero illustration */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 relative"
          >
            <div className="relative w-full max-w-lg mx-auto">
              {/* glow behind image */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.15),transparent_60%)] blur-2xl" />

              <motion.img
                src="/isometric-images/hero.png"
                alt="Digital systems illustration"
                className="relative w-full h-auto object-contain drop-shadow-2xl"
                animate={{ y: [0, -10, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 6,
                  ease: "easeInOut",
                }}
              />

              {/* floating chip: automation status */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
                className="absolute bottom-4 left-0 sm:left-2 rounded-xl border border-border bg-background/95 backdrop-blur p-3 shadow-lg flex items-center gap-2.5"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground leading-tight">
                    agentic.flow
                  </p>
                  <p className="text-xs font-medium leading-tight">running</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
