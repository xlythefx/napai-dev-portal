// Save the current scene as a reusable preset. Name + AI-suggested editable tags
// (auto-suggested from the scene's contents when opened). The actual serialization
// + media-stripping happens in VideoEditor; this dialog just collects name/tags.

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, X, Loader2 } from "lucide-react";
import { suggestTags } from "@/lib/videoTemplatesApi";
import type { CopyModel } from "@/lib/copywriterApi";

interface SavePresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  summary: string; // scene text/layers, for AI tag suggestion
  model: CopyModel;
  saving: boolean;
  onSave: (name: string, tags: string[]) => void;
}

const SavePresetDialog = ({ open, onOpenChange, defaultName, summary, model, saving, onSave }: SavePresetDialogProps) => {
  const [name, setName] = useState(defaultName);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  // Reset + auto-suggest tags whenever (re)opened.
  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setTags([]);
    setTagInput("");
    let cancelled = false;
    setSuggesting(true);
    suggestTags({ name: defaultName, summary, model })
      .then((t) => { if (!cancelled) setTags(t); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSuggesting(false); });
    return () => { cancelled = true; };
  }, [open, defaultName, summary, model]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t) setTags((xs) => (xs.includes(t) ? xs : [...xs, t]));
    setTagInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save scene as preset</DialogTitle>
          <DialogDescription>Reusable by the AI later. Media is reset to placeholders.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bold intro title" />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Tags</label>
              {suggesting && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> suggesting…
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border p-1.5">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                  {t}
                  <button type="button" onClick={() => setTags((xs) => xs.filter((x) => x !== t))} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
                  else if (e.key === "Backspace" && !tagInput && tags.length) setTags((xs) => xs.slice(0, -1));
                }}
                placeholder={tags.length ? "Add tag…" : "Tags — Enter or comma"}
                className="h-7 min-w-[120px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => onSave(name.trim() || defaultName, tags)} disabled={saving}>
              {saving ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving…</> : <><Sparkles className="mr-1 h-4 w-4" /> Save preset</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SavePresetDialog;
