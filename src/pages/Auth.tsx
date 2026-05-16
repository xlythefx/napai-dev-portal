import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { developersLogin } from "@/lib/adminApi";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  Lock,
  LogIn,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Workflow,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

const Auth = () => {
  const { toast } = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || "/tools";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { developer } = await developersLogin({ email: email.trim(), password });
      const uniId = developer.uni_id ?? developer.id;
      login(developer.email, developer.name ?? undefined, developer.role, developer.id, uniId);
      toast({ title: "Welcome back!" });
      navigate(from, { replace: true });
    } catch (err) {
      toast({
        title: "Login failed",
        description: err instanceof Error ? err.message : "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const valueProps = [
    {
      icon: Workflow,
      title: "Built for builders",
      desc: "Tools designed for teams shipping real systems, not demos.",
    },
    {
      icon: Zap,
      title: "Move fast, stay sharp",
      desc: "AI assists where it helps; you stay in control of the work.",
    },
    {
      icon: ShieldCheck,
      title: "Secure by default",
      desc: "Role-based access, audit trails, zero shared credentials.",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden text-foreground">
      {/* Backdrop */}
      <div className="absolute inset-0 -z-20 bg-background" />
      {/* subtle grid */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.04]"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      {/* glow blobs */}
      <div className="absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full bg-primary/15 blur-3xl -z-10 animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-[32rem] h-[32rem] rounded-full bg-emerald-500/10 blur-3xl -z-10 animate-pulse" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent,hsl(var(--background))_85%)]" />

      <div className="relative z-10 min-h-screen grid grid-cols-1 lg:grid-cols-2">
        {/* Left: brand panel */}
        <div className="hidden lg:flex relative flex-col justify-center p-12 xl:p-16 border-r border-border/50">
          <Link
            to="/developer-portal"
            className="absolute top-8 left-12 xl:left-16 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm">Back to portal</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8 max-w-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10 overflow-hidden p-1.5">
                <img src="/assets/logonew.png" alt="Nap.AI" className="w-full h-full object-contain" />
              </div>
              <span className="text-2xl font-bold tracking-tighter">
                Nap<span className="text-primary">.AI</span>
              </span>
              <span className="ml-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                Developer Portal
              </span>
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <Sparkles className="w-3 h-3" /> Welcome back, builder
              </div>
              <h1 className="text-4xl xl:text-5xl font-bold tracking-tighter leading-[1.1]">
                Sign in to your{" "}
                <span className="bg-gradient-to-r from-primary via-primary to-emerald-500 bg-clip-text text-transparent">
                  workspace.
                </span>
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Access the tools, dashboards, and automations we&apos;ve built
                for your team — all in one place.
              </p>
            </div>

            <ul className="space-y-4 pt-2">
              {valueProps.map((v, i) => (
                <motion.li
                  key={v.title}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-start gap-3 group"
                >
                  <div className="mt-0.5 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                    <v.icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{v.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {v.desc}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>

            <div className="flex items-center gap-4 pt-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> SSO ready</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Audit logs</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Role-based</span>
            </div>
          </motion.div>

          <p className="absolute bottom-8 left-12 xl:left-16 text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Nap.AI Digital Solutions
          </p>
        </div>

        {/* Right: form */}
        <div className="flex items-center justify-center p-6 sm:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            {/* Mobile-only brand */}
            <div className="lg:hidden flex items-center justify-between mb-8">
              <Link
                to="/developer-portal"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back</span>
              </Link>
              <div className="flex items-center gap-2">
                <img src="/assets/logonew.png" alt="Nap.AI" className="w-6 h-6 object-contain" />
                <span className="text-lg font-bold tracking-tighter">
                  Nap<span className="text-primary">.AI</span>
                </span>
              </div>
            </div>

            {/* Form card */}
            <div className="relative rounded-3xl border border-border/60 bg-card/70 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-primary/5 overflow-hidden">
              {/* card glow */}
              <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

              <div className="relative">
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/60 inline-flex items-center justify-center shadow-lg shadow-primary/30 relative">
                    <span className="absolute inset-0 rounded-2xl bg-primary animate-ping opacity-20" />
                    <LogIn className="w-5 h-5 text-primary-foreground relative" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
                    <p className="text-xs text-muted-foreground">
                      Use your Nap.AI portal credentials
                    </p>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-5 mt-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Email
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        autoFocus
                        className="h-12 pl-10 text-base bg-background/60 border-border focus-visible:border-primary/50 focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Password
                      </label>
                      <a
                        href="/#contact"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        Forgot?
                      </a>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="h-12 pl-10 pr-10 text-base bg-background/60 border-border focus-visible:border-primary/50 focus-visible:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-full text-base group shadow-lg shadow-primary/20"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                        />
                        Signing in...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Sign in
                        <LogIn className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    )}
                  </Button>
                </form>

                <div className="space-y-3 pt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/60" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card/70 px-3 text-muted-foreground tracking-wider backdrop-blur">
                        Need access?
                      </span>
                    </div>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Contact your admin or{" "}
                    <a
                      href="/#contact"
                      className="text-foreground font-semibold hover:text-primary transition-colors underline-offset-2 hover:underline"
                    >
                      book a call
                    </a>{" "}
                    to get started.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-[11px] text-muted-foreground mt-6 inline-flex items-center justify-center gap-1.5 w-full">
              <ShieldCheck className="w-3 h-3" />
              Secured with role-based access · all sessions audit-logged
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
