// Right-rail library of draggable animation presets. Drag a chip onto a timeline
// clip to apply it, or click to apply to the currently selected clip. Mirrors
// TemplateLibrary's drag mechanic (dataTransfer key — here "presetId").

import React from "react";
import { Sparkles } from "lucide-react";
import { ANIMATION_PRESETS, type AnimationPreset } from "@/lib/remotion/animationPresets";

interface PresetLibraryProps {
  hasSelection: boolean;
  onApply: (presetId: string) => void; // apply to the selected clip
}

const GROUPS: { key: AnimationPreset["group"]; label: string }[] = [
  { key: "in", label: "In" },
  { key: "emphasis", label: "Emphasis" },
  { key: "out", label: "Out" },
];

const PresetLibrary: React.FC<PresetLibraryProps> = ({ hasSelection, onApply }) => {
  return (
    <div className="flex flex-col gap-3 p-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" /> Animation presets
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Drag onto a clip, or select a clip and click to apply.
      </p>

      {GROUPS.map((g) => {
        const presets = ANIMATION_PRESETS.filter((p) => p.group === g.key);
        if (!presets.length) return null;
        return (
          <div key={g.key} className="flex flex-col gap-1.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">{g.label}</div>
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("presetId", p.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => hasSelection && onApply(p.id)}
                  disabled={!hasSelection}
                  title={hasSelection ? `Apply "${p.label}" to the selected clip` : "Select a clip first, or drag onto a clip"}
                  className="flex cursor-grab flex-col items-start gap-0.5 rounded-md border border-border bg-card px-2 py-1.5 text-left transition hover:border-primary/60 hover:bg-muted active:cursor-grabbing disabled:cursor-grab disabled:opacity-90"
                >
                  <span className="text-[11px] font-medium text-foreground">{p.label}</span>
                  {p.hint && <span className="text-[9px] text-muted-foreground">{p.hint}</span>}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PresetLibrary;
