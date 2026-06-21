import { Button } from "@/components/ui/button";
import { Type, Image as ImageIcon, Lock, Unlock, Shapes } from "lucide-react";
import { CanvasItem } from "@/lib/contentStudio";

interface LayersPanelProps {
  canvas: CanvasItem;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleLock: (id: string) => void;
}

interface LayerRow {
  id: string;
  kind: "text" | "image" | "shape";
  label: string;
  locked: boolean;
}

const LayersPanel = ({ canvas, selectedId, onSelect, onToggleLock }: LayersPanelProps) => {
  // Top-of-stack first: text draws above shapes above images.
  // Reverse each group so visually-topmost items appear first.
  const rows: LayerRow[] = [
    ...[...canvas.textElements].reverse().map((e) => ({
      id: e.id,
      kind: "text" as const,
      label: e.text.trim().slice(0, 24) || "Text",
      locked: !!e.locked,
    })),
    ...[...(canvas.shapeElements ?? [])].reverse().map((e) => ({
      id: e.id,
      kind: "shape" as const,
      label: e.shapeType.charAt(0).toUpperCase() + e.shapeType.slice(1),
      locked: !!e.locked,
    })),
    ...[...(canvas.imageElements ?? [])].reverse().map((e) => ({
      id: e.id,
      kind: "image" as const,
      label: "Image",
      locked: !!e.locked,
    })),
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-3">
        <span className="text-sm font-semibold">Layers</span>
        <span className="text-xs text-muted-foreground">{rows.length}</span>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {rows.length === 0 && (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            No layers yet. Add a text, image, or shape layer.
          </p>
        )}
        {rows.map((row) => {
          const isActive = row.id === selectedId;
          const Icon = row.kind === "text" ? Type : row.kind === "shape" ? Shapes : ImageIcon;
          return (
            <div
              key={row.id}
              className={`group flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 transition-colors ${
                isActive ? "border-primary bg-muted/50" : "border-transparent hover:bg-muted/40"
              }`}
              onClick={() => onSelect(row.id)}
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span
                className={`min-w-0 flex-1 truncate text-sm ${
                  row.locked ? "text-muted-foreground" : ""
                }`}
              >
                {row.label}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className={`h-7 w-7 shrink-0 ${row.locked ? "text-primary" : "text-muted-foreground"}`}
                title={row.locked ? "Unlock layer" : "Lock layer"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLock(row.id);
                }}
              >
                {row.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LayersPanel;
