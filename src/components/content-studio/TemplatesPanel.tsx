import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Trash2, Filter } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AspectRatio, CanvasItem } from "@/lib/contentStudio";
import {
  TemplatePreview,
  TemplateSummary,
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
} from "@/lib/templatesApi";

interface TemplatesPanelProps {
  activeRatio: AspectRatio;
  currentCanvas: CanvasItem;
  onApply: (templateCanvas: CanvasItem) => void;
}

function previewStyle(preview: TemplatePreview | null): React.CSSProperties {
  if (!preview) return { backgroundColor: "#1e293b" };
  const bg = preview.background;
  if (bg.type === "gradient") {
    return { backgroundImage: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})` };
  }
  return { backgroundColor: bg.color };
}

const TemplatesPanel = ({ activeRatio, currentCanvas, onApply }: TemplatesPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const email = user?.email ?? "";

  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyRatio, setOnlyRatio] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await listTemplates({ user_email: email, aspect_ratio: onlyRatio ? activeRatio : undefined }));
    } catch (e) {
      toast({ title: "Couldn't load templates", description: String((e as Error)?.message || e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [email, onlyRatio, activeRatio, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const apply = async (id: number) => {
    setBusyId(id);
    try {
      const { canvas } = await getTemplate({ id, user_email: email });
      onApply(canvas);
    } catch (e) {
      toast({ title: "Couldn't apply template", description: String((e as Error)?.message || e), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const saveCurrent = async () => {
    const name = window.prompt("Template name", currentCanvas.name);
    if (!name || !name.trim()) return;
    setSaving(true);
    try {
      await createTemplate({
        user_email: email,
        name: name.trim(),
        canvas_json: currentCanvas,
        aspect_ratio: currentCanvas.aspectRatio,
      });
      toast({ title: "Saved as template" });
      load();
    } catch (e) {
      toast({ title: "Couldn't save template", description: String((e as Error)?.message || e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteTemplate({ user_email: email, id });
      setTemplates((t) => t.filter((x) => x.id !== id));
    } catch (e) {
      toast({ title: "Couldn't delete", description: String((e as Error)?.message || e), variant: "destructive" });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 p-3">
        <Button
          size="sm"
          variant={onlyRatio ? "default" : "outline"}
          onClick={() => setOnlyRatio((v) => !v)}
          className="h-8 rounded-full"
          title="Filter to the current canvas ratio"
        >
          <Filter className="mr-1 h-3.5 w-3.5" /> {onlyRatio ? activeRatio : "All"}
        </Button>
        <Button size="sm" variant="outline" onClick={saveCurrent} disabled={saving} className="h-8 rounded-full">
          {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
          Save current
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : templates.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm text-muted-foreground">
            No templates {onlyRatio ? `for ${activeRatio}` : "yet"}. Save a canvas as a template to reuse it.
          </p>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="group overflow-hidden rounded-lg border border-border">
                <button
                  onClick={() => apply(t.id)}
                  disabled={busyId === t.id}
                  className="relative flex h-24 w-full items-center justify-center"
                  style={previewStyle(t.preview)}
                  title="Apply to selected canvas"
                >
                  <span className="px-2 text-center text-xs font-semibold text-white drop-shadow">
                    {t.preview?.firstText ?? t.name}
                  </span>
                  {busyId === t.id && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </span>
                  )}
                </button>
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge variant="secondary" className="text-[10px]">{t.aspect_ratio}</Badge>
                    {t.is_global ? (
                      <Badge variant="outline" className="text-[10px]">starter</Badge>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => remove(t.id)}
                        title="Delete template"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplatesPanel;
