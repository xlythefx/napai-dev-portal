import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminGetStats } from "@/lib/adminApi";
import type { AdminStats } from "@/lib/adminApi";
import { FileText, Layers, Users, Loader2, ArrowRight } from "lucide-react";

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
    },
    {
      title: "Chunks",
      value: stats?.chunks_count ?? 0,
      icon: Layers,
      path: "/admin/files",
    },
    {
      title: "Developers",
      value: stats?.developers_count ?? 0,
      icon: Users,
      path: "/admin/developers",
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <motion.h1
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-3xl font-bold mb-8"
      >
        Dashboard
      </motion.h1>
      <div className="grid md:grid-cols-3 gap-6 mb-12">
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
                <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </CardTitle>
                    <Icon className="w-5 h-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      View details <ArrowRight className="w-3 h-3" />
                    </p>
                  </CardContent>
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
      <Card>
        <CardHeader>
          <CardTitle>Tools Control</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage tools. View uploaded files and chunks in the Files section.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Link to="/tools/rag">
              <span className="px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                RAG Chatbot
              </span>
            </Link>
            <Link to="/tools/tiktok-affiliate">
              <span className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                TikTok Affiliate
              </span>
            </Link>
            <Link to="/tools/project-management">
              <span className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                Project Management
              </span>
            </Link>
            <Link to="/tools/ai-accounting">
              <span className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                AI Accounting
              </span>
            </Link>
            <Link to="/tools/prompt-enhancer">
              <span className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                Prompt Enhancer
              </span>
            </Link>
            <Link to="/tools/professional-paraphraser">
              <span className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                Professional Paraphraser
              </span>
            </Link>
            <Link to="/tools/finance">
              <span className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                Finance App
              </span>
            </Link>
            <Link to="/tools/content-shorts">
              <span className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                Content Shorts Creator
              </span>
            </Link>
          </div>
        </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;
