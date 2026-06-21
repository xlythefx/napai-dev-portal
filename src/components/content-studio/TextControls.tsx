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
  AlignJustify,
  Copy,
  Trash2,
  Undo2,
  Plus,
  Upload,
  ImagePlus,
  Lock,
  Unlock,
  Square,
  Circle,
  Triangle,
  Star,
  Minus,
  RectangleHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Background,
  FONT_FAMILIES,
  FONT_WEIGHTS,
  ImageElement,
  ShapeElement,
  ShapeType,
  TextAlign,
  TextElement,
} from "@/lib/contentStudio";

interface TextControlsProps {
  textElement: TextElement | null;
  imageElement: ImageElement | null;
  shapeElement: ShapeElement | null;
  locked: boolean;
  onToggleLock: () => void;
  onTextChange: (patch: Partial<TextElement>) => void;
  onImageChange: (patch: Partial<ImageElement>) => void;
  onShapeChange: (patch: Partial<ShapeElement>) => void;
  onAddText: () => void;
  onAddImage: (file: File) => void;
  onAddShape: (type: ShapeType) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUndo: () => void;
  canUndo: boolean;
  background: Background;
  onBackgroundChange: (patch: Partial<Background>) => void;
  onBackgroundImage: (file: File) => void;
}

const ALIGNS: { value: TextAlign; icon: typeof AlignLeft }[] = [
  { value: "left", icon: AlignLeft },
  { value: "center", icon: AlignCenter },
  { value: "right", icon: AlignRight },
  { value: "justify", icon: AlignJustify },
];

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
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

