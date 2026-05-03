import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
  Wallet,
  MessageSquare,
  Video,
  ArrowRight,
  LogOut,
  Sparkles,
  FolderKanban,
  Calculator,
  Film,
  Wand2,
  Quote,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const tools = [
  {
    id: "rag",
    title: "RAG Chatbot",
    description: "Learn faster. Upload your docs and get instant, accurate answers from your own knowledge base.",
    icon: MessageSquare,
    path: "/tools/rag",
    color: "from-violet-500/20 to-purple-500/20 border-violet-500/30",
  },
  {
    id: "tiktok",
    title: "TikTok Affiliate AI Agent",
    description: "Create 15-sec marketing videos with model + product images.",
    icon: Video,
    path: "/tools/tiktok-affiliate",
    color: "from-pink-500/20 to-rose-500/20 border-pink-500/30",
  },
  {
    id: "project-management",
    title: "Project Management Tool",
    description: "Plan, track, and collaborate on projects with tasks and milestones.",
    icon: FolderKanban,
    path: "/tools/project-management",
    color: "from-sky-500/20 to-blue-500/20 border-sky-500/30",
  },
  {
    id: "ai-accounting",
    title: "AI Accounting Tool",
    description: "Smart bookkeeping, invoice tracking, and financial insights.",
    icon: Calculator,
    path: "/tools/ai-accounting",
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
  },
  {
    id: "finance",
    title: "Finance App",
    description: "Track expenses, income, and budgets with smart analytics.",
    icon: Wallet,
    path: "/tools/finance",
    color: "from-green-500/20 to-emerald-500/20 border-green-500/30",
  },
  {
    id: "prompt-enhancer",
    title: "Prompt Enhancer",
    description: "Turn vague ideas into crystal-clear AI prompts. No more 'make it good' — make it great.",
    icon: Wand2,
    path: "/tools/prompt-enhancer",
    color: "from-amber-500/20 to-yellow-500/20 border-amber-500/30",
  },
  {
    id: "professional-paraphraser",
    title: "Professional Paraphraser",
    description: "Talk to your boss, clients, and freelancers like a pro. Casual to corporate in one click.",
    icon: Quote,
    path: "/tools/professional-paraphraser",
    color: "from-indigo-500/20 to-blue-500/20 border-indigo-500/30",
  },
  {
    id: "time-tracker",
    title: "Time Tracker",
    description: "Track work hours with auto screenshots and idle detection. Desktop app coming soon.",
    icon: Clock,
    path: "/tools/time-tracker",
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
  },
  {
    id: "content-shorts",
    title: "Content Shorts Creator AI Agent",
    description: "AI-powered short-form video creation for TikTok, Reels, and YouTube Shorts.",
    icon: Film,
    path: "/tools/content-shorts",
    color: "from-orange-500/20 to-amber-500/20 border-orange-500/30",
  },
];

const Tools = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-24 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12"
          >
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">Tools Hub</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                Select a Tool
              </h1>
              <p className="text-muted-foreground mt-2">
                Choose from our suite of AI-powered business tools
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user?.email}
              </span>
              <Button variant="outline" size="sm" onClick={logout} className="rounded-full">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {tools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link to={tool.path}>
                    <Card
                      className={`group h-full border-2 bg-gradient-to-br ${tool.color} hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden`}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="p-3 rounded-xl bg-background/50">
                            <Icon className="w-8 h-8 text-primary" />
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </div>
                        <CardTitle className="text-xl">{tool.title}</CardTitle>
                        <CardDescription className="text-base">
                          {tool.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <span className="text-sm font-medium text-primary group-hover:underline">
                          Open →
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <Link to="/">
              <Button variant="ghost" className="text-muted-foreground">
                ← Back to Home
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Tools;
