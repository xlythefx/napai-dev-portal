import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Copy, Trash2, Pencil } from "lucide-react";
import { AspectRatio, ASPECT_RATIOS, CANVAS_SIZES, CanvasItem } from "@/lib/contentStudio";

interface CanvasListProps {
  canvases: CanvasItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: (ratio: AspectRatio) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string) => void;
}

function backgroundStyle(canvas: CanvasItem): React.CSSProperties {
  const bg = canvas.background;
  if (bg.type === "gradient") {
    return {
      backgroundImage: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})`,
      opacity: bg.opacity,
    };
  }
  if (bg.type === "image" && bg.src) {
    return { backgroundImage: `url(${bg.src})`, backgroundSize: "cover", opacity: bg.opacity };
  }
  return { backgroundColor: bg.color, opacity: bg.opacity };
}

const CanvasList = ({
  canvases,
  activeId,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onRename,
}: CanvasListProps) => {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-3">
        <span className="text-sm font-semibold">Canvases</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 rounded-full">
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ASPECT_RATIOS.map((ratio) => (
              <DropdownMenuItem key={ratio} onClick={() => onAdd(ratio)}>
                {CANVAS_SIZES[ratio].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {canvases.map((canvas, i) => {
          const isActive = canvas.id === activeId;
          const ratioH = (CANVAS_SIZES[canvas.aspectRatio].h / CANVAS_SIZES[canvas.aspectRatio].w) * 100;
          const firstText = canvas.textElements[0]?.text ?? "";
          return (
            <div
              key={canvas.id}
              className={`group relative cursor-pointer rounded-lg border-2 p-2 transition-colors ${
                isActive ? "border-primary bg-muted/50" : "border-border hover:border-muted-foreground/40"
              }`}
              onClick={() => onSelect(canvas.id)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="relative w-12 shrink-0 overflow-hidden rounded border border-border/60"
                  style={{ aspectRatio: `${CANVAS_SIZES[canvas.aspectRatio].w} / ${CANVAS_SIZES[canvas.aspectRatio].h}` }}
                >
                  <div className="absolute inset-0" style={backgroundStyle(canvas)} />
                  {firstText && (
                    <span className="absolute inset-0 flex items-center justify-center px-0.5 text-center text-[5px] leading-tight text-white">
                      {firstText.slice(0, 24)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{canvas.name}</p>
                  <Badge variant="secondary" className="mt-0.5 text-[10px]">
                    {canvas.aspectRatio}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => onRename(canvas.id)}>
                      <Pencil className="mr-2 h-4 w-4" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(canvas.id)}>
                      <Copy className="mr-2 h-4 w-4" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(canvas.id)}
                      disabled={canvases.length <= 1}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CanvasList;