const TextControls = ({
  textElement,
  imageElement,
  shapeElement,
  locked,
  onToggleLock,
  onTextChange,
  onImageChange,
  onShapeChange,
  onAddText,
  onAddImage,
  onAddShape,
  onDuplicate,
  onDelete,
  onUndo,
  canUndo,
  background,
  onBackgroundChange,
  onBackgroundImage,
}: TextControlsProps) => {
  const hasSelection = !!(textElement || imageElement || shapeElement);

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="rounded-full">
              <Square className="mr-1 h-4 w-4" /> Shape
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onAddShape("rect")}><Square className="mr-2 h-4 w-4" /> Rectangle</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddShape("rounded-rect")}><RectangleHorizontal className="mr-2 h-4 w-4" /> Rounded Rect</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddShape("ellipse")}><Circle className="mr-2 h-4 w-4" /> Ellipse</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddShape("triangle")}><Triangle className="mr-2 h-4 w-4" /> Triangle</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddShape("star")}><Star className="mr-2 h-4 w-4" /> Star</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddShape("line")}><Minus className="mr-2 h-4 w-4" /> Line</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" variant="outline" onClick={onDuplicate} disabled={!hasSelection} className="rounded-full">
          <Copy className="mr-1 h-4 w-4" /> Duplicate
        </Button>
        <Button size="sm" variant="outline" onClick={onDelete} disabled={!hasSelection} className="rounded-full">
          <Trash2 className="mr-1 h-4 w-4" /> Delete
        </Button>
        <Button
          size="sm"
          variant={locked ? "default" : "outline"}
          onClick={onToggleLock}
          disabled={!hasSelection}
          className="rounded-full"
        >
          {locked ? <Lock className="mr-1 h-4 w-4" /> : <Unlock className="mr-1 h-4 w-4" />}
          {locked ? "Unlock" : "Lock"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onUndo} disabled={!canUndo} className="rounded-full">
          <Undo2 className="mr-1 h-4 w-4" /> Undo
        </Button>
      </div>

      <Separator />

      {/* Selected-layer controls */}
      {locked && hasSelection && (
        <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0 text-primary" />
          Layer locked — unlock to edit it or let the AI change it.
        </div>
      )}
      <fieldset disabled={locked} className={`m-0 min-w-0 space-y-4 border-0 p-0 ${locked ? "pointer-events-none opacity-60" : ""}`}>
      {textElement ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Text layer</h3>

          <div className="space-y-1.5">
            <Label className="text-xs">Content</Label>
            <Textarea value={textElement.text} onChange={(e) => onTextChange({ text: e.target.value })} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Font</Label>
              <Select value={textElement.fontFamily} onValueChange={(v) => onTextChange({ fontFamily: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Weight</Label>
              <Select value={textElement.fontWeight} onValueChange={(v) => onTextChange({ fontWeight: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_WEIGHTS.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Font size · {textElement.fontSize}px</Label>
            <Slider value={[textElement.fontSize]} min={8} max={400} step={1} onValueChange={([v]) => onTextChange({ fontSize: v })} />
          </div>

          <ColorField label="Color" value={textElement.color} onChange={(v) => onTextChange({ color: v })} />

          <div className="space-y-1.5">
            <Label className="text-xs">Alignment</Label>
            <div className="flex gap-1">
              {ALIGNS.map(({ value, icon: Icon }) => (
                <Button
                  key={value}
                  size="icon"
                  variant={textElement.align === value ? "default" : "outline"}
                  onClick={() => onTextChange({ align: value })}
                  className="h-9 w-9"
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">X</Label>
              <Input type="number" value={Math.round(textElement.x)} onChange={(e) => onTextChange({ x: Number(e.target.value) })} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Y</Label>
              <Input type="number" value={Math.round(textElement.y)} onChange={(e) => onTextChange({ y: Number(e.target.value) })} className="h-9" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Box width · {textElement.width}px</Label>
            <Slider value={[textElement.width]} min={50} max={2000} step={10} onValueChange={([v]) => onTextChange({ width: v })} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Opacity · {Math.round(textElement.opacity * 100)}%</Label>
            <Slider value={[textElement.opacity]} min={0} max={1} step={0.05} onValueChange={([v]) => onTextChange({ opacity: v })} />
          </div>
        </div>
      ) : shapeElement ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Shape layer</h3>

          <ColorField label="Fill" value={shapeElement.fill} onChange={(v) => onShapeChange({ fill: v })} />

          <div className="space-y-1.5">
            <Label className="text-xs">Fill opacity · {Math.round(shapeElement.fillOpacity * 100)}%</Label>
            <Slider value={[shapeElement.fillOpacity]} min={0} max={1} step={0.05} onValueChange={([v]) => onShapeChange({ fillOpacity: v })} />
          </div>

          <ColorField label="Stroke color" value={shapeElement.stroke} onChange={(v) => onShapeChange({ stroke: v })} />

          <div className="space-y-1.5">
            <Label className="text-xs">Stroke width · {shapeElement.strokeWidth}px</Label>
            <Slider value={[shapeElement.strokeWidth]} min={0} max={60} step={1} onValueChange={([v]) => onShapeChange({ strokeWidth: v })} />
          </div>

          {shapeElement.shapeType === "rounded-rect" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Corner radius · {shapeElement.cornerRadius}px</Label>
              <Slider value={[shapeElement.cornerRadius]} min={0} max={200} step={4} onValueChange={([v]) => onShapeChange({ cornerRadius: v })} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Width</Label>
              <Input type="number" value={Math.round(shapeElement.width)} onChange={(e) => onShapeChange({ width: Math.max(4, Number(e.target.value)) })} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Height</Label>
              <Input type="number" value={Math.round(shapeElement.height)} onChange={(e) => onShapeChange({ height: Math.max(4, Number(e.target.value)) })} className="h-9" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">X</Label>
              <Input type="number" value={Math.round(shapeElement.x)} onChange={(e) => onShapeChange({ x: Number(e.target.value) })} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Y</Label>
              <Input type="number" value={Math.round(shapeElement.y)} onChange={(e) => onShapeChange({ y: Number(e.target.value) })} className="h-9" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Opacity · {Math.round(shapeElement.opacity * 100)}%</Label>
            <Slider value={[shapeElement.opacity]} min={0} max={1} step={0.05} onValueChange={([v]) => onShapeChange({ opacity: v })} />
          </div>
        </div>
      ) : imageElement ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Image layer</h3>
          <p className="text-xs text-muted-foreground">
            Drag the image to move it. Drag the blue corner handle on the canvas to resize.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Width</Label>
              <Input
                type="number"
                value={Math.round(imageElement.width)}
                onChange={(e) => {
                  const w = Math.max(20, Number(e.target.value));
                  onImageChange({ width: w, height: w / (imageElement.naturalRatio || 1) });
                }}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Height</Label>
              <Input
                type="number"
                value={Math.round(imageElement.height)}
                onChange={(e) => {
                  const h = Math.max(20, Number(e.target.value));
                  onImageChange({ height: h, width: h * (imageElement.naturalRatio || 1) });
                }}
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">X</Label>
              <Input type="number" value={Math.round(imageElement.x)} onChange={(e) => onImageChange({ x: Number(e.target.value) })} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Y</Label>
              <Input type="number" value={Math.round(imageElement.y)} onChange={(e) => onImageChange({ y: Number(e.target.value) })} className="h-9" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Opacity · {Math.round(imageElement.opacity * 100)}%</Label>
            <Slider value={[imageElement.opacity]} min={0} max={1} step={0.05} onValueChange={([v]) => onImageChange({ opacity: v })} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select a layer on the canvas, or add a text, image, or shape layer.
        </p>
      )}
      </fieldset>

      <Separator />

      {/* Background controls */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Background</h3>
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <Select value={background.type} onValueChange={(v) => onBackgroundChange({ type: v as Background["type"] })}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Solid</SelectItem>
              <SelectItem value="gradient">Gradient</SelectItem>
              <SelectItem value="image">Image</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {background.type === "solid" && (
          <ColorField label="Color" value={background.color} onChange={(v) => onBackgroundChange({ color: v })} />
        )}

        {background.type === "gradient" && (
          <>
            <ColorField label="From" value={background.gradientFrom} onChange={(v) => onBackgroundChange({ gradientFrom: v })} />
            <ColorField label="To" value={background.gradientTo} onChange={(v) => onBackgroundChange({ gradientTo: v })} />
            <div className="space-y-1.5">
              <Label className="text-xs">Angle · {background.gradientAngle}°</Label>
              <Slider value={[background.gradientAngle]} min={0} max={360} step={5} onValueChange={([v]) => onBackgroundChange({ gradientAngle: v })} />
            </div>
          </>
        )}

        {background.type === "image" && (
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input p-4 text-sm text-muted-foreground hover:bg-muted/50">
              <Upload className="h-4 w-4" />
              {background.src ? "Replace image" : "Upload image"}
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
            {background.src && (
              <Button size="sm" variant="ghost" onClick={() => onBackgroundChange({ src: null })} className="w-full">
                Remove image
              </Button>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Background opacity · {Math.round(background.opacity * 100)}%</Label>
          <Slider value={[background.opacity]} min={0} max={1} step={0.05} onValueChange={([v]) => onBackgroundChange({ opacity: v })} />
        </div>
      </div>
    </div>
  );
};

export default TextControls;
