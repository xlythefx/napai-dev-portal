import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminGetStats } from "@/lib/adminApi";
import type { AdminStats } from "@/lib/adminApi";
import { FileText, Layers, Users, Loader2, ArrowRight, Sparkles } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminGetStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive py-8">
        <p>{error}</p>
      </div>
    );
  }

  const cards = [
    {
      title: "Documents",
      value: stats?.documents_count ?? 0,
      icon: FileText,
      path: "/admin/files",
      accent: "from-primary/20 to-primary/5",
      iconColor: "text-primary",
    },
    {
      title: "Chunks",
      value: stats?.chunks_count ?? 0,
      icon: Layers,
      path: "/admin/files",
      accent: "from-violet-500/20 to-violet-500/5",
      iconColor: "text-violet-500",
    },
    {
      title: "Developers",
      value: stats?.developers_count ?? 0,
      icon: Users,
      path: "/admin/developers",
      accent: "from-emerald-500/20 to-emerald-500/5",
      iconColor: "text-emerald-500",
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-xs font-medium mb-3">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="uppercase tracking-wider">Live</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">A snapshot of files, chunks, and developers across the workspace.</p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-4 mb-10">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
            >
              <Link to={card.path}>
                <Card className="group relative overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full">
                  <div className={`absolute -top-12 -right-12 w-36 h-36 rounded-full bg-gradient-to-br ${card.accent} blur-2xl opacity-70 group-hover:opacity-100 transition-opacity`} />
                  <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {card.title}
                    </CardTitle>
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.accent} inline-flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-4 h-4 ${card.iconColor}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <p className="text-4xl font-bold tabular-nums bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                      {card.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 group-hover:text-primary transition-colors">
                      View details
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </p>
                  </CardContent>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.3 }}
      >
      <Card className="relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/5 blur-3xl" />
        <CardHeader className="relative">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 inline-flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <CardTitle>Tools Control</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Jump straight into any tool. Files and chunks live under <Link to="/admin/files" className="underline underline-offset-2 hover:text-foreground">Files & Chunks</Link>.
          </p>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex flex-wrap gap-2">
            {[
              { to: "/tools/rag", label: "RAG Chatbot", primary: true },
              { to: "/tools/tiktok-affiliate", label: "TikTok Affiliate" },
              { to: "/tools/project-management", label: "Project Management" },
              { to: "/tools/ai-accounting", label: "AI Accounting" },
              { to: "/tools/prompt-enhancer", label: "Prompt Enhancer" },
              { to: "/tools/professional-paraphraser", label: "Professional Paraphraser" },
              { to: "/tools/finance", label: "Finance App" },
              { to: "/tools/content-shorts", label: "Content Shorts Creator" },
            ].map((t) => (
              <Link key={t.to} to={t.to}>
                <span
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm border transition-all ${
                    t.primary
                      ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/15 hover:border-primary/50"
                      : "bg-card border-border text-foreground/80 hover:bg-muted hover:text-foreground hover:border-foreground/20"
                  }`}
                >
                  {t.label}
                  <ArrowRight className="w-3 h-3 opacity-60" />
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;
