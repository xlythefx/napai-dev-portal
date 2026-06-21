import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Trash2,
  Undo2,
  Plus,
  Upload,
  ImagePlus,
  Square,
  Circle,
  Minus,
  Play,
} from "lucide-react";
import {
  ElementAnimation,
  EMPHASIS_ANIMATIONS,
  ENTER_ANIMATIONS,
  EXIT_ANIMATIONS,
  EASINGS,
  FONT_FAMILIES,
  FONT_WEIGHTS,
  ShapeKind,
  Slide,
  SlideBackground,
  SlideElement,
  SLIDE_TRANSITIONS,
  TextAlign,
} from "@/lib/slideshow";

interface SlideControlsProps {
  element: SlideElement | null;
  onElementChange: (patch: Partial<SlideElement>) => void;
  onAddText: () => void;
  onAddImage: (file: File) => void;
  onAddShape: (shape: ShapeKind) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onPreview: () => void;
  slide: Slide;
  onSlideChange: (patch: Partial<Slide>) => void;
  onBackgroundChange: (patch: Partial<SlideBackground>) => void;
  onBackgroundImage: (file: File) => void;
}

const ALIGNS: { value: TextAlign; icon: typeof AlignLeft }[] = [
  { value: "left", icon: AlignLeft },
  { value: "center", icon: AlignCenter },
  { value: "right", icon: AlignRight },
];

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 flex-1" />
      </div>
    </div>
  );
}

