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
import { Plus, Clapperboard, MoreVertical, Trash2, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { confirm } from "@/components/ui/confirm-dialog";
import VideoEditor from "@/components/video-studio/VideoEditor";
import CreateVideoDialog from "@/components/video-studio/CreateVideoDialog";
import { newProject } from "@/lib/remotion/defaults";
import type { AspectRatio, Project } from "@/lib/remotion/types";
import {
  VideoPreview,
  VideoSummary,
  createVideo,
  deleteVideo,
  getVideo,
  listVideos,
  updateVideo,
} from "@/lib/videosApi";

function previewStyle(preview?: VideoPreview | null): React.CSSProperties {
  if (!preview) return { backgroundColor: "#1e293b" };
  const bg = preview.background;
  if (bg.type === "gradient") {
    return { backgroundImage: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})` };
  }
  return { backgroundColor: bg.color };
}

const VideoStudio = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const email = user?.email ?? "";

  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      setVideos(await listVideos(email));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load videos");
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async (name: string, aspect: AspectRatio, starterTemplateId: string | null) => {
    setBusy(true);
    try {
      const p = newProject(name, aspect, starterTemplateId);
      const id = await createVideo(email, p);
      setCreateOpen(false);
      setActive({ ...p, id });
    } catch (e) {
      toast({ title: "Couldn't create video", description: String((e as Error)?.message || e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = async (id: string) => {
    setBusy(true);
    try {
      setActive(await getVideo(email, id));
    } catch (e) {
      toast({ title: "Couldn't open video", description: String((e as Error)?.message || e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Delete this video?", description: "This permanently removes the video and all its scenes. This cannot be undone.", confirmText: "Delete", tone: "danger" }))) return;
    try {
      await deleteVideo(email, id);
      refresh();
    } catch (e) {
      toast({ title: "Couldn't delete", description: String((e as Error)?.message || e), variant: "destructive" });
    }
  };

  const persist = useCallback(
    (p: Project) => {
      updateVideo(email, p.id, p).catch((e) => console.error("Autosave failed", e));
    },
    [email]
  );

  if (active) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-background">
        <VideoEditor
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
                <Clapperboard className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-primary">ReMotion AI Video Editor</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tighter md:text-5xl">Your videos</h1>
              <p className="mt-2 text-muted-foreground">
                Build scenes from vibe-coded Remotion templates, preview live, and render an MP4.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/tools/video-templates">
                <Button variant="outline" className="rounded-full">
                  <Sparkles className="mr-2 h-4 w-4" /> Templates
                </Button>
              </Link>
              <Button onClick={() => setCreateOpen(true)} disabled={busy} className="rounded-full">
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create Video
              </Button>
            </div>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading videos…
            </div>
          ) : error ? (
            <Card className="flex flex-col items-center gap-3 p-12 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={refresh}>Retry</Button>
            </Card>
          ) : videos.length === 0 ? (
            <Card
              className="flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-16 text-center hover:border-primary/50"
              onClick={() => setCreateOpen(true)}
            >
              <Clapperboard className="h-10 w-10 text-muted-foreground" />
              <p className="text-lg font-medium">Create your first video</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Build animated scenes from your canvas designs, then export an MP4.
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((v, i) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className="group cursor-pointer overflow-hidden transition-all hover:scale-[1.02]"
                    onClick={() => handleOpen(v.id)}
                  >
                    <div className="relative flex h-36 items-center justify-center" style={previewStyle(v.preview)}>
                      <span className="px-3 text-center text-sm font-semibold text-white drop-shadow">
                        {v.preview?.firstText ?? ""}
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
                              onClick={() => handleDelete(v.id)}
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
                        <p className="truncate font-medium">{v.name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(v.updated_at).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="secondary">
                        {v.sceneCount} scene{v.sceneCount === 1 ? "" : "s"}
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

      <CreateVideoDialog open={createOpen} onOpenChange={setCreateOpen} busy={busy} onCreate={handleCreate} />
    </div>
  );
};

export default VideoStudio;
