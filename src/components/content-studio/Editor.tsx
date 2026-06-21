import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Images, Sparkles, Check, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CanvasList from "./CanvasList";
import LayersPanel from "./LayersPanel";
import TextControls from "./TextControls";
import CopywriterPanel from "./CopywriterPanel";
import TemplatesPanel from "./TemplatesPanel";
import ChatSidebar, { type RunTurnArgs } from "@/components/ai-chat/ChatSidebar";
import { editCanvasStream } from "@/lib/assistantApi";
import type { CopyModel } from "@/lib/copywriterApi";
import {
  AspectRatio,
  Background,
  CanvasItem,
  ImageElement,
  Project,
  ShapeElement,
  ShapeType,
  TextElement,
  canvasFromTemplate,
  newCanvas,
  newImageElement,
  newShapeElement,
  newTextElement,
  uid,
} from "@/lib/contentStudio";

type ImageGetter = (src: string) => HTMLImageElement | null;

// ---- Pure canvas painting helpers (shared by live preview + export) --------

function measureElement(ctx: CanvasRenderingContext2D, el: TextElement) {
  ctx.font = `${el.fontWeight} ${el.fontSize}px "${el.fontFamily}"`;
  const lines = el.text.split("\n");
  const wrappedLines: string[] = [];
  lines.forEach((line) => {
    if (el.width > 0) {
      const words = line.split(" ");
      let current = "";
      words.forEach((word) => {
        const test = current + (current ? " " : "") + word;
        if (ctx.measureText(test).width > el.width && current) {
          wrappedLines.push(current);
          current = word;
        } else {
          current = test;
        }
      });
      if (current) wrappedLines.push(current);
    } else {
      wrappedLines.push(line);
    }
  });
  const lineHeight = el.fontSize * 1.2;
  const totalTextHeight = wrappedLines.length * lineHeight;
  let drawX = el.x;
  let drawY = el.y;
  if (el.originX === "center") drawX = el.x - (el.width > 0 ? el.width / 2 : 0);
  else if (el.originX === "right") drawX = el.x - (el.width > 0 ? el.width : 0);
  if (el.originY === "center") drawY = el.y + totalTextHeight / 2;
  else if (el.originY === "top") drawY = el.y + totalTextHeight;
  const maxWidth =
    el.width > 0 ? el.width : Math.max(0, ...wrappedLines.map((l) => ctx.measureText(l).width));
  return { wrappedLines, lineHeight, totalTextHeight, drawX, drawY, maxWidth };
}

function paintText(ctx: CanvasRenderingContext2D, el: TextElement, selected: boolean) {
  ctx.save();
  ctx.globalAlpha = el.opacity ?? 1;
  ctx.font = `${el.fontWeight} ${el.fontSize}px "${el.fontFamily}"`;
  ctx.fillStyle = el.color;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const { wrappedLines, lineHeight, totalTextHeight, drawX, drawY, maxWidth } = measureElement(ctx, el);

  wrappedLines.forEach((line, index) => {
    const lineY = drawY - (wrappedLines.length - 1 - index) * lineHeight;
    let lineX = drawX;
    if (el.width > 0) {
      const lineWidth = ctx.measureText(line).width;
      if (el.align === "center") lineX = drawX + (el.width - lineWidth) / 2;
      else if (el.align === "right") lineX = drawX + el.width - lineWidth;
      else if (el.align === "justify" && index < wrappedLines.length - 1) {
        const words = line.split(" ");
        if (words.length > 1) {
          const textWidth = ctx.measureText(line.replace(/\s/g, "")).width;
          const spaceWidth = (el.width - textWidth) / (words.length - 1);
          let cursor = drawX;
          words.forEach((word, wi) => {
            ctx.fillText(word, cursor, lineY);
            if (wi < words.length - 1) cursor += ctx.measureText(word).width + spaceWidth;
          });
          return;
        }
      }
    }
    ctx.fillText(line, lineX, lineY);
  });

  if (selected) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    const boxW = el.width > 0 ? el.width : maxWidth;
    ctx.strokeRect(drawX - 2, drawY - totalTextHeight + 2, boxW + 4, totalTextHeight + 4);
  }
  ctx.restore();
}

function handleSize(canvas: CanvasItem) {
  return Math.max(14, canvas.width * 0.022);
}

