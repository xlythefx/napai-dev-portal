import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { developersLogin } from "@/lib/adminApi";
import { motion } from "framer-motion";
import {
  Brain,
  ArrowLeft,
  Mail,
  Lock,
  LogIn,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Workflow,
} from "lucide-react";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

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
    <div className="min-h-screen relative overflow-hidden bg-background">
      <FlickeringGrid
        className="absolute inset-0 z-0"
        squareSize={4}
        gridGap={8}
        color="hsl(var(--primary))"
        maxOpacity={0.05}
        flickerChance={0.08}
      />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.07),transparent_60%)]" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--primary)/0.05),transparent_55%)]" />

      <div className="relative z-10 min-h-screen grid grid-cols-1 lg:grid-cols-2">
        {/* Left: brand panel */}
        <div className="hidden lg:flex relative flex-col justify-center p-12 xl:p-16 border-r border-border/50">
          <Link
            to="/"
            className="absolute top-8 left-12 xl:left-16 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Home</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8 max-w-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <span className="text-2xl font-bold tracking-tighter">
                Nap<span className="text-primary">.AI</span>
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-bold tracking-tighter leading-[1.1]">
                Welcome back to your{" "}
                <span className="text-primary">workspace.</span>
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Sign in to access the tools, dashboards, and automations
                we&apos;ve built for your team.
              </p>
            </div>

            <ul className="space-y-5 pt-4">
              {valueProps.map((v, i) => (
                <motion.li
                  key={v.title}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="mt-0.5 w-9 h-9 rounded-lg bg-primary/5 border border-primary/15 flex items-center justify-center shrink-0">
                    <v.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{v.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {v.desc}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>
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
            className="w-full max-w-md space-y-8"
          >
            {/* Mobile-only brand */}
            <div className="lg:hidden flex items-center justify-between">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back</span>
              </Link>
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <span className="text-lg font-bold tracking-tighter">
                  Nap<span className="text-primary">.AI</span>
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Sign in</h2>
              <p className="text-muted-foreground text-sm">
                Enter your credentials to access your tools.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-12 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-12 pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                className="w-full h-12 rounded-full text-base group"
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
                    <LogIn className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    Sign in
                  </span>
                )}
              </Button>
            </form>

            <div className="space-y-3 pt-2">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground tracking-wider">
                    Need access?
                  </span>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Contact your admin or{" "}
                <a
                  href="/#contact"
                  className="text-foreground font-medium hover:text-primary transition-colors"
                >
                  book a call
                </a>{" "}
                to get started.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
