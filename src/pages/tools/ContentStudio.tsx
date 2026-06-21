import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, PenTool, MoreVertical, Trash2, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { confirm } from "@/components/ui/confirm-dialog";
import Editor from "@/components/content-studio/Editor";
import { Project, newProject } from "@/lib/contentStudio";
import {
  ProjectPreview,
  ProjectSummary,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from "@/lib/projectsApi";

function previewStyle(preview?: ProjectPreview | null): React.CSSProperties {
  if (!preview) return { backgroundColor: "#1e293b" };
  const bg = preview.background;
  if (bg.type === "gradient") {
    return { backgroundImage: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})` };
  }
  return { backgroundColor: bg.color };
}

const ContentStudio = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const email = user?.email ?? "";

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      setProjects(await listProjects(email));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async () => {
    setBusy(true);
    try {
      const p = newProject();
      const id = await createProject(email, p.name, p.canvases);
      setActive({ ...p, id });
    } catch (e) {
      toast({ title: "Couldn't create project", description: String((e as Error)?.message || e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = async (id: string) => {
    setBusy(true);
    try {
      setActive(await getProject(email, id));
    } catch (e) {
      toast({ title: "Couldn't open project", description: String((e as Error)?.message || e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Delete this project?", description: "This permanently removes the project and all its canvases. This cannot be undone.", confirmText: "Delete", tone: "danger" }))) return;
    try {
      await deleteProject(email, id);
      refresh();
    } catch (e) {
      toast({ title: "Couldn't delete", description: String((e as Error)?.message || e), variant: "destructive" });
    }
  };

  const persist = useCallback(
    (project: Project) => {
      updateProject(email, project.id, { name: project.name, canvases: project.canvases }).catch((e) => {
        console.error("Autosave failed", e);
      });
    },
    [email]
  );

  if (active) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-background">
        <Editor
          key={active.id}
          project={active}
          onChange={persist}
          onBack={() => {
            setActive(null);
            refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="px-4 pb-24 pt-32">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
          >
            <div>
              <div className="mb-2 inline-flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-primary">Content Studio</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tighter md:text-5xl">Your projects</h1>
              <p className="mt-2 text-muted-foreground">
                Design IG slides &amp; LinkedIn images on a canvas, with templates and an AI assistant.
              </p>
            </div>
            <Button onClick={handleCreate} disabled={busy} className="rounded-full">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create Project
            </Button>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading projects…
            </div>
          ) : error ? (
            <Card className="flex flex-col items-center gap-3 p-12 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={refresh}>Retry</Button>
            </Card>
          ) : projects.length === 0 ? (
            <Card
              className="flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-16 text-center hover:border-primary/50"
              onClick={handleCreate}
            >
              <PenTool className="h-10 w-10 text-muted-foreground" />
              <p className="text-lg font-medium">Create your first project</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                A project holds multiple canvases (1:1, 16:9, 9:16). Edit each and export PNGs manually.
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className="group cursor-pointer overflow-hidden transition-all hover:scale-[1.02]"
                    onClick={() => handleOpen(p.id)}
                  >
                    <div className="relative flex h-36 items-center justify-center" style={previewStyle(p.preview)}>
                      <span className="px-3 text-center text-sm font-semibold text-white drop-shadow">
                        {p.preview?.firstText ?? ""}
                      </span>
                      <div className="absolute right-2 top-2" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDelete(p.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(p.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {p.canvasCount} canvas{p.canvasCount === 1 ? "" : "es"}
                      </Badge>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <Link to="/tools">
              <Button variant="ghost" className="text-muted-foreground">
                ← Back to Tools
              </Button>
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default ContentStudio;