function paintShape(
  ctx: CanvasRenderingContext2D,
  canvas: CanvasItem,
  el: ShapeElement,
  selected: boolean
) {
  ctx.save();
  ctx.globalAlpha = el.opacity ?? 1;
  const { x, y, width: w, height: h } = el;

  ctx.beginPath();
  switch (el.shapeType) {
    case "rect":
      ctx.rect(x, y, w, h);
      break;
    case "rounded-rect": {
      const r = Math.min(el.cornerRadius ?? 24, Math.min(w, h) / 2);
      ctx.roundRect(x, y, w, h, r);
      break;
    }
    case "ellipse":
      ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
      break;
    case "triangle":
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      break;
    case "star": {
      const cx = x + w / 2, cy = y + h / 2;
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * 0.42;
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case "line":
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x + w, y + h / 2);
      break;
  }

  if (el.shapeType !== "line") {
    ctx.globalAlpha = (el.opacity ?? 1) * (el.fillOpacity ?? 1);
    ctx.fillStyle = el.fill;
    ctx.fill();
  }

  if (el.strokeWidth > 0 || el.shapeType === "line") {
    ctx.globalAlpha = el.opacity ?? 1;
    ctx.strokeStyle = el.shapeType === "line" ? el.fill : el.stroke;
    ctx.lineWidth = el.shapeType === "line"
      ? Math.max(2, el.height)
      : el.strokeWidth;
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  if (selected) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
    const hs = handleSize(canvas);
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(x + w - hs / 2, y + h - hs / 2, hs, hs);
  }

  ctx.restore();
}

