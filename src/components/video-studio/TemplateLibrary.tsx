// The template library: a grid of looping previews of the shared template
// library (built-in seeds + DB templates already used in this project + the rest
// of the shared DB library). Each card is a drag source (drop onto the timeline to
// add a clip) and has a quick "Add" button. Authoring/editing templates happens on
// the dedicated Template Studio page (the "Manage" action navigates there).

import React from "react";
import { Plus, GripVertical, Sparkles } from "lucide-react";
import TemplatePreviewCard from "./TemplatePreviewCard";
import type { Template } from "@/lib/remotion/types";

interface TemplateLibraryProps {
  templates: Template[];
  width: number;
  height: number;
  fps: number;
  onAddScene: (templateId: string) => void;
  onManage: () => void;
}

const TemplateLibrary: React.FC<TemplateLibraryProps> = ({ templates, width, height, fps, onAddScene, onManage }) => {
  const previewW = 150;
  const previewH = Math.round((height / width) * previewW);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Templates</span>
        <button
          type="button"
          onClick={onManage}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:opacity-90"
        >
          <Sparkles className="h-3 w-3" /> Manage
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {templates.length === 0 ? (
          <button
            type="button"
            onClick={onManage}
            className="flex w-full flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-border p-6 text-center text-muted-foreground hover:border-primary/50"
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-medium">Create a template</span>
            <span className="text-[10px]">Vibe-code one in the Template Studio</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {templates.map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("templateId", t.id);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className="group overflow-hidden rounded-lg border border-border bg-card"
                title="Drag onto the timeline to add"
              >
                <div className="relative" style={{ height: previewH }}>
                  <TemplatePreviewCard
                    code={t.code}
                    props={t.previewProps}
                    width={width}
                    height={height}
                    fps={fps}
                    durationInFrames={90}
                    className="h-full w-full"
                  />
                  <div className="pointer-events-none absolute left-1 top-1 rounded bg-black/50 p-0.5 text-white opacity-0 transition group-hover:opacity-100">
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                  <span className="truncate text-[11px] font-medium">{t.name}</span>
                  <button
                    type="button"
                    onClick={() => onAddScene(t.id)}
                    className="shrink-0 rounded p-1 text-primary hover:bg-muted"
                    aria-label="Add to timeline"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateLibrary;
