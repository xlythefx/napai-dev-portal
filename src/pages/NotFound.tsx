import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Search, Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen flex flex-col text-foreground overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 -z-20 bg-background" />
      <div
        className="absolute inset-0 -z-10 opacity-[0.04]"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-3xl -z-10 animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-emerald-500/10 blur-3xl -z-10 animate-pulse" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent,hsl(var(--background))_85%)]" />

      {/* Header */}
      <header className="border-b border-border/60 bg-background/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 group">
            <img src="/assets/logonew.png" alt="Nap.AI" className="w-8 h-8 object-contain group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold tracking-tighter">
              Nap<span className="text-primary">.AI</span>
            </span>
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Go back
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center max-w-xl"
        >
          {/* Big gradient 404 */}
          <motion.h1
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
            className="text-[8rem] md:text-[12rem] font-black leading-none tracking-tighter bg-gradient-to-br from-primary via-primary to-emerald-500 bg-clip-text text-transparent select-none"
          >
            404
          </motion.h1>

          {/* Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/15 text-xs font-semibold mb-5 -mt-2">
            <Compass className="w-3.5 h-3.5 text-primary" />
            <span className="uppercase tracking-wider">Lost in the system</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
            We couldn't find that page.
          </h2>
          <p className="text-muted-foreground md:text-lg mb-2 leading-relaxed">
            The link might be broken, or the page may have moved. Let's get you back to somewhere useful.
          </p>

          {/* Path display */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border/60 mb-8 max-w-full">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <code className="text-xs font-mono text-muted-foreground truncate" title={location.pathname}>
              {location.pathname}
            </code>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link to="/">
              <Button size="lg" className="rounded-full shadow-lg shadow-primary/20 group">
                <Home className="w-4 h-4 mr-2" />
                Back to home
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous page
            </Button>
          </div>

          {/* Quick links */}
          <div className="mt-10 pt-6 border-t border-border/40">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Or jump to</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {[
                { to: "/", label: "Home" },
                { to: "/products/quantab", label: "QuanTab" },
                { to: "/developer-portal", label: "Developer Portal" },
                { to: "/#contact", label: "Contact" },
              ].map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="px-3 py-1.5 text-xs rounded-full border border-border bg-card/60 backdrop-blur text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="border-t border-border/60 bg-background/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-5 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} Nap.AI Digital Solutions
        </div>
      </footer>
    </div>
  );
};

export default NotFound;
