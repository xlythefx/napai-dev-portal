import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bot, Play, Video, Check, X, Loader2, LayoutTemplate } from "lucide-react";
import SlideList from "./SlideList";
import SlideControls from "./SlideControls";
import SlideRenderer from "./SlideRenderer";
import Timeline from "./Timeline";
import ChatSidebar, { type RunTurnArgs } from "@/components/ai-chat/ChatSidebar";
import { editDeckStream, type DeckEditScope } from "@/lib/slideshowAssistantApi";
import type { CopyModel } from "@/lib/copywriterApi";
import DeckPlayer from "./DeckPlayer";
import TemplatePickerDialog from "@/components/TemplatePickerDialog";
import { CanvasItem } from "@/lib/contentStudio";
import {
  DeckSettings,
  ShapeKind,
  Slide,
  SlideBackground,
  SlideElement,
  Slideshow,
  newImageElement,
  newShapeElement,
  newSlide,
  newTextElement,
  slideFromCanvasTemplate,
  uid,
} from "@/lib/slideshow";
import { exportDeckToWebm, downloadBlob } from "@/lib/webmExport";

interface SlideEditorProps {
  deck: Slideshow;
  onChange: (deck: Slideshow) => void;
  onBack: () => void;
}

const GOOGLE_FONTS = [
  "Montserrat:wght@300;400;500;600;700;800;900",
  "Inter:wght@300;400;500;600;700;800;900",
  "Roboto:wght@300;400;500;700;900",
  "Open+Sans:wght@300;400;500;600;700;800",
  "Lato:wght@300;400;700;900",
  "Poppins:wght@300;400;500;600;700;800;900",
  "Playfair+Display:wght@400;500;600;700;800;900",
  "Oswald:wght@300;400;500;600;700",
];

