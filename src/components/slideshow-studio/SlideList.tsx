import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Copy, Trash2, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import { backgroundCss, DeckSettings, Slide, SlideTextElement } from "@/lib/slideshow";

interface SlideListProps {
  slides: Slide[];
  settings: DeckSettings;
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string) => void;
  onReorder: (id: string, dir: -1 | 1) => void;
}

const SlideList = ({
  slides,
  settings,
  activeId,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onRename,
  onReorder,
}: SlideListProps) => {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-3">
        <span className="text-sm font-semibold">Slides</span>
        <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {slides.map((slide, i) => {
          const isActive = slide.id === activeId;
          const firstText = slide.elements.find(
            (e): e is SlideTextElement => e.type === "text" && !!e.text
          )?.text;
          return (
            <div
              key={slide.id}
              className={`group relative cursor-pointer rounded-lg border-2 p-2 transition-colors ${
                isActive ? "border-primary bg-muted/50" : "border-border hover:border-muted-foreground/40"
              }`}
              onClick={() => onSelect(slide.id)}
            >
              <div className="flex items-center gap-2">
                <div className="flex w-5 shrink-0 items-center justify-center text-xs font-semibold text-muted-foreground">
                  {i + 1}
                </div>
                <div
                  className="relative w-14 shrink-0 overflow-hidden rounded border border-border/60"
                  style={{ aspectRatio: `${settings.width} / ${settings.height}` }}
                >
                  <div className="absolute inset-0" style={backgroundCss(slide.background)} />
                  {firstText && (
                    <span className="absolute inset-0 flex items-center justify-center px-0.5 text-center text-[5px] leading-tight text-white">
                      {firstText.slice(0, 24)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{slide.name}</p>
                  <Badge variant="secondary" className="mt-0.5 text-[10px]">
                    {(slide.durationMs / 1000).toFixed(1)}s
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => onReorder(slide.id, -1)} disabled={i === 0}>
                      <ArrowUp className="mr-2 h-4 w-4" /> Move up
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onReorder(slide.id, 1)} disabled={i === slides.length - 1}>
                      <ArrowDown className="mr-2 h-4 w-4" /> Move down
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRename(slide.id)}>
                      <Pencil className="mr-2 h-4 w-4" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(slide.id)}>
                      <Copy className="mr-2 h-4 w-4" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(slide.id)}
                      disabled={slides.length <= 1}
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

export default SlideList;
