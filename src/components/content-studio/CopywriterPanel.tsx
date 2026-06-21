import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Copy, PlusSquare, Replace, Loader2, AlertTriangle, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  CopyContentType,
  CopyModel,
  CopyResult,
  generateCopy,
  getClaudeStatus,
} from "@/lib/copywriterApi";

interface CopywriterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasSelection: boolean;
  onInsertText: (text: string) => void;
  onReplaceSelected: (text: string) => void;
  onAddSlideCanvas: (headline: string, body: string) => void;
  onAddAllSlides: (slides: { headline: string; body: string }[]) => void;
}

const CONTENT_TYPES: { value: CopyContentType; label: string }[] = [
  { value: "caption", label: "Caption (post text)" },
  { value: "single", label: "Single image (headline + body)" },
  { value: "slides", label: "Slides (IG carousel)" },
];

const MODELS: { value: CopyModel; label: string }[] = [
  { value: "haiku", label: "Haiku — fast & cheap" },
  { value: "sonnet", label: "Sonnet — balanced" },
  { value: "opus", label: "Opus — highest quality" },
];

const CopywriterPanel = ({
  open,
  onOpenChange,
  hasSelection,
  onInsertText,
  onReplaceSelected,
  onAddSlideCanvas,
  onAddAllSlides,
}: CopywriterPanelProps) => {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState<CopyContentType>("slides");
  const [model, setModel] = useState<CopyModel>("haiku");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CopyResult | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getClaudeStatus().then((s) => {
      if (!cancelled) setAvailable(s.ok && s.loggedIn);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await generateCopy({ prompt, contentType, model });
      setResult(res);
    } catch (err) {
      toast({
        title: "Copywriter failed",
        description: String((err as Error)?.message || err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Copywriter
          </SheetTitle>
          <SheetDescription>
            Generate post copy with Claude (your local subscription — no API key).
          </SheetDescription>
        </SheetHeader>

        {available === false && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              Claude isn't reachable. Run the app with <code>npm run dev</code> and make sure
              you're signed in with <code>claude login</code>.
            </span>
          </div>
        )}

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Prompt / topic</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="e.g. 5 productivity tips for startup founders"
            />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Format</Label>
              <Select value={contentType} onValueChange={(v) => setContentType(v as CopyContentType)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Model</Label>
              <Select value={model} onValueChange={(v) => setModel(v as CopyModel)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Writing…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Generate
              </>
            )}
          </Button>
        </div>

        {result && (
          <>
            <Separator className="my-4" />
            <Results
              result={result}
              hasSelection={hasSelection}
              onCopy={copy}
              onInsert={onInsertText}
              onReplace={onReplaceSelected}
              onAddSlideCanvas={onAddSlideCanvas}
              onAddAllSlides={onAddAllSlides}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

function FieldRow({
  label,
  text,
  hasSelection,
  onCopy,
  onInsert,
  onReplace,
}: {
  label: string;
  text: string;
  hasSelection: boolean;
  onCopy: (t: string) => void;
  onInsert: (t: string) => void;
  onReplace: (t: string) => void;
}) {
  if (!text) return null;
  return (
    <div className="space-y-1.5 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" title="Copy" onClick={() => onCopy(text)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" title="Add as text layer" onClick={() => onInsert(text)}>
            <PlusSquare className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title="Replace selected layer"
            disabled={!hasSelection}
            onClick={() => onReplace(text)}
          >
            <Replace className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm">{text}</p>
    </div>
  );
}

function Results({
  result,
  hasSelection,
  onCopy,
  onInsert,
  onReplace,
  onAddSlideCanvas,
  onAddAllSlides,
}: {
  result: CopyResult;
  hasSelection: boolean;
  onCopy: (t: string) => void;
  onInsert: (t: string) => void;
  onReplace: (t: string) => void;
  onAddSlideCanvas: (headline: string, body: string) => void;
  onAddAllSlides: (slides: { headline: string; body: string }[]) => void;
}) {
  const rowProps = { hasSelection, onCopy, onInsert, onReplace };

  if (result.contentType === "caption") {
    return (
      <div className="space-y-3">
        <FieldRow label="Caption" text={result.data.caption} {...rowProps} />
        {result.data.hashtags?.length > 0 && (
          <div className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Hashtags
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title="Copy"
                onClick={() => onCopy(result.data.hashtags.join(" "))}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {result.data.hashtags.map((h, i) => (
                <Badge key={i} variant="secondary">
                  {h}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (result.contentType === "single") {
    return (
      <div className="space-y-3">
        <FieldRow label="Headline" text={result.data.headline} {...rowProps} />
        <FieldRow label="Subheadline" text={result.data.subheadline} {...rowProps} />
        <FieldRow label="Body" text={result.data.body} {...rowProps} />
      </div>
    );
  }

  // slides
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{result.data.slides.length} slides</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAddAllSlides(result.data.slides)}
          className="rounded-full"
        >
          <Layers className="mr-1 h-4 w-4" /> Add all as canvases
        </Button>
      </div>
      {result.data.slides.map((s, i) => (
        <div key={i} className="space-y-1.5 rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Slide {i + 1}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7"
              onClick={() => onAddSlideCanvas(s.headline, s.body)}
            >
              <PlusSquare className="mr-1 h-3.5 w-3.5" /> New canvas
            </Button>
          </div>
          <p className="text-sm font-semibold">{s.headline}</p>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{s.body}</p>
        </div>
      ))}
      <FieldRow label="Caption" text={result.data.caption} {...rowProps} />
    </div>
  );
}

export default CopywriterPanel;
