// Pre-create chooser: pick aspect ratio + a starting template (or Blank), then
// create the video. Templates preview live at the chosen aspect ratio.

import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Square } from "lucide-react";
import TemplatePreviewCard from "./TemplatePreviewCard";
import { SEED_TEMPLATES } from "@/lib/remotion/seedTemplates";
import { ASPECT_DIMENSIONS, type AspectRatio } from "@/lib/remotion/types";

interface CreateVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onCreate: (name: string, aspect: AspectRatio, starterTemplateId: string | null) => void;
}

const ASPECTS: { key: AspectRatio; label: string; box: string }[] = [
  { key: "9:16", label: "Vertical 9:16", box: "h-12 w-[27px]" },
  { key: "1:1", label: "Square 1:1", box: "h-11 w-11" },
  { key: "16:9", label: "Landscape 16:9", box: "h-[27px] w-12" },
];

const CreateVideoDialog: React.FC<CreateVideoDialogProps> = ({ open, onOpenChange, busy, onCreate }) => {
  const [name, setName] = useState("Untitled video");
  const [aspect, setAspect] = useState<AspectRatio>("9:16");
  const [selected, setSelected] = useState<string | null>("tpl_kinetic_title"); // null = blank

  const dims = ASPECT_DIMENSIONS[aspect];
  const previewW = aspect === "16:9" ? 180 : aspect === "1:1" ? 130 : 96;
  const previewH = Math.round((dims.height / dims.width) * previewW);

  const create = () => {
    if (busy) return;
    onCreate(name.trim() || "Untitled video", aspect, selected);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New video</DialogTitle>
          <DialogDescription className="sr-only">Choose an aspect ratio and a starting template, then create the video.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Untitled video" />
          </div>

          {/* Aspect ratio */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Aspect ratio</label>
            <div className="grid grid-cols-3 gap-2">
              {ASPECTS.map((a) => {
                const active = aspect === a.key;
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => setAspect(a.key)}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition ${
                      active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex h-12 items-center justify-center">
                      <div className={`rounded-sm border-2 ${active ? "border-primary" : "border-muted-foreground/50"} ${a.box}`} />
                    </div>
                    <span className="text-xs font-medium">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Starting template */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Start from</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {/* Blank */}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={`flex flex-col overflow-hidden rounded-lg border text-left transition ${
                  selected === null ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-center bg-muted/40" style={{ height: previewH }}>
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Square className="h-5 w-5" />
                    <span className="text-[10px]">Blank</span>
                  </div>
                </div>
                <span className="truncate px-2 py-1.5 text-[11px] font-medium">Blank</span>
              </button>

              {SEED_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(t.id)}
                  className={`flex flex-col overflow-hidden rounded-lg border text-left transition ${
                    selected === t.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div style={{ height: previewH }}>
                    <TemplatePreviewCard
                      code={t.code}
                      props={t.previewProps}
                      width={dims.width}
                      height={dims.height}
                      durationInFrames={90}
                      className="h-full w-full"
                    />
                  </div>
                  <span className="truncate px-2 py-1.5 text-[11px] font-medium">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={create} disabled={busy} className="w-full rounded-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create video
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateVideoDialog;