function labelize(s: string) {
  return s.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

const SlideControls = ({
  element,
  onElementChange,
  onAddText,
  onAddImage,
  onAddShape,
  onDuplicate,
  onDelete,
  onUndo,
  canUndo,
  onPreview,
  slide,
  onSlideChange,
  onBackgroundChange,
  onBackgroundImage,
}: SlideControlsProps) => {
  const bg = slide.background;
  const setAnim = (patch: Partial<ElementAnimation>) => {
    if (!element) return;
    onElementChange({ animation: { ...element.animation, ...patch } } as Partial<SlideElement>);
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4">
      {/* Layer actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onAddText} className="rounded-full">
          <Plus className="mr-1 h-4 w-4" /> Text
        </Button>
        <label>
          <span className="inline-flex h-8 cursor-pointer items-center rounded-full border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            <ImagePlus className="mr-1 h-4 w-4" /> Image
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onAddImage(file);
              e.target.value = "";
            }}
          />
        </label>
        <Button size="sm" variant="outline" onClick={() => onAddShape("rect")} className="rounded-full">
          <Square className="mr-1 h-4 w-4" /> Rect
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAddShape("circle")} className="rounded-full">
          <Circle className="mr-1 h-4 w-4" /> Circle
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAddShape("line")} className="rounded-full">
          <Minus className="mr-1 h-4 w-4" /> Line
        </Button>
        <Button size="sm" variant="outline" onClick={onDuplicate} disabled={!element} className="rounded-full">
          <Copy className="mr-1 h-4 w-4" /> Duplicate
        </Button>
        <Button size="sm" variant="outline" onClick={onDelete} disabled={!element} className="rounded-full">
          <Trash2 className="mr-1 h-4 w-4" /> Delete
        </Button>
        <Button size="sm" variant="ghost" onClick={onUndo} disabled={!canUndo} className="rounded-full">
          <Undo2 className="mr-1 h-4 w-4" /> Undo
        </Button>
      </div>

      <Separator />

      {/* Selected-element controls */}
      {element ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold capitalize">{element.type} element</h3>

          {element.type === "text" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Content</Label>
                <Textarea value={element.text} onChange={(e) => onElementChange({ text: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Font</Label>
                  <Select value={element.fontFamily} onValueChange={(v) => onElementChange({ fontFamily: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILIES.map((f) => (
                        <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Weight</Label>
                  <Select value={element.fontWeight} onValueChange={(v) => onElementChange({ fontWeight: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_WEIGHTS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Font size · {element.fontSize}px</Label>
                <Slider value={[element.fontSize]} min={8} max={400} step={1} onValueChange={([v]) => onElementChange({ fontSize: v })} />
              </div>
              <ColorField label="Color" value={element.color} onChange={(v) => onElementChange({ color: v })} />
              <div className="space-y-1.5">
                <Label className="text-xs">Alignment</Label>
                <div className="flex gap-1">
                  {ALIGNS.map(({ value, icon: Icon }) => (
                    <Button key={value} size="icon" variant={element.align === value ? "default" : "outline"} onClick={() => onElementChange({ align: value })} className="h-9 w-9">
                      <Icon className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Line height · {element.lineHeight}</Label>
                  <Slider value={[element.lineHeight]} min={0.8} max={2.5} step={0.05} onValueChange={([v]) => onElementChange({ lineHeight: v })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Letter spacing · {element.letterSpacing}px</Label>
                  <Slider value={[element.letterSpacing]} min={-10} max={40} step={1} onValueChange={([v]) => onElementChange({ letterSpacing: v })} />
                </div>
              </div>
            </>
          )}

          {element.type === "image" && (
            <>
              <p className="text-xs text-muted-foreground">Drag to move; drag the corner handles to resize.</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Fit</Label>
                <Select value={element.fit} onValueChange={(v) => onElementChange({ fit: v as "cover" | "contain" })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Cover</SelectItem>
                    <SelectItem value="contain">Contain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Corner radius · {element.borderRadius}px</Label>
                <Slider value={[element.borderRadius]} min={0} max={400} step={2} onValueChange={([v]) => onElementChange({ borderRadius: v })} />
              </div>
            </>
          )}

          {element.type === "shape" && (
            <>
              {element.shape !== "line" && (
                <ColorField label="Fill" value={element.fill} onChange={(v) => onElementChange({ fill: v })} />
              )}
              <ColorField label="Stroke" value={element.stroke} onChange={(v) => onElementChange({ stroke: v })} />
              <div className="space-y-1.5">
                <Label className="text-xs">Stroke width · {element.strokeWidth}px</Label>
                <Slider value={[element.strokeWidth]} min={0} max={60} step={1} onValueChange={([v]) => onElementChange({ strokeWidth: v })} />
              </div>
              {element.shape === "rect" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Corner radius · {element.borderRadius}px</Label>
                  <Slider value={[element.borderRadius]} min={0} max={400} step={2} onValueChange={([v]) => onElementChange({ borderRadius: v })} />
                </div>
              )}
            </>
          )}

          {/* Common geometry */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">X</Label>
              <Input type="number" value={Math.round(element.x)} onChange={(e) => onElementChange({ x: Number(e.target.value) })} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Y</Label>
              <Input type="number" value={Math.round(element.y)} onChange={(e) => onElementChange({ y: Number(e.target.value) })} className="h-9" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{element.type === "text" ? "Box width" : "Width"} · {Math.round(element.width)}px</Label>
              <Slider value={[element.width]} min={20} max={3000} step={5} onValueChange={([v]) => onElementChange({ width: v })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rotation · {element.rotation}°</Label>
              <Slider value={[element.rotation]} min={-180} max={180} step={1} onValueChange={([v]) => onElementChange({ rotation: v })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Opacity · {Math.round(element.opacity * 100)}%</Label>
            <Slider value={[element.opacity]} min={0} max={1} step={0.05} onValueChange={([v]) => onElementChange({ opacity: v })} />
          </div>

          <Separator />

          {/* Animation */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Animation</h3>
            <Button size="sm" variant="ghost" onClick={onPreview} className="h-7 rounded-full">
              <Play className="mr-1 h-3.5 w-3.5" /> Preview
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Enter</Label>
            <Select value={element.animation.enter} onValueChange={(v) => setAnim({ enter: v as ElementAnimation["enter"] })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENTER_ANIMATIONS.map((a) => <SelectItem key={a} value={a}>{labelize(a)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Duration · {element.animation.enterDurationMs}ms</Label>
              <Slider value={[element.animation.enterDurationMs]} min={100} max={3000} step={50} onValueChange={([v]) => setAnim({ enterDurationMs: v })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Delay · {element.animation.enterDelayMs}ms</Label>
              <Slider value={[element.animation.enterDelayMs]} min={0} max={Math.max(1000, slide.durationMs)} step={50} onValueChange={([v]) => setAnim({ enterDelayMs: v })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Easing</Label>
            <Select value={element.animation.enterEasing} onValueChange={(v) => setAnim({ enterEasing: v as ElementAnimation["enterEasing"] })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EASINGS.map((e) => <SelectItem key={e} value={e}>{labelize(e)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Emphasis</Label>
              <Select value={element.animation.emphasis} onValueChange={(v) => setAnim({ emphasis: v as ElementAnimation["emphasis"] })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPHASIS_ANIMATIONS.map((a) => <SelectItem key={a} value={a}>{labelize(a)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Exit</Label>
              <Select value={element.animation.exit} onValueChange={(v) => setAnim({ exit: v as ElementAnimation["exit"] })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXIT_ANIMATIONS.map((a) => <SelectItem key={a} value={a}>{labelize(a)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select an element on the stage, or add a text / image / shape.</p>
      )}

      <Separator />

      {/* Slide settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Slide</h3>
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input value={slide.name} onChange={(e) => onSlideChange({ name: e.target.value })} className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Duration · {(slide.durationMs / 1000).toFixed(1)}s</Label>
          <Slider value={[slide.durationMs]} min={500} max={15000} step={100} onValueChange={([v]) => onSlideChange({ durationMs: v })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Transition in</Label>
            <Select value={slide.transitionIn} onValueChange={(v) => onSlideChange({ transitionIn: v as Slide["transitionIn"] })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SLIDE_TRANSITIONS.map((t) => <SelectItem key={t} value={t}>{labelize(t)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Transition · {slide.transitionMs}ms</Label>
            <Slider value={[slide.transitionMs]} min={0} max={2000} step={50} onValueChange={([v]) => onSlideChange({ transitionMs: v })} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Background */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Background</h3>
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <Select value={bg.type} onValueChange={(v) => onBackgroundChange({ type: v as SlideBackground["type"] })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Solid</SelectItem>
              <SelectItem value="gradient">Gradient</SelectItem>
              <SelectItem value="image">Image</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {bg.type === "solid" && <ColorField label="Color" value={bg.color} onChange={(v) => onBackgroundChange({ color: v })} />}

        {bg.type === "gradient" && (
          <>
            <ColorField label="From" value={bg.gradientFrom} onChange={(v) => onBackgroundChange({ gradientFrom: v })} />
            <ColorField label="To" value={bg.gradientTo} onChange={(v) => onBackgroundChange({ gradientTo: v })} />
            <div className="space-y-1.5">
              <Label className="text-xs">Angle · {bg.gradientAngle}°</Label>
              <Slider value={[bg.gradientAngle]} min={0} max={360} step={5} onValueChange={([v]) => onBackgroundChange({ gradientAngle: v })} />
            </div>
          </>
        )}

        {bg.type === "image" && (
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input p-4 text-sm text-muted-foreground hover:bg-muted/50">
              <Upload className="h-4 w-4" />
              {bg.src ? "Replace image" : "Upload image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onBackgroundImage(file);
                  e.target.value = "";
                }}
              />
            </label>
            {bg.src && (
              <Button size="sm" variant="ghost" onClick={() => onBackgroundChange({ src: null })} className="w-full">
                Remove image
              </Button>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Background opacity · {Math.round(bg.opacity * 100)}%</Label>
          <Slider value={[bg.opacity]} min={0} max={1} step={0.05} onValueChange={([v]) => onBackgroundChange({ opacity: v })} />
        </div>
      </div>
    </div>
  );
};

export default SlideControls;
