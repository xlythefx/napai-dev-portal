// Right-panel inspector. With a layer selected: transform knobs (X/Y/W/H,
// rotation, opacity) + per-type fields. With nothing selected: scene settings
// (duration, transition) + background editor. Component layers reuse
// PropsSchemaForm; colors use the ColorField wheel; media uses MediaUploader.

import React from "react";
import { Sparkles, Diamond } from "lucide-react";
import ColorField from "./ColorWheel";
import MediaUploader from "./MediaUploader";
import PropsSchemaForm from "./PropsSchemaForm";
import AlignToolbar, { type AlignKind } from "./AlignToolbar";
import type { TransformPatch } from "./EditOverlay";
import { SCENE_TRANSITIONS, type Project, type Scene, type SceneTransition } from "@/lib/remotion/types";
import { evalColor, evalNumber, getAnimatable, isAnimated, type Layer, type SceneBackground } from "@/lib/remotion/layers";

const FONTS = ["Poppins", "Inter", "Montserrat", "Roboto", "Open Sans", "Lato", "Playfair Display", "Oswald"];

const labelCls = "block text-[11px] font-medium text-muted-foreground";
const fieldCls = "w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none";

/** Stopwatch ◆ toggle for an animatable property. */
function KfDot({ animated, onToggle }: { animated: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={animated ? "Stop animating (remove keyframes)" : "Animate (keyframe at playhead)"}
      className={`shrink-0 rounded p-0.5 ${animated ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"}`}
    >
      <Diamond className={`h-3 w-3 ${animated ? "fill-primary" : ""}`} />
    </button>
  );
}

const clampN = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function Knob({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  kf,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  kf?: { animated: boolean; onToggle: () => void };
}) {
  const dec = Math.max(0, (String(step).split(".")[1] || "").length);
  const bump = (dir: number) => onChange(Number(clampN(value + dir * step, min, max).toFixed(dec)));
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        {kf && <KfDot animated={kf.animated} onToggle={kf.onToggle} />}
        <label className={labelCls}>{label}</label>
      </div>
      <div className="flex items-stretch overflow-hidden rounded-md border border-border">
        <button type="button" onClick={() => bump(-1)} className="px-2 text-sm text-muted-foreground hover:bg-muted" tabIndex={-1}>−</button>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number((Math.round(value / step) * step).toFixed(dec))}
          onChange={(e) => onChange(clampN(Number(e.target.value), min, max))}
          className="w-full min-w-0 border-x border-border bg-background px-1.5 py-1 text-center text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button type="button" onClick={() => bump(1)} className="px-2 text-sm text-muted-foreground hover:bg-muted" tabIndex={-1}>+</button>
      </div>
    </div>
  );
}

interface LayerInspectorProps {
  project: Project;
  /** Background segment under the playhead (edited when nothing is selected). */
  background: SceneBackground;
  layer: Layer | null;
  email: string;
  frame: number; // clip-local playhead (for frame-aware reads + keyframes)
  onTransformPatch: (patch: TransformPatch) => void;
  onLayerPatch: (patch: Record<string, unknown>) => void;
  onAnimatablePatch: (key: string, value: number | string) => void;
  onToggleKeyframe: (key: string) => void;
  onComponentProp: (key: string, value: string | number) => void;
  onBackgroundChange: (patch: Partial<SceneBackground>) => void;
  onEditCode: (templateId: string) => void;
  onAlign: (kind: AlignKind) => void;
  canDistribute: boolean;
}

