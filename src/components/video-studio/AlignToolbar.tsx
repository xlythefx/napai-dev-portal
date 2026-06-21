// Align / distribute toolbar. Single selection aligns to the canvas;
// multi-selection (M4C) aligns/distributes within the selection.

import React from "react";
import {
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
} from "lucide-react";

export type AlignKind = "left" | "centerH" | "right" | "top" | "middleV" | "bottom" | "distH" | "distV";

interface AlignToolbarProps {
  onAlign: (kind: AlignKind) => void;
  canDistribute: boolean;
}

const btn = "rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30";

const AlignToolbar: React.FC<AlignToolbarProps> = ({ onAlign, canDistribute }) => (
  <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
    <button type="button" className={btn} title="Align left" onClick={() => onAlign("left")}><AlignHorizontalJustifyStart className="h-3.5 w-3.5" /></button>
    <button type="button" className={btn} title="Align center" onClick={() => onAlign("centerH")}><AlignHorizontalJustifyCenter className="h-3.5 w-3.5" /></button>
    <button type="button" className={btn} title="Align right" onClick={() => onAlign("right")}><AlignHorizontalJustifyEnd className="h-3.5 w-3.5" /></button>
    <div className="mx-0.5 h-4 w-px bg-border" />
    <button type="button" className={btn} title="Align top" onClick={() => onAlign("top")}><AlignVerticalJustifyStart className="h-3.5 w-3.5" /></button>
    <button type="button" className={btn} title="Align middle" onClick={() => onAlign("middleV")}><AlignVerticalJustifyCenter className="h-3.5 w-3.5" /></button>
    <button type="button" className={btn} title="Align bottom" onClick={() => onAlign("bottom")}><AlignVerticalJustifyEnd className="h-3.5 w-3.5" /></button>
    <div className="mx-0.5 h-4 w-px bg-border" />
    <button type="button" className={btn} title="Distribute horizontally" disabled={!canDistribute} onClick={() => onAlign("distH")}><AlignHorizontalDistributeCenter className="h-3.5 w-3.5" /></button>
    <button type="button" className={btn} title="Distribute vertically" disabled={!canDistribute} onClick={() => onAlign("distV")}><AlignVerticalDistributeCenter className="h-3.5 w-3.5" /></button>
  </div>
);

export default AlignToolbar;
