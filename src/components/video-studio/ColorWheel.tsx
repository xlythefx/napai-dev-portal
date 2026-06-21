// Color picker field: a swatch button that opens a react-colorful picker (sat/val
// square + hue) in a Popover, plus a hex input. Used for any layer/background
// color. (react-colorful injects its own styles — no CSS import needed.)

import React from "react";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ColorFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onCommit?: () => void;
}

const ColorField: React.FC<ColorFieldProps> = ({ label, value, onChange, onCommit }) => {
  return (
    <div className="space-y-1">
      {label && <label className="block text-[11px] font-medium text-muted-foreground">{label}</label>}
      <Popover
        onOpenChange={(open) => {
          if (!open) onCommit?.();
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs hover:bg-muted"
          >
            <span className="h-4 w-4 shrink-0 rounded border border-border" style={{ background: value }} />
            <span className="flex-1 text-left font-mono lowercase">{value}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <HexColorPicker color={value} onChange={onChange} />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            className="mt-2 w-[200px] rounded border border-border bg-background px-2 py-1 text-xs outline-none"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ColorField;