const LayerInspector: React.FC<LayerInspectorProps> = ({
  project,
  background,
  layer,
  email,
  onTransformPatch,
  onLayerPatch,
  onAnimatablePatch,
  onToggleKeyframe,
  onComponentProp,
  onBackgroundChange,
  onEditCode,
  onAlign,
  canDistribute,
  frame,
}) => {
  const animatedDot = (key: string) => (layer ? { animated: isAnimated(getAnimatable(layer, key) ?? 0), onToggle: () => onToggleKeyframe(key) } : undefined);
  // ---------- nothing selected: background under the playhead ----------
  if (!layer) {
    const bg = background ?? { type: "gradient", color: "#0f172a", gradientFrom: "#6366f1", gradientTo: "#ec4899", gradientAngle: 135, src: null };
    return (
      <div className="flex h-full flex-col overflow-y-auto p-3">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Background</h3>
        <p className="mb-3 text-[11px] text-muted-foreground">Select a clip to edit it, or set the background at the playhead.</p>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className={labelCls}>Type</label>
            <select value={bg.type} onChange={(e) => onBackgroundChange({ type: e.target.value as SceneBackground["type"] })} className={fieldCls}>
              <option value="solid">Solid</option>
              <option value="gradient">Gradient</option>
              <option value="image">Image</option>
            </select>
          </div>
          {bg.type === "solid" && <ColorField label="Color" value={bg.color} onChange={(v) => onBackgroundChange({ color: v })} />}
          {bg.type === "gradient" && (
            <>
              <ColorField label="From" value={bg.gradientFrom} onChange={(v) => onBackgroundChange({ gradientFrom: v })} />
              <ColorField label="To" value={bg.gradientTo} onChange={(v) => onBackgroundChange({ gradientTo: v })} />
              <Knob label={`Angle — ${bg.gradientAngle}°`} value={bg.gradientAngle} min={0} max={360} step={1} onChange={(v) => onBackgroundChange({ gradientAngle: v })} />
            </>
          )}
          {bg.type === "image" && (
            <MediaUploader kind="image" value={bg.src ?? ""} email={email} onChange={(url) => onBackgroundChange({ src: url })} />
          )}
        </div>
      </div>
    );
  }

  // ---------- audio layer (non-visual) ----------
  if (layer.type === "audio") {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{layer.name}</h3>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">audio</span>
        </div>
        <div className="space-y-3">
          <MediaUploader kind="audio" value={layer.src} email={email} onChange={(url) => onLayerPatch({ src: url })} />
          <Knob label="Trim start (frames)" value={layer.trimStart} min={0} max={6000} step={1} onChange={(v) => onLayerPatch({ trimStart: v })} />
          <Knob
            label={`Volume — ${evalNumber(layer.volume, frame).toFixed(2)}`}
            value={evalNumber(layer.volume, frame)}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => onAnimatablePatch("volume", v)}
            kf={animatedDot("volume")}
          />
        </div>
      </div>
    );
  }

  // ---------- a layer is selected ----------
  const t = layer.transform;
  const template = layer.type === "component" ? project.templates.find((tp) => tp.id === layer.templateId) : undefined;

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{layer.name}</h3>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground">{layer.type}</span>
      </div>

      <div className="mb-3">
        <AlignToolbar onAlign={onAlign} canDistribute={canDistribute} />
      </div>

      {/* Transform (X/Y/Rotation/Opacity are keyframable; W/H static) */}
      <div className="grid grid-cols-2 gap-2">
        <Knob label="X" value={evalNumber(t.x, frame)} min={-project.width} max={project.width * 2} onChange={(v) => onTransformPatch({ x: v })} kf={animatedDot("transform.x")} />
        <Knob label="Y" value={evalNumber(t.y, frame)} min={-project.height} max={project.height * 2} onChange={(v) => onTransformPatch({ y: v })} kf={animatedDot("transform.y")} />
        <Knob label="W" value={layer.width} min={8} max={project.width * 2} onChange={(v) => onTransformPatch({ width: v })} />
        <Knob label="H" value={layer.height} min={8} max={project.height * 2} onChange={(v) => onTransformPatch({ height: v })} />
      </div>
      <div className="mt-2 space-y-2">
        <Knob label={`Rotation — ${Math.round(evalNumber(t.rotation, frame))}°`} value={evalNumber(t.rotation, frame)} min={-180} max={180} step={1} onChange={(v) => onTransformPatch({ rotation: v })} kf={animatedDot("transform.rotation")} />
        <Knob label={`Opacity — ${evalNumber(t.opacity, frame).toFixed(2)}`} value={evalNumber(t.opacity, frame)} min={0} max={1} step={0.01} onChange={(v) => onTransformPatch({ opacity: v })} kf={animatedDot("transform.opacity")} />
      </div>

      <div className="my-3 h-px bg-border" />

      {/* Type-specific */}
      {layer.type === "text" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className={labelCls}>Text</label>
            <textarea value={layer.text} onChange={(e) => onLayerPatch({ text: e.target.value })} rows={2} className={`${fieldCls} resize-y`} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Font</label>
            <select value={layer.fontFamily} onChange={(e) => onLayerPatch({ fontFamily: e.target.value })} className={fieldCls}>
              {FONTS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <Knob label="Font size" value={evalNumber(layer.fontSize, frame)} min={8} max={Math.round(project.width * 0.4)} step={1} onChange={(v) => onAnimatablePatch("fontSize", v)} kf={animatedDot("fontSize")} />
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <KfDot animated={isAnimated(layer.color)} onToggle={() => onToggleKeyframe("color")} />
              <label className={labelCls}>Color</label>
            </div>
            <ColorField value={evalColor(layer.color, frame)} onChange={(v) => onAnimatablePatch("color", v)} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Align</label>
            <div className="flex rounded-md border border-border p-0.5">
              {(["left", "center", "right"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => onLayerPatch({ align: a })}
                  className={`flex-1 rounded px-1.5 py-1 text-xs capitalize ${layer.align === a ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className={labelCls}>Weight</label>
              <select value={layer.weight} onChange={(e) => onLayerPatch({ weight: e.target.value })} className={fieldCls}>
                {["300", "400", "500", "600", "700", "800", "900"].map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
            <Knob label="Line height" value={layer.lineHeight} min={0.8} max={2.5} step={0.05} onChange={(v) => onLayerPatch({ lineHeight: v })} />
          </div>
        </div>
      )}

      {layer.type === "image" && (
        <div className="space-y-3">
          <MediaUploader kind="image" value={layer.src} email={email} onChange={(url) => onLayerPatch({ src: url })} />
          <div className="space-y-1">
            <label className={labelCls}>Fit</label>
            <select value={layer.fit} onChange={(e) => onLayerPatch({ fit: e.target.value })} className={fieldCls}>
              <option value="cover">cover</option>
              <option value="contain">contain</option>
            </select>
          </div>
          <Knob label="Corner radius" value={layer.radius} min={0} max={400} step={2} onChange={(v) => onLayerPatch({ radius: v })} />
        </div>
      )}

      {layer.type === "video" && (
        <div className="space-y-3">
          <MediaUploader kind="video" value={layer.src} email={email} onChange={(url) => onLayerPatch({ src: url })} />
          <div className="space-y-1">
            <label className={labelCls}>Fit</label>
            <select value={layer.fit} onChange={(e) => onLayerPatch({ fit: e.target.value })} className={fieldCls}>
              <option value="cover">cover</option>
              <option value="contain">contain</option>
            </select>
          </div>
          <Knob label="Trim start (frames)" value={layer.trimStart} min={0} max={1800} step={1} onChange={(v) => onLayerPatch({ trimStart: v })} />
          <Knob label="Volume" value={layer.volume} min={0} max={1} step={0.05} onChange={(v) => onLayerPatch({ volume: v })} />
        </div>
      )}

      {layer.type === "shape" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className={labelCls}>Shape</label>
            <select value={layer.shape} onChange={(e) => onLayerPatch({ shape: e.target.value })} className={fieldCls}>
              <option value="rect">Rectangle</option>
              <option value="ellipse">Ellipse</option>
              <option value="line">Line</option>
            </select>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <KfDot animated={isAnimated(layer.fill)} onToggle={() => onToggleKeyframe("fill")} />
              <label className={labelCls}>Fill</label>
            </div>
            <ColorField value={evalColor(layer.fill, frame)} onChange={(v) => onAnimatablePatch("fill", v)} />
          </div>
          <ColorField label="Stroke" value={layer.stroke} onChange={(v) => onLayerPatch({ stroke: v })} />
          <Knob label="Stroke width" value={layer.strokeWidth} min={0} max={60} step={1} onChange={(v) => onLayerPatch({ strokeWidth: v })} />
          {layer.shape === "rect" && <Knob label="Corner radius" value={layer.radius} min={0} max={400} step={2} onChange={(v) => onLayerPatch({ radius: v })} />}
        </div>
      )}

      {layer.type === "component" && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onEditCode(layer.templateId)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <Sparkles className="h-3.5 w-3.5" /> Edit in Template Studio
          </button>
          {template ? (
            <PropsSchemaForm schema={template.propsSchema} values={layer.props} email={email} onChange={onComponentProp} />
          ) : (
            <p className="text-xs text-destructive">Template not found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default LayerInspector;