function paintImageEl(
  ctx: CanvasRenderingContext2D,
  canvas: CanvasItem,
  el: ImageElement,
  img: HTMLImageElement | null,
  selected: boolean
) {
  ctx.save();
  ctx.globalAlpha = el.opacity ?? 1;
  if (img) {
    ctx.drawImage(img, el.x, el.y, el.width, el.height);
  } else {
    ctx.fillStyle = "#33415555";
    ctx.fillRect(el.x, el.y, el.width, el.height);
  }
  ctx.globalAlpha = 1;
  if (selected) {
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.strokeRect(el.x, el.y, el.width, el.height);
    const hs = handleSize(canvas);
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(el.x + el.width - hs / 2, el.y + el.height - hs / 2, hs, hs);
  }
  ctx.restore();
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const ir = img.width / img.height;
  const cr = w / h;
  let dw = w;
  let dh = h;
  if (ir > cr) {
    dh = h;
    dw = h * ir;
  } else {
    dw = w;
    dh = w / ir;
  }
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function paintBackground(
  ctx: CanvasRenderingContext2D,
  canvas: CanvasItem,
  bgImage: HTMLImageElement | null
) {
  const bg = canvas.background;
  const w = canvas.width;
  const h = canvas.height;
  ctx.save();
  ctx.globalAlpha = bg.opacity ?? 1;
  if (bg.type === "gradient") {
    const a = ((bg.gradientAngle ?? 135) * Math.PI) / 180;
    const x = Math.cos(a);
    const y = Math.sin(a);
    const len = Math.abs(x) * w + Math.abs(y) * h;
    const grad = ctx.createLinearGradient(
      w / 2 - (x * len) / 2,
      h / 2 - (y * len) / 2,
      w / 2 + (x * len) / 2,
      h / 2 + (y * len) / 2
    );
    grad.addColorStop(0, bg.gradientFrom);
    grad.addColorStop(1, bg.gradientTo);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (bg.type === "image" && bgImage) {
    drawImageCover(ctx, bgImage, w, h);
  } else {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

function paintCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: CanvasItem,
  selectedId: string | null,
  bgImage: HTMLImageElement | null,
  getImg: ImageGetter
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  paintBackground(ctx, canvas, bgImage);
  // Images → shapes → text (top of stack).
  (canvas.imageElements ?? []).forEach((el) =>
    paintImageEl(ctx, canvas, el, getImg(el.src), el.id === selectedId)
  );
  (canvas.shapeElements ?? []).forEach((el) => paintShape(ctx, canvas, el, el.id === selectedId));
  canvas.textElements.forEach((el) => paintText(ctx, el, el.id === selectedId));
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ---- Inline text editor overlay --------------------------------------------

interface InlineTextEditorProps {
  inlineEditId: string | null;
  activeCanvas: CanvasItem;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onUpdate: (id: string, text: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

function InlineTextEditor({
  inlineEditId,
  activeCanvas,
  canvasRef,
  textareaRef,
  onUpdate,
  onCommit,
  onCancel,
}: InlineTextEditorProps) {
  if (!inlineEditId || !canvasRef.current) return null;
  const el = activeCanvas.textElements.find((e) => e.id === inlineEditId);
  if (!el) return null;

  const ctx = canvasRef.current.getContext("2d");
  if (!ctx) return null;

  const rect = canvasRef.current.getBoundingClientRect();
  const scaleX = rect.width / activeCanvas.width;
  const scaleY = rect.height / activeCanvas.height;

  const { drawX, drawY, totalTextHeight, maxWidth } = measureElement(ctx, el);
  const boxW = Math.max(80, (el.width > 0 ? el.width : maxWidth + 20)) * scaleX;
  const scaledFontSize = Math.max(10, el.fontSize * scaleY);
  const lineHeight = 1.2;
  const rows = Math.max(1, el.text.split("\n").length);

  return (
    <textarea
      ref={textareaRef}
      autoFocus
      value={el.text}
      onChange={(e) => onUpdate(el.id, e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        // Shift+Enter = newline (default); plain Enter can also be allowed
      }}
      style={{
        position: "absolute",
        top: (drawY - totalTextHeight) * scaleY,
        left: drawX * scaleX,
        width: boxW,
        fontSize: scaledFontSize,
        fontFamily: `"${el.fontFamily}", sans-serif`,
        fontWeight: el.fontWeight,
        color: el.color,
        textAlign: el.align === "justify" ? "left" : (el.align as "left" | "center" | "right"),
        lineHeight,
        background: "transparent",
        border: "1.5px dashed #3b82f6",
        borderRadius: 3,
        outline: "none",
        resize: "none",
        padding: 0,
        margin: 0,
        overflow: "hidden",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        minHeight: scaledFontSize * lineHeight * rows,
        caretColor: el.color,
        boxShadow: "0 0 0 2px rgba(59,130,246,0.15)",
      }}
      rows={rows}
    />
  );
}

// ---- Editor component ------------------------------------------------------

interface EditorProps {
  project: Project;
  onChange: (project: Project) => void;
  onBack: () => void;
}

type Snapshot = { text: TextElement[]; images: ImageElement[]; shapes: ShapeElement[] };

const Editor = ({ project, onChange, onBack }: EditorProps) => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [proj, setProj] = useState<Project>(project);
  const [activeCanvasId, setActiveCanvasId] = useState<string>(project.canvases[0]?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [copywriterOpen, setCopywriterOpen] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [aiModel, setAiModel] = useState<CopyModel>("sonnet");
  const [pendingEdit, setPendingEdit] = useState<CanvasItem | null>(null);

  // image-element cache (data URL -> HTMLImageElement)
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [imgTick, setImgTick] = useState(0);
  const getImg: ImageGetter = (src) => imageCache.current.get(src) ?? null;

  // inline text editing (double-click on canvas)
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const inlineTextareaRef = useRef<HTMLTextAreaElement>(null);

  // pointer interaction
  const [mouseDown, setMouseDown] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });

  // undo history (active canvas: text + images)
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const activeCanvas = proj.canvases.find((c) => c.id === activeCanvasId) ?? proj.canvases[0];
  const selectedText = activeCanvas?.textElements.find((e) => e.id === selectedId) ?? null;
  const selectedImage = activeCanvas?.imageElements?.find((e) => e.id === selectedId) ?? null;
  const selectedShape = activeCanvas?.shapeElements?.find((e) => e.id === selectedId) ?? null;

  const snapshot = (c: CanvasItem): Snapshot => ({
    text: c.textElements.map((e) => ({ ...e })),
    images: (c.imageElements ?? []).map((e) => ({ ...e })),
    shapes: (c.shapeElements ?? []).map((e) => ({ ...e })),
  });

  // Load Google Fonts once.
  useEffect(() => {
    const families = [
      "Montserrat:wght@300;400;500;600;700;800;900",
      "Inter:wght@300;400;500;600;700;800;900",
      "Roboto:wght@300;400;500;700;900",
      "Open+Sans:wght@300;400;500;600;700;800",
      "Lato:wght@300;400;700;900",
      "Poppins:wght@300;400;500;600;700;800;900",
      "Playfair+Display:wght@400;500;600;700;800;900",
      "Oswald:wght@300;400;500;600;700",
    ];
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;
    document.head.appendChild(link);
    document.fonts.ready.then(() => setFontsReady(true));
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, []);

  // Autosave to parent (debounced).
  useEffect(() => {
    const t = setTimeout(() => onChangeRef.current(proj), 300);
    return () => clearTimeout(t);
  }, [proj]);

  // Reset history + selection when switching canvas.
  useEffect(() => {
    if (!activeCanvas) return;
    setHistory([snapshot(activeCanvas)]);
    setHistoryIndex(0);
    setSelectedId(null);
    setInlineEditId(null);
    setPendingEdit(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCanvasId]);

  // Load background image for the active canvas.
  useEffect(() => {
    const bg = activeCanvas?.background;
    if (bg?.type === "image" && bg.src) {
      loadImage(bg.src).then(setBgImage);
    } else {
      setBgImage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCanvas?.background.type, activeCanvas?.background.src]);

  // Ensure all image-element sources are loaded into the cache.
  useEffect(() => {
    (activeCanvas?.imageElements ?? []).forEach((el) => {
      if (!imageCache.current.has(el.src)) {
        const img = new Image();
        img.onload = () => {
          imageCache.current.set(el.src, img);
          setImgTick((t) => t + 1);
        };
        img.onerror = () => setImgTick((t) => t + 1);
        img.src = el.src;
      }
    });
  }, [activeCanvas]);

  // Draw the live canvas (the AI suggestion preview takes over while pending).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeCanvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const display = pendingEdit ?? activeCanvas;
    // Hide the element being inline-edited so it doesn't double-render under the textarea.
    const filtered = inlineEditId
      ? { ...display, textElements: display.textElements.filter((e) => e.id !== inlineEditId) }
      : display;
    paintCanvas(ctx, filtered, pendingEdit ? null : selectedId, bgImage, getImg);
  }, [activeCanvas, selectedId, bgImage, fontsReady, imgTick, pendingEdit, inlineEditId]);

  // ---- mutation helpers ----
  const mutateActiveCanvas = (fn: (c: CanvasItem) => CanvasItem) =>
    setProj((p) => ({
      ...p,
      canvases: p.canvases.map((c) => (c.id === activeCanvasId ? fn(c) : c)),
    }));

  const pushHistory = (snap: Snapshot) => {
    setHistory((h) => {
      const next = h.slice(0, historyIndex + 1);
      next.push(snap);
      setHistoryIndex(next.length - 1);
      return next;
    });
  };

  const commitText = (els: TextElement[], record: boolean) => {
    mutateActiveCanvas((c) => ({ ...c, textElements: els }));
    if (record) pushHistory({ text: els.map((e) => ({ ...e })), images: (activeCanvas.imageElements ?? []).map((e) => ({ ...e })), shapes: (activeCanvas.shapeElements ?? []).map((e) => ({ ...e })) });
  };

  const commitImages = (els: ImageElement[], record: boolean) => {
    mutateActiveCanvas((c) => ({ ...c, imageElements: els }));
    if (record) pushHistory({ text: activeCanvas.textElements.map((e) => ({ ...e })), images: els.map((e) => ({ ...e })), shapes: (activeCanvas.shapeElements ?? []).map((e) => ({ ...e })) });
  };

  const commitShapes = (els: ShapeElement[], record: boolean) => {
    mutateActiveCanvas((c) => ({ ...c, shapeElements: els }));
    if (record)
      pushHistory({
        text: activeCanvas.textElements.map((e) => ({ ...e })),
        images: (activeCanvas.imageElements ?? []).map((e) => ({ ...e })),
        shapes: els.map((e) => ({ ...e })),
      });
  };

  const updateText = (id: string, patch: Partial<TextElement>) => {
    if (!activeCanvas) return;
    commitText(activeCanvas.textElements.map((e) => (e.id === id ? { ...e, ...patch } : e)), false);
  };

  const updateImage = (id: string, patch: Partial<ImageElement>) => {
    if (!activeCanvas) return;
    commitImages((activeCanvas.imageElements ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)), false);
  };

  const updateShape = (id: string, patch: Partial<ShapeElement>) => {
    if (!activeCanvas) return;
    commitShapes((activeCanvas.shapeElements ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)), false);
  };

  const addShape = (shapeType: ShapeType) => {
    if (!activeCanvas) return;
    const el = newShapeElement(activeCanvas, shapeType);
    commitShapes([...(activeCanvas.shapeElements ?? []), el], true);
    setSelectedId(el.id);
  };

  const toggleLock = (id: string) => {
    if (!activeCanvas) return;
    if (activeCanvas.textElements.some((e) => e.id === id)) {
      commitText(activeCanvas.textElements.map((e) => (e.id === id ? { ...e, locked: !e.locked } : e)), true);
    } else if ((activeCanvas.imageElements ?? []).some((e) => e.id === id)) {
      commitImages((activeCanvas.imageElements ?? []).map((e) => (e.id === id ? { ...e, locked: !e.locked } : e)), true);
    } else if ((activeCanvas.shapeElements ?? []).some((e) => e.id === id)) {
      commitShapes((activeCanvas.shapeElements ?? []).map((e) => (e.id === id ? { ...e, locked: !e.locked } : e)), true);
    }
  };

  const addText = (text?: string): string => {
    if (!activeCanvas) return "";
    const el = newTextElement(activeCanvas, text ?? "Double-click to edit");
    commitText([...activeCanvas.textElements, el], true);
    setSelectedId(el.id);
    return el.id;
  };

  const addImage = (file: File) => {
    if (!activeCanvas) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const probe = new Image();
      probe.onload = () => {
        imageCache.current.set(src, probe);
        const el = newImageElement(activeCanvas, src, probe.naturalWidth, probe.naturalHeight);
        commitImages([...(activeCanvas.imageElements ?? []), el], true);
        setSelectedId(el.id);
        setImgTick((t) => t + 1);
      };
      probe.src = src;
    };
    reader.readAsDataURL(file);
  };

  const duplicateSelected = () => {
    if (!activeCanvas) return;
    if (selectedText) {
      const copy: TextElement = { ...selectedText, id: uid("text"), x: selectedText.x + 20, y: selectedText.y + 20 };
      commitText([...activeCanvas.textElements, copy], true);
      setSelectedId(copy.id);
    } else if (selectedImage) {
      const copy: ImageElement = { ...selectedImage, id: uid("img"), x: selectedImage.x + 20, y: selectedImage.y + 20 };
      commitImages([...(activeCanvas.imageElements ?? []), copy], true);
      setSelectedId(copy.id);
    } else if (selectedShape) {
      const copy: ShapeElement = { ...selectedShape, id: uid("shape"), x: selectedShape.x + 20, y: selectedShape.y + 20 };
      commitShapes([...(activeCanvas.shapeElements ?? []), copy], true);
      setSelectedId(copy.id);
    }
  };

  const deleteSelected = () => {
    if (!activeCanvas) return;
    if (selectedText?.locked || selectedImage?.locked || selectedShape?.locked) {
      toast({ title: "Layer locked", description: "Unlock it first to delete." });
      return;
    }
    if (selectedText) commitText(activeCanvas.textElements.filter((e) => e.id !== selectedText.id), true);
    else if (selectedImage) commitImages((activeCanvas.imageElements ?? []).filter((e) => e.id !== selectedImage.id), true);
    else if (selectedShape) commitShapes((activeCanvas.shapeElements ?? []).filter((e) => e.id !== selectedShape.id), true);
    setSelectedId(null);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    setHistoryIndex(idx);
    const snap = history[idx];
    mutateActiveCanvas((c) => ({
      ...c,
      textElements: snap.text.map((e) => ({ ...e })),
      imageElements: snap.images.map((e) => ({ ...e })),
      shapeElements: snap.shapes.map((e) => ({ ...e })),
    }));
    setSelectedId(null);
  };

  const setBackground = (patch: Partial<Background>) =>
    mutateActiveCanvas((c) => ({ ...c, background: { ...c.background, ...patch } }));

  const onBackgroundImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setBackground({ type: "image", src: String(reader.result) });
    reader.readAsDataURL(file);
  };

  // ---- canvas pointer interaction ----
  const toCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * activeCanvas.width,
      y: ((e.clientY - rect.top) / rect.height) * activeCanvas.height,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (pendingEdit) return; // interaction disabled while reviewing an AI suggestion
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = toCanvasCoords(e);
    setMouseDown(true);
    dragStart.current = { x, y };

    // Resize handle on a selected image takes priority (locked images can't resize).
    if (selectedImage && !selectedImage.locked) {
      const hs = handleSize(activeCanvas);
      const cx = selectedImage.x + selectedImage.width;
      const cy = selectedImage.y + selectedImage.height;
      if (Math.abs(x - cx) <= hs && Math.abs(y - cy) <= hs) {
        setResizing(true);
        return;
      }
    }

    // Resize handle on a selected shape.
    if (selectedShape && !selectedShape.locked) {
      const hs = handleSize(activeCanvas);
      const cx = selectedShape.x + selectedShape.width;
      const cy = selectedShape.y + selectedShape.height;
      if (Math.abs(x - cx) <= hs && Math.abs(y - cy) <= hs) {
        setResizing(true);
        return;
      }
    }

    // Text is on top → hit-test it first, then shapes, then images.
    const hitText = [...activeCanvas.textElements].reverse().find((el) => {
      const { drawX, drawY, totalTextHeight, maxWidth } = measureElement(ctx, el);
      const boxW = el.width > 0 ? el.width : maxWidth;
      return x >= drawX - 2 && x <= drawX + boxW + 2 && y >= drawY - totalTextHeight + 2 && y <= drawY + 2;
    });
    if (hitText) {
      setSelectedId(hitText.id);
      dragOffset.current = { x: x - hitText.x, y: y - hitText.y };
      return;
    }
    const hitShape = [...(activeCanvas.shapeElements ?? [])].reverse().find(
      (el) => x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height
    );
    if (hitShape) {
      setSelectedId(hitShape.id);
      dragOffset.current = { x: x - hitShape.x, y: y - hitShape.y };
      return;
    }
    const hitImage = [...(activeCanvas.imageElements ?? [])]
      .reverse()
      .find((el) => x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height);
    if (hitImage) {
      setSelectedId(hitImage.id);
      dragOffset.current = { x: x - hitImage.x, y: y - hitImage.y };
      return;
    }
    setSelectedId(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!mouseDown) return;
    const { x, y } = toCanvasCoords(e);

    if (resizing && selectedShape) {
      const newW = Math.max(20, x - selectedShape.x);
      const newH = Math.max(20, y - selectedShape.y);
      updateShape(selectedShape.id, { width: newW, height: newH });
      return;
    }

    if (resizing && selectedImage) {
      const newW = Math.max(20, x - selectedImage.x);
      const newH = newW / (selectedImage.naturalRatio || 1);
      updateImage(selectedImage.id, { width: newW, height: newH });
      return;
    }

    if (!selectedId) return;
    if (selectedText?.locked || selectedImage?.locked || selectedShape?.locked) return; // locked layers can't be dragged
    if (!dragging) {
      if (Math.abs(x - dragStart.current.x) > 5 || Math.abs(y - dragStart.current.y) > 5) setDragging(true);
      else return;
    }
    if (selectedImage) updateImage(selectedId, { x: x - dragOffset.current.x, y: y - dragOffset.current.y });
    else if (selectedShape) updateShape(selectedId, { x: x - dragOffset.current.x, y: y - dragOffset.current.y });
    else if (selectedText) updateText(selectedId, { x: x - dragOffset.current.x, y: y - dragOffset.current.y });
  };

  const handleMouseUp = () => {
    if ((dragging || resizing) && activeCanvas) pushHistory(snapshot(activeCanvas));
    setDragging(false);
    setResizing(false);
    setMouseDown(false);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (pendingEdit) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !activeCanvas) return;
    const { x, y } = toCanvasCoords(e);
    const hitText = [...activeCanvas.textElements].reverse().find((el) => {
      const { drawX, drawY, totalTextHeight, maxWidth } = measureElement(ctx, el);
      const boxW = el.width > 0 ? el.width : maxWidth;
      return x >= drawX - 2 && x <= drawX + boxW + 2 && y >= drawY - totalTextHeight - 4 && y <= drawY + 4;
    });
    if (hitText && !hitText.locked) {
      setSelectedId(hitText.id);
      setInlineEditId(hitText.id);
    }
  };

  // ---- canvas list ops ----
  const addCanvas = (ratio: AspectRatio) => {
    const c = newCanvas(ratio);
    setProj((p) => ({ ...p, canvases: [...p.canvases, c] }));
    setActiveCanvasId(c.id);
  };

  const duplicateCanvas = (id: string) => {
    setProj((p) => {
      const src = p.canvases.find((c) => c.id === id);
      if (!src) return p;
      const clone: CanvasItem = {
        ...src,
        id: uid("canvas"),
        name: `${src.name} copy`,
        textElements: src.textElements.map((e) => ({ ...e, id: uid("text") })),
        imageElements: (src.imageElements ?? []).map((e) => ({ ...e, id: uid("img") })),
        shapeElements: (src.shapeElements ?? []).map((e) => ({ ...e, id: uid("shape") })),
        background: { ...src.background },
      };
      const idx = p.canvases.findIndex((c) => c.id === id);
      const canvases = [...p.canvases];
      canvases.splice(idx + 1, 0, clone);
      setActiveCanvasId(clone.id);
      return { ...p, canvases };
    });
  };

  const deleteCanvas = (id: string) => {
    setProj((p) => {
      if (p.canvases.length <= 1) return p;
      const canvases = p.canvases.filter((c) => c.id !== id);
      if (id === activeCanvasId) setActiveCanvasId(canvases[0].id);
      return { ...p, canvases };
    });
  };

  const renameCanvas = (id: string) => {
    const current = proj.canvases.find((c) => c.id === id);
    const name = window.prompt("Canvas name", current?.name ?? "");
    if (name && name.trim()) {
      setProj((p) => ({
        ...p,
        canvases: p.canvases.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)),
      }));
    }
  };

  // ---- export ----
  const download = (dataUrl: string, filename: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  const safe = (s: string) => s.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "canvas";

  const exportCurrent = () => {
    const canvas = canvasRef.current;
    if (!canvas || !activeCanvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) paintCanvas(ctx, activeCanvas, null, bgImage, getImg); // no selection outline in the PNG
    download(canvas.toDataURL("image/png"), `${safe(proj.name)}-${safe(activeCanvas.name)}.png`);
    if (ctx) paintCanvas(ctx, activeCanvas, selectedId, bgImage, getImg); // restore outline
    toast({ title: "Exported", description: `${activeCanvas.name} downloaded as PNG` });
  };

  const exportAll = async () => {
    for (const c of proj.canvases) {
      const off = document.createElement("canvas");
      off.width = c.width;
      off.height = c.height;
      const ctx = off.getContext("2d");
      if (!ctx) continue;
      // resolve all images this canvas needs
      const local = new Map<string, HTMLImageElement>();
      let bg: HTMLImageElement | null = null;
      if (c.background.type === "image" && c.background.src) bg = await loadImage(c.background.src);
      for (const el of c.imageElements ?? []) {
        const cached = imageCache.current.get(el.src);
        if (cached) local.set(el.src, cached);
        else {
          const loaded = await loadImage(el.src);
          if (loaded) local.set(el.src, loaded);
        }
      }
      paintCanvas(ctx, c, null, bg, (src) => local.get(src) ?? null);
      download(off.toDataURL("image/png"), `${safe(proj.name)}-${safe(c.name)}.png`);
      await new Promise((r) => setTimeout(r, 250));
    }
    toast({ title: "Exported", description: `${proj.canvases.length} PNGs downloaded` });
  };

  // ---- copywriter hooks ----
  const insertTextLayer = (text: string) => {
    addText(text);
    toast({ title: "Added text layer" });
  };
  const replaceSelected = (text: string) => {
    if (selectedText && !selectedText.locked) updateText(selectedText.id, { text });
  };
  const slideCanvas = (headline: string, body: string): CanvasItem => {
    const c = newCanvas("1:1");
    const head = newTextElement(c, headline);
    head.y = Math.round(c.height * 0.3);
    head.fontSize = Math.round(c.width * 0.08);
    head.fontWeight = "800";
    const para = newTextElement(c, body);
    para.y = Math.round(c.height * 0.58);
    para.fontSize = Math.round(c.width * 0.045);
    para.fontWeight = "400";
    c.textElements = [head, para];
    return c;
  };
  const addSlideCanvas = (headline: string, body: string) => {
    const c = slideCanvas(headline, body);
    setProj((p) => ({ ...p, canvases: [...p.canvases, c] }));
    setActiveCanvasId(c.id);
    toast({ title: "Slide added as a new canvas" });
  };
  const addAllSlides = (slides: { headline: string; body: string }[]) => {
    const created = slides.map((s) => slideCanvas(s.headline, s.body));
    if (!created.length) return;
    setProj((p) => ({ ...p, canvases: [...p.canvases, ...created] }));
    setActiveCanvasId(created[0].id);
    toast({ title: `Added ${created.length} canvases` });
  };

  // ---- templates ----
  const applyTemplate = (tpl: CanvasItem) => {
    const c = canvasFromTemplate(tpl);
    mutateActiveCanvas((cur) => ({
      ...cur,
      aspectRatio: c.aspectRatio,
      width: c.width,
      height: c.height,
      textElements: c.textElements,
      imageElements: c.imageElements,
      shapeElements: c.shapeElements ?? [],
      background: c.background,
    }));
    setSelectedId(null);
    pushHistory({ text: c.textElements.map((e) => ({ ...e })), images: c.imageElements.map((e) => ({ ...e })), shapes: (c.shapeElements ?? []).map((e) => ({ ...e })) });
    toast({ title: "Template applied" });
  };

  // ---- AI assistant (preview → confirm) ----
  const applyPending = () => {
    if (!pendingEdit) return;
    mutateActiveCanvas((c) => ({
      ...c,
      textElements: pendingEdit.textElements,
      imageElements: pendingEdit.imageElements,
      shapeElements: pendingEdit.shapeElements ?? [],
      background: pendingEdit.background,
    }));
    pushHistory({
      text: pendingEdit.textElements.map((e) => ({ ...e })),
      images: pendingEdit.imageElements.map((e) => ({ ...e })),
      shapes: (pendingEdit.shapeElements ?? []).map((e) => ({ ...e })),
    });
    setPendingEdit(null);
    setSelectedId(null);
    toast({ title: "Applied AI changes" });
  };
  const discardPending = () => setPendingEdit(null);

  if (!activeCanvas) return null;

  // Chat turn: stream a canvas edit and auto-apply it directly (no Apply gate).
  const runCanvasTurn = (args: RunTurnArgs) =>
    editCanvasStream(
      { instruction: args.instruction, canvas: activeCanvas, history: [], model: aiModel, images: args.images, resume: args.resume },
      { onThinking: args.onThinking, onSession: args.onSession },
    ).then(({ summary, proposed }) => {
      mutateActiveCanvas(() => proposed);
      pushHistory({ text: proposed.textElements.map((e) => ({ ...e })), images: proposed.imageElements.map((e) => ({ ...e })), shapes: (proposed.shapeElements ?? []).map((e) => ({ ...e })) });
      setSelectedId(null);
      return { summary };
    });

  return (
    <div className="flex h-full">
      <div className="flex h-full min-w-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Projects
        </Button>
        <Input
          value={proj.name}
          onChange={(e) => setProj((p) => ({ ...p, name: e.target.value }))}
          className="h-9 max-w-[240px] font-medium"
        />
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCopywriterOpen(true)} className="rounded-full">
            <Sparkles className="mr-1 h-4 w-4" /> Copywriter
          </Button>
          <Button variant="outline" size="sm" onClick={exportCurrent} className="rounded-full">
            <Download className="mr-1 h-4 w-4" /> Export PNG
          </Button>
          <Button variant="outline" size="sm" onClick={exportAll} className="rounded-full">
            <Images className="mr-1 h-4 w-4" /> Export all
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <aside className="w-60 shrink-0 border-r border-border">
          <Tabs defaultValue="canvases" className="flex h-full flex-col">
            <TabsList className="m-2 grid grid-cols-3">
              <TabsTrigger value="canvases">Canvases</TabsTrigger>
              <TabsTrigger value="layers">Layers</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
            <TabsContent value="canvases" className="m-0 min-h-0 flex-1 overflow-hidden">
              <CanvasList
                canvases={proj.canvases}
                activeId={activeCanvas.id}
                onSelect={setActiveCanvasId}
                onAdd={addCanvas}
                onDuplicate={duplicateCanvas}
                onDelete={deleteCanvas}
                onRename={renameCanvas}
              />
            </TabsContent>
            <TabsContent value="layers" className="m-0 min-h-0 flex-1 overflow-hidden">
              <LayersPanel
                canvas={activeCanvas}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onToggleLock={toggleLock}
              />
            </TabsContent>
            <TabsContent value="templates" className="m-0 min-h-0 flex-1 overflow-hidden">
              <TemplatesPanel
                activeRatio={activeCanvas.aspectRatio}
                currentCanvas={activeCanvas}
                onApply={applyTemplate}
              />
            </TabsContent>
          </Tabs>
        </aside>

        <main className="relative flex min-w-0 flex-1 items-center justify-center overflow-auto bg-muted/30 p-6">
          {pendingEdit && (
            <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 shadow-lg backdrop-blur">
              <span className="text-sm font-medium">AI suggestion — preview</span>
              <Button size="sm" onClick={applyPending} className="h-7 rounded-full">
                <Check className="mr-1 h-3.5 w-3.5" /> Apply
              </Button>
              <Button size="sm" variant="ghost" onClick={discardPending} className="h-7 rounded-full">
                <X className="mr-1 h-3.5 w-3.5" /> Discard
              </Button>
            </div>
          )}
          <div className="relative inline-block">
            <canvas
              ref={canvasRef}
              width={activeCanvas.width}
              height={activeCanvas.height}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={handleDoubleClick}
              style={{ maxWidth: "100%", maxHeight: "72vh", boxShadow: "0 10px 40px rgba(0,0,0,0.25)", display: "block" }}
              className={pendingEdit ? "rounded-sm ring-2 ring-primary" : `rounded-sm ${inlineEditId ? "cursor-text" : "cursor-pointer"}`}
            />
            <InlineTextEditor
              inlineEditId={inlineEditId}
              activeCanvas={activeCanvas}
              canvasRef={canvasRef}
              textareaRef={inlineTextareaRef}
              onUpdate={(id, text) => updateText(id, { text })}
              onCommit={() => { pushHistory(snapshot(activeCanvas)); setInlineEditId(null); }}
              onCancel={() => setInlineEditId(null)}
            />
          </div>
        </main>

        <aside className="w-80 shrink-0 border-l border-border">
          <TextControls
            textElement={selectedText}
            imageElement={selectedImage}
            shapeElement={selectedShape}
            locked={selectedText?.locked ?? selectedImage?.locked ?? selectedShape?.locked ?? false}
            onToggleLock={() => selectedId && toggleLock(selectedId)}
            onTextChange={(patch) => selectedText && updateText(selectedText.id, patch)}
            onImageChange={(patch) => selectedImage && updateImage(selectedImage.id, patch)}
            onShapeChange={(patch) => selectedShape && updateShape(selectedShape.id, patch)}
            onAddText={() => addText()}
            onAddImage={addImage}
            onAddShape={addShape}
            onDuplicate={duplicateSelected}
            onDelete={deleteSelected}
            onUndo={undo}
            canUndo={historyIndex > 0}
            background={activeCanvas.background}
            onBackgroundChange={setBackground}
            onBackgroundImage={onBackgroundImage}
          />
        </aside>
      </div>

      <CopywriterPanel
        open={copywriterOpen}
        onOpenChange={setCopywriterOpen}
        hasSelection={!!selectedText}
        onInsertText={insertTextLayer}
        onReplaceSelected={replaceSelected}
        onAddSlideCanvas={addSlideCanvas}
        onAddAllSlides={addAllSlides}
      />

      </div>

      <ChatSidebar
        projectType="content"
        projectId={proj.id}
        title="AI Designer"
        model={aiModel}
        onModelChange={setAiModel}
        runTurn={runCanvasTurn}
        placeholder="Edit the canvas — reword, recolor, restyle, move…"
        collapsed={chatCollapsed}
        onToggle={() => setChatCollapsed((v) => !v)}
      />
    </div>
  );
};

export default Editor;