const SlideEditor = ({ deck, onChange, onBack }: SlideEditorProps) => {
  const { toast } = useToast();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [proj, setProj] = useState<Slideshow>(deck);
  const [activeSlideId, setActiveSlideId] = useState<string>(deck.slides[0]?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [aiModel, setAiModel] = useState<CopyModel>("sonnet");
  const [deckScope, setDeckScope] = useState<DeckEditScope>("deck");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pendingProposal, setPendingProposal] = useState<{ slides: Slide[]; ids: string[]; summary: string; replace: boolean } | null>(null);

  const [history, setHistory] = useState<SlideElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const stageWrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  const settings: DeckSettings = proj.settings;
  const activeSlide = proj.slides.find((s) => s.id === activeSlideId) ?? proj.slides[0];
  const selectedElement = activeSlide?.elements.find((e) => e.id === selectedId) ?? null;

  // Load Google fonts once.
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${GOOGLE_FONTS.map((f) => `family=${f}`).join("&")}&display=swap`;
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, []);

  // Debounced autosave to parent.
  useEffect(() => {
    const t = setTimeout(() => onChangeRef.current(proj), 300);
    return () => clearTimeout(t);
  }, [proj]);

  // Reset history + selection when switching slide.
  useEffect(() => {
    if (!activeSlide) return;
    setHistory([activeSlide.elements.map((e) => ({ ...e }))]);
    setHistoryIndex(0);
    setSelectedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlideId]);

  // Fit the stage to the viewport.
  useLayoutEffect(() => {
    const el = stageWrapRef.current;
    if (!el) return;
    const compute = () => {
      const pad = 48;
      const availW = el.clientWidth - pad;
      const availH = el.clientHeight - pad;
      if (availW <= 0 || availH <= 0) return;
      const s = Math.min(availW / settings.width, availH / settings.height);
      setScale(Math.max(0.05, Math.min(s, 1)));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [settings.width, settings.height]);

  // ---- mutation helpers ----
  const mutateActiveSlide = (fn: (s: Slide) => Slide) =>
    setProj((p) => ({ ...p, slides: p.slides.map((s) => (s.id === activeSlideId ? fn(s) : s)) }));

  const pushHistory = (els: SlideElement[]) => {
    setHistory((h) => {
      const next = h.slice(0, historyIndex + 1);
      next.push(els.map((e) => ({ ...e })));
      setHistoryIndex(next.length - 1);
      return next;
    });
  };

  const commitElements = (els: SlideElement[], record: boolean) => {
    mutateActiveSlide((s) => ({ ...s, elements: els }));
    if (record) pushHistory(els);
  };

  const updateElement = (id: string, patch: Partial<SlideElement>) => {
    if (!activeSlide) return;
    commitElements(
      activeSlide.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as SlideElement) : e)),
      false
    );
  };

  const commitHistory = () => {
    if (activeSlide) pushHistory(activeSlide.elements);
  };

  const addElement = (el: SlideElement) => {
    if (!activeSlide) return;
    const withZ = { ...el, zIndex: activeSlide.elements.reduce((m, e) => Math.max(m, e.zIndex), 0) + 1 };
    commitElements([...activeSlide.elements, withZ], true);
    setSelectedId(withZ.id);
  };

  const addText = () => addElement(newTextElement(settings));
  const addShape = (shape: ShapeKind) => addElement(newShapeElement(settings, shape));

  const addImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const probe = new Image();
      probe.onload = () => addElement(newImageElement(settings, src, probe.naturalWidth, probe.naturalHeight));
      probe.src = src;
    };
    reader.readAsDataURL(file);
  };

  const duplicateSelected = () => {
    if (!activeSlide || !selectedElement) return;
    const copy = { ...selectedElement, id: uid("el"), x: selectedElement.x + 24, y: selectedElement.y + 24 } as SlideElement;
    commitElements([...activeSlide.elements, copy], true);
    setSelectedId(copy.id);
  };

  const deleteSelected = () => {
    if (!activeSlide || !selectedElement) return;
    commitElements(activeSlide.elements.filter((e) => e.id !== selectedElement.id), true);
    setSelectedId(null);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    setHistoryIndex(idx);
    mutateActiveSlide((s) => ({ ...s, elements: history[idx].map((e) => ({ ...e })) }));
    setSelectedId(null);
  };

  const updateSlide = (patch: Partial<Slide>) => mutateActiveSlide((s) => ({ ...s, ...patch }));

  const setBackground = (patch: Partial<SlideBackground>) =>
    mutateActiveSlide((s) => ({ ...s, background: { ...s.background, ...patch } }));

  const onBackgroundImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setBackground({ type: "image", src: String(reader.result) });
    reader.readAsDataURL(file);
  };

  // ---- slide list ops ----
  const addSlide = () => {
    const s = newSlide(settings, `Slide ${proj.slides.length + 1}`);
    setProj((p) => ({ ...p, slides: [...p.slides, s] }));
    setActiveSlideId(s.id);
  };

  const addSlideFromTemplate = (canvas: CanvasItem) => {
    const s = slideFromCanvasTemplate(canvas, settings, `Slide ${proj.slides.length + 1}`);
    setProj((p) => ({ ...p, slides: [...p.slides, s] }));
    setActiveSlideId(s.id);
    setSelectedId(null);
    toast({ title: "Template added as a slide" });
  };

  const duplicateSlide = (id: string) => {
    setProj((p) => {
      const src = p.slides.find((s) => s.id === id);
      if (!src) return p;
      const clone: Slide = {
        ...src,
        id: uid("slide"),
        name: `${src.name} copy`,
        elements: src.elements.map((e) => ({ ...e, id: uid("el") })),
        background: { ...src.background },
      };
      const idx = p.slides.findIndex((s) => s.id === id);
      const slides = [...p.slides];
      slides.splice(idx + 1, 0, clone);
      setActiveSlideId(clone.id);
      return { ...p, slides };
    });
  };

  const deleteSlide = (id: string) => {
    setProj((p) => {
      if (p.slides.length <= 1) return p;
      const slides = p.slides.filter((s) => s.id !== id);
      if (id === activeSlideId) setActiveSlideId(slides[0].id);
      return { ...p, slides };
    });
  };

  const renameSlide = (id: string) => {
    const current = proj.slides.find((s) => s.id === id);
    const name = window.prompt("Slide name", current?.name ?? "");
    if (name && name.trim()) {
      setProj((p) => ({ ...p, slides: p.slides.map((s) => (s.id === id ? { ...s, name: name.trim() } : s)) }));
    }
  };

  const reorderSlide = (id: string, dir: -1 | 1) => {
    setProj((p) => {
      const idx = p.slides.findIndex((s) => s.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= p.slides.length) return p;
      const slides = [...p.slides];
      [slides[idx], slides[target]] = [slides[target], slides[idx]];
      return { ...p, slides };
    });
  };

  const previewSlide = () => {
    setSelectedId(null);
    setPreviewing(true);
    setPlayKey((k) => k + 1);
    window.setTimeout(() => setPreviewing(false), Math.max(1500, activeSlide.durationMs));
  };

  // ---- AI assistant (preview -> apply) ----
  const onProposal = (proposedSlides: Slide[], summary: string, ids: string[], replace: boolean) => {
    setSelectedId(null);
    setPendingProposal({ slides: proposedSlides, ids, summary, replace });
  };

  const applyProposal = () => {
    if (!pendingProposal) return;
    if (pendingProposal.replace) {
      // Full restructure (slides added/removed/reordered): replace the deck.
      const slides = pendingProposal.slides;
      setProj((p) => ({ ...p, slides }));
      if (!slides.some((s) => s.id === activeSlideId)) setActiveSlideId(slides[0]?.id);
      setPendingProposal(null);
      toast({ title: "Applied AI changes", description: `Deck now has ${slides.length} slide${slides.length === 1 ? "" : "s"}` });
      return;
    }
    const byId = new Map(pendingProposal.slides.map((s) => [s.id, s]));
    setProj((p) => ({ ...p, slides: p.slides.map((s) => byId.get(s.id) ?? s) }));
    const proposedActive = byId.get(activeSlideId);
    if (proposedActive) pushHistory(proposedActive.elements);
    setPendingProposal(null);
    toast({ title: "Applied AI changes", description: `${pendingProposal.ids.length} slide${pendingProposal.ids.length === 1 ? "" : "s"} updated` });
  };

  const discardProposal = () => setPendingProposal(null);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    const safe = (proj.name || "slideshow").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "slideshow";
    toast({ title: "Recording video…", description: "Plays the deck once at full resolution. Keep this tab visible." });
    try {
      const blob = await exportDeckToWebm(proj);
      downloadBlob(blob, `${safe}.webm`);
      toast({ title: "Video exported", description: `${safe}.webm downloaded` });
    } catch (e) {
      toast({ title: "Export failed", description: String((e as Error)?.message || e), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (!activeSlide) return null;

  const proposedActive = pendingProposal
    ? pendingProposal.slides.find((s) => s.id === activeSlideId) ?? (pendingProposal.replace ? pendingProposal.slides[0] : undefined)
    : undefined;
  const displaySlide = proposedActive ?? activeSlide;
  const stageInteractive = !previewing && !pendingProposal;

  // Chat turn: stream a deck/slide edit and auto-apply it directly (no Apply gate).
  const runDeckTurn = (args: RunTurnArgs) =>
    editDeckStream(
      { instruction: args.instruction, scope: deckScope, targetSlideId: activeSlideId, deck: proj, history: [], model: aiModel, images: args.images, resume: args.resume },
      { onThinking: args.onThinking, onSession: args.onSession },
    ).then(({ summary, proposedSlides, replace }) => {
      if (replace) {
        setProj((p) => ({ ...p, slides: proposedSlides }));
        if (!proposedSlides.some((s) => s.id === activeSlideId)) setActiveSlideId(proposedSlides[0]?.id);
      } else {
        const byId = new Map(proposedSlides.map((s) => [s.id, s]));
        setProj((p) => ({ ...p, slides: p.slides.map((s) => byId.get(s.id) ?? s) }));
      }
      return { summary };
    });

  const deckScopeControls = (
    <div className="flex rounded-md border border-border p-0.5 text-[10px] font-medium">
      {([{ key: "slide", label: "Slide" }, { key: "deck", label: "Deck" }] as { key: DeckEditScope; label: string }[]).map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => setDeckScope(s.key)}
          className={`rounded px-1.5 py-0.5 ${deckScope === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex h-full">
      <div className="flex h-full min-w-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Slideshows
        </Button>
        <Input
          value={proj.name}
          onChange={(e) => setProj((p) => ({ ...p, name: e.target.value }))}
          className="h-9 max-w-[240px] font-medium"
        />
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTemplatesOpen(true)} className="rounded-full">
            <LayoutTemplate className="mr-1 h-4 w-4" /> Templates
          </Button>
          <Button variant="outline" size="sm" onClick={() => setChatCollapsed((v) => !v)} className="rounded-full">
            <Bot className="mr-1 h-4 w-4" /> AI Assistant
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPlayerOpen(true)} className="rounded-full">
            <Play className="mr-1 h-4 w-4" /> Play
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="rounded-full">
            {exporting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Video className="mr-1 h-4 w-4" />}
            Export video
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <aside className="w-60 shrink-0 border-r border-border">
          <SlideList
            slides={proj.slides}
            settings={settings}
            activeId={activeSlide.id}
            onSelect={setActiveSlideId}
            onAdd={addSlide}
            onDuplicate={duplicateSlide}
            onDelete={deleteSlide}
            onRename={renameSlide}
            onReorder={reorderSlide}
          />
        </aside>

        <main ref={stageWrapRef} className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-muted/30 p-6">
          {pendingProposal && (
            <div className="absolute left-1/2 top-4 z-10 flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 shadow-lg backdrop-blur">
              <span className="truncate text-sm font-medium">AI suggestion — preview</span>
              <Button size="sm" onClick={applyProposal} className="h-7 rounded-full">
                <Check className="mr-1 h-3.5 w-3.5" /> Apply
              </Button>
              <Button size="sm" variant="ghost" onClick={discardProposal} className="h-7 rounded-full">
                <X className="mr-1 h-3.5 w-3.5" /> Discard
              </Button>
            </div>
          )}
          <div
            style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}
            className={pendingProposal ? "rounded-sm ring-2 ring-primary" : ""}
          >
            <SlideRenderer
              slide={displaySlide}
              settings={settings}
              scale={scale}
              mode={previewing ? "play" : "edit"}
              playKey={playKey}
              selectedId={selectedId}
              interactive={stageInteractive}
              onSelect={setSelectedId}
              onElementChange={updateElement}
              onElementCommit={commitHistory}
            />
          </div>
        </main>

        <aside className="w-80 shrink-0 border-l border-border">
          <SlideControls
            element={selectedElement}
            onElementChange={(patch) => selectedElement && updateElement(selectedElement.id, patch)}
            onAddText={addText}
            onAddImage={addImage}
            onAddShape={addShape}
            onDuplicate={duplicateSelected}
            onDelete={deleteSelected}
            onUndo={undo}
            canUndo={historyIndex > 0}
            onPreview={previewSlide}
            slide={activeSlide}
            onSlideChange={updateSlide}
            onBackgroundChange={setBackground}
            onBackgroundImage={onBackgroundImage}
          />
        </aside>
      </div>

      <Timeline slide={displaySlide} selectedId={selectedId} onSelect={setSelectedId} />

      <DeckPlayer open={playerOpen} onOpenChange={setPlayerOpen} deck={proj} />

      <TemplatePickerDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        aspectRatio={settings.aspectRatio}
        title="Add a slide from a template"
        onPick={addSlideFromTemplate}
      />
      </div>

      <ChatSidebar
        projectType="slideshow"
        projectId={proj.id}
        title="AI Motion Designer"
        model={aiModel}
        onModelChange={setAiModel}
        runTurn={runDeckTurn}
        controls={deckScopeControls}
        placeholder={deckScope === "deck" ? "Build or restructure the deck… (e.g. a 5-slide promo)" : "Edit this slide — text, colors, animation…"}
        collapsed={chatCollapsed}
        onToggle={() => setChatCollapsed((v) => !v)}
      />
    </div>
  );
};

export default SlideEditor;
