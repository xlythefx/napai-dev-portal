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
              From custom platforms and AI automation to our own SaaS products
              — built for teams that need to move now.
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

            {/* TODO: replace each placeholder with a real client/partner SVG */}
            <motion.div variants={itemVariants} className="pt-10 space-y-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Trusted by teams building with us
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-24 rounded-md border border-dashed border-border flex items-center justify-center text-[10px] uppercase tracking-wider text-muted-foreground/70 hover:text-foreground hover:border-foreground/40 transition-colors"
                  >
                    Your Logo
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: isometric placeholder */}
          {/* TODO: replace with real isometric illustration — drop image into src/assets/ and import here */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 relative"
          >
            <div className="relative aspect-[4/5] w-full max-w-md mx-auto rounded-3xl border border-border bg-card/40 backdrop-blur-sm shadow-xl overflow-hidden">
              {/* layered isometric stub */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  viewBox="0 0 200 200"
                  className="w-3/4 h-3/4"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  {/* base plane */}
                  <path
                    d="M100 150 L160 120 L100 90 L40 120 Z"
                    fill="hsl(var(--primary))"
                    fillOpacity="0.10"
                    stroke="hsl(var(--primary))"
                    strokeOpacity="0.25"
                  />
                  {/* mid plane */}
                  <path
                    d="M100 120 L160 90 L100 60 L40 90 Z"
                    fill="hsl(var(--primary))"
                    fillOpacity="0.20"
                    stroke="hsl(var(--primary))"
                    strokeOpacity="0.35"
                  />
                  {/* top plane */}
                  <path
                    d="M100 90 L160 60 L100 30 L40 60 Z"
                    fill="hsl(var(--primary))"
                    fillOpacity="0.40"
                    stroke="hsl(var(--primary))"
                    strokeOpacity="0.5"
                  />
                  {/* connector lines */}
                  <line
                    x1="100"
                    y1="30"
                    x2="100"
                    y2="150"
                    stroke="hsl(var(--primary))"
                    strokeOpacity="0.3"
                    strokeDasharray="2 4"
                  />
                </svg>
              </div>

              {/* gradient sheen */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />

              {/* floating chip: dashboard */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute top-6 right-6 rounded-xl border border-border bg-background/90 backdrop-blur p-3 shadow-lg w-36"
              >
                <p className="text-[10px] font-mono text-muted-foreground mb-2">
                  dashboard.tsx
                </p>
                <div className="flex items-end gap-1 h-8">
                  <div className="flex-1 bg-primary/30 rounded-sm" style={{ height: "40%" }} />
                  <div className="flex-1 bg-primary/50 rounded-sm" style={{ height: "70%" }} />
                  <div className="flex-1 bg-primary/40 rounded-sm" style={{ height: "55%" }} />
                  <div className="flex-1 bg-primary rounded-sm" style={{ height: "100%" }} />
                  <div className="flex-1 bg-primary/60 rounded-sm" style={{ height: "80%" }} />
                </div>
              </motion.div>

              {/* floating chip: automation */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
                className="absolute bottom-8 left-6 rounded-xl border border-border bg-background/90 backdrop-blur p-3 shadow-lg flex items-center gap-2.5"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground leading-tight">
                    automation
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
