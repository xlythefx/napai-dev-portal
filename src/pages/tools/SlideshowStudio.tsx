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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Clapperboard, MoreVertical, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { confirm } from "@/components/ui/confirm-dialog";
import SlideEditor from "@/components/slideshow-studio/SlideEditor";
import { ASPECT_RATIOS, AspectRatio, DECK_SIZES, STARTER_DECKS, Slideshow, deckFromStarter, newDeck } from "@/lib/slideshow";
import {
  SlideshowPreview,
  SlideshowSummary,
  createSlideshow,
  deleteSlideshow,
  getSlideshow,
  listSlideshows,
  updateSlideshow,
} from "@/lib/slideshowApi";

function previewStyle(preview?: SlideshowPreview | null): React.CSSProperties {
  if (!preview) return { backgroundColor: "#1e293b" };
  const bg = preview.background;
  if (bg.type === "gradient") {
    return { backgroundImage: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})` };
  }
  return { backgroundColor: bg.color };
}

const SlideshowStudio = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const email = user?.email ?? "";

  const [slideshows, setSlideshows] = useState<SlideshowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Slideshow | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      setSlideshows(await listSlideshows(email));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load slideshows");
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = async (deck: Slideshow) => {
    setBusy(true);
    try {
      const id = await createSlideshow(email, deck.name, deck.settings, deck.slides);
      setActive({ ...deck, id });
    } catch (e) {
      toast({ title: "Couldn't create slideshow", description: String((e as Error)?.message || e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = async (id: string) => {
    setBusy(true);
    try {
      setActive(await getSlideshow(email, id));
    } catch (e) {
      toast({ title: "Couldn't open slideshow", description: String((e as Error)?.message || e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Delete this slideshow?", description: "This permanently removes the slideshow and all its slides. This cannot be undone.", confirmText: "Delete", tone: "danger" }))) return;
    try {
      await deleteSlideshow(email, id);
      refresh();
    } catch (e) {
      toast({ title: "Couldn't delete", description: String((e as Error)?.message || e), variant: "destructive" });
    }
  };

  const persist = useCallback(
    (deck: Slideshow) => {
      updateSlideshow(email, deck.id, { name: deck.name, settings: deck.settings, slides: deck.slides }).catch((e) => {
        console.error("Autosave failed", e);
      });
    },
    [email]
  );

  if (active) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-background">
        <SlideEditor
          key={active.id}
          deck={active}
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
                <span className="text-sm font-medium text-primary">Slideshow Studio</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tighter md:text-5xl">Your slideshows</h1>
              <p className="mt-2 text-muted-foreground">
                Create animated marketing videos from slides — motion, colors, transitions. Export to WebM.
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={busy} className="rounded-full">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  New slideshow
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Blank</DropdownMenuLabel>
                {ASPECT_RATIOS.map((ratio: AspectRatio) => (
                  <DropdownMenuItem key={ratio} onClick={() => create(newDeck("Untitled slideshow", ratio))}>
                    {DECK_SIZES[ratio].label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Templates</DropdownMenuLabel>
                {STARTER_DECKS.map((s) => (
                  <DropdownMenuItem key={s.id} onClick={() => create(deckFromStarter(s))}>
                    <div className="flex flex-col">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.description}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading slideshows…
            </div>
          ) : error ? (
            <Card className="flex flex-col items-center gap-3 p-12 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={refresh}>Retry</Button>
            </Card>
          ) : slideshows.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-3 border-2 border-dashed p-16 text-center">
              <Clapperboard className="h-10 w-10 text-muted-foreground" />
              <p className="text-lg font-medium">Create your first slideshow</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Pick a blank canvas or a template above. Add animated slides, refine with AI, then export a video.
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {slideshows.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="group cursor-pointer overflow-hidden transition-all hover:scale-[1.02]" onClick={() => handleOpen(s.id)}>
                    <div className="relative flex h-36 items-center justify-center" style={previewStyle(s.preview)}>
                      <span className="px-3 text-center text-sm font-semibold text-white drop-shadow">
                        {s.preview?.firstText ?? ""}
                      </span>
                      <div className="absolute right-2 top-2" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDelete(s.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(s.updated_at).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="secondary">
                        {s.slideCount} slide{s.slideCount === 1 ? "" : "s"} · {Math.round(s.durationMs / 1000)}s
                      </Badge>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <Link to="/tools">
              <Button variant="ghost" className="text-muted-foreground">← Back to Tools</Button>
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default SlideshowStudio;
