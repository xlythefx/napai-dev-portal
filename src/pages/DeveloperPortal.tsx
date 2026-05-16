import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const DeveloperPortal = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // If already authed, skip the welcome and go straight to /tools.
  useEffect(() => {
    if (isAuthenticated) navigate("/tools", { replace: true });
  }, [isAuthenticated, navigate]);

  return (
    <div className="relative h-screen flex flex-col text-foreground overflow-hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 -z-20 bg-background" />
      <div className="fixed -top-32 -left-32 w-[28rem] h-[28rem] bg-primary/15 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="fixed -bottom-32 -right-32 w-[28rem] h-[28rem] bg-emerald-500/10 rounded-full blur-3xl -z-10 animate-pulse" />
      <div
        className="fixed inset-0 -z-10 opacity-[0.04]"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Header */}
      <header className="border-b border-border/60 bg-background/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 group">
            <img src="/assets/logonew.png" alt="Nap.AI" className="w-8 h-8 object-contain group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold tracking-tighter">
              Nap<span className="text-primary">.AI</span>
            </span>
            <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
              Developer Portal
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="hidden sm:inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
            <Link to="/auth">
              <Button size="sm" className="rounded-full">Sign in</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative flex-1 flex items-center justify-center">
        {/* HERO */}
        <section className="max-w-6xl mx-auto px-4 py-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold mb-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="uppercase tracking-wider">Welcome, builder</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[1.05] mb-6">
              Your{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-emerald-500 bg-clip-text text-transparent">
                Developer Portal
              </span>
              <br />
              for shipping real systems.
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-8">
              Sign in to access the dashboards, AI tools, and automations the Nap.AI team
              has built for your projects — all in one place, all wired to your work.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link to="/auth">
                <Button size="lg" className="group rounded-full shadow-lg shadow-primary/20 px-7 h-12">
                  Sign in to portal
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="/#contact">
                <Button size="lg" variant="outline" className="rounded-full h-12">
                  Request access
                </Button>
              </a>
            </div>

            <p className="text-xs text-muted-foreground mt-4 inline-flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              Invite-only · ask your admin or the Nap.AI team
            </p>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-background/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Nap.AI Digital Solutions — Developer Portal</span>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-foreground transition-colors">nap-ai.com</Link>
            <a href="/#contact" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DeveloperPortal;
