import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Shield, ArrowLeft, Lock, Mail } from "lucide-react";

const ADMIN_EMAIL = "admin@nap-ai.com";
const ADMIN_PASSWORD = "asdasd";

const ISOMETRIC_IMG = "/isometric-images/backend.png";

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const AdminLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      login(ADMIN_EMAIL, "Admin", "admin");
      navigate("/admin");
    } else {
      setError("Invalid admin credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.08, 0.03, 0.08],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            y: [0, -20, 0],
            opacity: [0.03, 0.06, 0.03],
          }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute top-1/2 right-1/3 w-64 h-64 bg-primary rounded-full blur-3xl"
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Main container */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-lg"
      >
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
        >
          {/* Top: Isometric image container */}
          <motion.div
            variants={item}
            className="relative bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-8 pb-4"
          >
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="absolute -top-1/2 -right-1/2 w-full h-full border border-primary/10 rounded-full"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-1/2 -left-1/2 w-3/4 h-3/4 border border-primary/10 rounded-full"
              />
            </div>
            <motion.div
              variants={item}
              className="relative flex justify-center"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <img
                src={ISOMETRIC_IMG}
                alt="Admin"
                className="w-48 h-48 md:w-56 md:h-56 object-contain drop-shadow-lg"
              />
            </motion.div>
            <motion.p
              variants={item}
              className="text-center text-sm text-muted-foreground mt-2"
            >
              Secure admin access
            </motion.p>
          </motion.div>

          {/* Bottom: Form */}
          <div className="p-8 pt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>

            <motion.div variants={item} className="flex items-center gap-3 mb-6">
              <motion.div
                className="p-3 rounded-xl bg-primary/10"
                whileHover={{ rotate: 5, scale: 1.05 }}
              >
                <Shield className="w-8 h-8 text-primary" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Admin Login</h1>
                <p className="text-sm text-muted-foreground">
                  Enter credentials to access the panel
                </p>
              </div>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div variants={item} className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="admin@nap-ai.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 pl-10"
                />
              </motion.div>
              <motion.div variants={item} className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pl-10"
                />
              </motion.div>
              {error && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-destructive"
                >
                  {error}
                </motion.p>
              )}
              <motion.div variants={item} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button type="submit" className="w-full h-12">
                  Sign in
                </Button>
              </motion.div>
            </form>

            <motion.p
              variants={item}
              className="text-xs text-muted-foreground mt-6 text-center"
            >
              Admin access only. Contact your administrator if you need access.
            </motion.p>
          </div>
        </motion.div>

        {/* Decorative dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex justify-center gap-2 mt-6"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-2 h-2 rounded-full bg-primary/40"
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
