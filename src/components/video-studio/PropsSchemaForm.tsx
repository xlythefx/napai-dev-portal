// Renders editable inputs for a template's propsSchema and writes changes back
// into a scene's props. Media fields delegate to MediaUploader.
//
// layout="stack" (default) keeps one field per row — used by the narrow Layer
// Inspector. layout="grid" packs short fields two-up and lets long fields
// (longtext / media) span the full width — used by the wide preview-props panel.

import React from "react";
import {
  Type,
  AlignLeft,
  Palette,
  SlidersHorizontal,
  ChevronsUpDown,
  ChevronDown,
  Image as ImageIcon,
  Clapperboard,
} from "lucide-react";
import type { PropField, PropFieldType, PropValues } from "@/lib/remotion/types";
import MediaUploader from "./MediaUploader";

interface PropsSchemaFormProps {
  schema: PropField[];
  values: PropValues;
  email: string;
  onChange: (key: string, value: string | number) => void;
  layout?: "stack" | "grid";
}

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground/50 focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10";

const FIELD_ICON: Record<PropFieldType, React.ElementType> = {
  text: Type,
  longtext: AlignLeft,
  color: Palette,
  number: SlidersHorizontal,
  select: ChevronsUpDown,
  image: ImageIcon,
  video: Clapperboard,
};

// Long fields read better full-width; short fields pair up nicely in grid mode.
const isWideField = (t: PropFieldType) => t === "longtext" || t === "image" || t === "video";

const PropsSchemaForm: React.FC<PropsSchemaFormProps> = ({
  schema,
  values,
  email,
  onChange,
  layout = "stack",
}) => {
  if (schema.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
        This template exposes no editable props.
      </p>
    );
  }

  const grid = layout === "grid";

  return (
    <div className={grid ? "grid grid-cols-1 gap-2.5 sm:grid-cols-2" : "space-y-2.5"}>
      {schema.map((field) => {
        const value = values[field.key];
        const Icon = FIELD_ICON[field.type] ?? Type;
        const spanFull = grid && isWideField(field.type);
        const isTextual = field.type === "text" || field.type === "longtext";

        return (
          <div
            key={field.key}
            className={`group rounded-xl border border-border/70 bg-card/40 p-2.5 transition-colors hover:border-border hover:bg-card focus-within:border-foreground/30 focus-within:bg-card ${
              spanFull ? "sm:col-span-2" : ""
            }`}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-focus-within:bg-foreground group-focus-within:text-background">
                <Icon className="h-3 w-3" />
              </span>
              <label className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {field.label}
              </label>
              {isTextual && (
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/60">
                  {String(value ?? "").length}
                </span>
              )}
            </div>

            {field.type === "longtext" && (
              <textarea
                value={String(value ?? "")}
                onChange={(e) => onChange(field.key, e.target.value)}
                rows={3}
                placeholder="Type here…"
                className={`${inputCls} resize-y leading-relaxed`}
              />
            )}

            {field.type === "text" && (
              <input
                type="text"
                value={String(value ?? "")}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder="Type here…"
                className={inputCls}
              />
            )}

            {field.type === "color" && (
              <div className="flex items-center gap-2">
                <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border shadow-inner">
                  <span className="absolute inset-0" style={{ backgroundColor: String(value ?? "#000000") }} />
                  <input
                    type="color"
                    value={String(value ?? "#000000")}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label={`${field.label} color`}
                  />
                </label>
                <input
                  type="text"
                  value={String(value ?? "")}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className={`${inputCls} font-mono uppercase`}
                />
              </div>
            )}

            {field.type === "number" && (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={field.min ?? 0}
                  max={field.max ?? 100}
                  step={field.step ?? 1}
                  value={Number(value ?? 0)}
                  onChange={(e) => onChange(field.key, Number(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-foreground"
                />
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step ?? 1}
                  value={Number(value ?? 0)}
                  onChange={(e) => onChange(field.key, Number(e.target.value))}
                  className="w-16 shrink-0 rounded-lg border border-input bg-background px-2 py-1.5 text-center text-sm tabular-nums outline-none transition-shadow focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10"
                />
              </div>
            )}

            {field.type === "select" && (
              <div className="relative">
                <select
                  value={String(value ?? "")}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className={`${inputCls} cursor-pointer appearance-none pr-9`}
                >
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            )}

            {(field.type === "image" || field.type === "video") && (
              <MediaUploader
                kind={field.type}
                value={String(value ?? "")}
                email={email}
                onChange={(url) => onChange(field.key, url)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PropsSchemaForm;
