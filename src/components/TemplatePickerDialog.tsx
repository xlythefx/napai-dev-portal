import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CanvasItem } from "@/lib/contentStudio";
import { TemplateSummary, getTemplate, listTemplates } from "@/lib/templatesApi";

interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aspectRatio?: string;
  title?: string;
  onPick: (canvas: CanvasItem) => void;
}

const TemplatePickerDialog = ({ open, onOpenChange, aspectRatio, title = "Choose a template", onPick }: TemplatePickerDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const email = user?.email ?? "";
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickingId, setPickingId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listTemplates({ user_email: email, aspect_ratio: aspectRatio })
      .then(setTemplates)
      .catch((e) => toast({ title: "Couldn't load templates", description: String((e as Error)?.message || e), variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [open, email, aspectRatio, toast]);

  const pick = async (id: number) => {
    setPickingId(id);
    try {
      const { canvas } = await getTemplate({ id, user_email: email });
      onPick(canvas);
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Couldn't load template", description: String((e as Error)?.message || e), variant: "destructive" });
    } finally {
      setPickingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : templates.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No templates yet.</p>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => pick(t.id)}
                disabled={pickingId === t.id}
                className="overflow-hidden rounded-lg border border-border text-left transition-colors hover:border-primary"
              >
                <div
                  className="relative flex h-24 items-center justify-center"
                  style={
                    t.preview?.background?.type === "gradient"
                      ? { backgroundImage: `linear-gradient(${t.preview.background.gradientAngle}deg, ${t.preview.background.gradientFrom}, ${t.preview.background.gradientTo})` }
                      : { backgroundColor: t.preview?.background?.color ?? "#1e293b" }
                  }
                >
                  <span className="px-2 text-center text-xs font-semibold text-white drop-shadow">
                    {t.preview?.firstText ?? t.name}
                  </span>
                  {pickingId === t.id && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="truncate text-sm font-medium">{t.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{t.aspect_ratio}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TemplatePickerDialog;
