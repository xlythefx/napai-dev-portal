import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, AlertTriangle, X, ImagePlus, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AttachedImage, MAX_ATTACHMENTS, collectImages } from "@/lib/imageInput";

export interface FloatingMessage {
  id: string;
  text: string;
  sender: "user" | "assistant";
  images?: string[];
}

interface FloatingAssistantProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  messages: FloatingMessage[];
  loading: boolean;
  available: boolean | null;
  disabled?: boolean;
  placeholder?: string;
  /** Compact controls (e.g. scope/model selects) shown above the input. */
  extra?: React.ReactNode;
  onSend: (text: string, images: string[]) => void;
}

/**
 * Draggable floating AI bubble (icon + thought bubbles + composer).
 * Same UX as the Content Studio assistant; reused by Slideshow & Video Studio.
 */
const FloatingAssistant = ({
  open,
  onOpenChange,
  messages,
  loading,
  available,
  disabled,
  placeholder = "Tell me what to change…",
  extra,
  onSend,
}: FloatingAssistantProps) => {
  const { toast } = useToast();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [input, setInput] = useState("");
  const [images, setImages] = useState<AttachedImage[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () =>
      setPosition({ x: Math.max(20, window.innerWidth - 180), y: Math.max(200, window.innerHeight - 180) });
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [open]);

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 220)}px`;
  }, [input, open]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setDragOffset({ x: clientX - position.x, y: clientY - position.y });
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 100, clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, clientY - dragOffset.y)),
      });
    };
    const handleEnd = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, dragOffset]);

  const addImages = async (source: DataTransfer | FileList | null) => {
    try {
      const added = await collectImages(source, images.length);
      if (added.length) setImages((prev) => [...prev, ...added]);
      else if (images.length >= MAX_ATTACHMENTS) toast({ title: `Up to ${MAX_ATTACHMENTS} images` });
    } catch (e) {
      toast({ title: "Couldn't add image", description: String((e as Error)?.message || e), variant: "destructive" });
    }
  };
  const removeImage = (id: string) => setImages((prev) => prev.filter((i) => i.id !== id));

  const send = () => {
    const text = input.trim();
    if ((!text && images.length === 0) || loading || disabled) return;
    onSend(text, images.map((i) => i.dataUrl));
    setInput("");
    setImages([]);
  };

  if (!open) return null;

  const visibleMessages = messages.slice(-5);
  const canSend = (input.trim().length > 0 || images.length > 0) && !loading && !disabled;

  return (
    <motion.div
      className="fixed z-50 pointer-events-none"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {/* Thought bubbles */}
      <div className="absolute bottom-20 right-0 flex w-72 max-w-xs flex-col gap-2 pointer-events-auto">
        {(visibleMessages.length > 0 || loading) && (
          <div className="absolute -bottom-4 right-8 h-4 w-1 rounded-full bg-gradient-to-b from-muted to-transparent" />
        )}
        <AnimatePresence mode="popLayout">
          {available === false && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-2 text-xs"
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
              <span className="text-amber-700">Run npm run dev and sign in via claude login</span>
            </motion.div>
          )}
          {visibleMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: msg.sender === "user" ? 20 : -20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: msg.sender === "user" ? 20 : -20, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`relative max-w-[85%] space-y-1 break-words rounded-3xl px-4 py-2 text-xs leading-relaxed ${
                  msg.sender === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-muted text-foreground"
                }`}
              >
                {msg.sender === "assistant" && (
                  <>
                    <div className="absolute -bottom-2 left-4 h-2 w-2 rounded-full border border-border bg-muted" />
                    <div className="absolute -bottom-3.5 left-2 h-1.5 w-1.5 rounded-full border border-border bg-muted" />
                  </>
                )}
                {msg.images && msg.images.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {msg.images.map((src, k) => (
                      <img key={k} src={src} alt="" className="h-12 w-12 rounded object-cover" />
                    ))}
                  </div>
                )}
                {msg.text}
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex justify-start"
            >
              <div className="relative rounded-3xl border border-border bg-muted px-4 py-2 text-foreground">
                <div className="absolute -bottom-2 left-4 h-2 w-2 rounded-full border border-border bg-muted" />
                <div className="absolute -bottom-3.5 left-2 h-1.5 w-1.5 rounded-full border border-border bg-muted" />
                <div className="flex gap-1">
                  {[0, 0.1, 0.2].map((d) => (
                    <motion.span
                      key={d}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: d }}
                      className="h-1.5 w-1.5 rounded-full bg-primary"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Composer */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="absolute bottom-24 right-0 w-80 space-y-2 pointer-events-auto"
      >
        <div className="space-y-2 rounded-lg border border-border bg-background/95 p-2 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            {extra ?? <span />}
            {onOpenChange && (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="Close assistant"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {images.map((img) => (
                <div key={img.id} className="relative">
                  <img src={img.dataUrl} alt="" className="h-12 w-12 rounded border border-border object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-background p-0.5 shadow ring-1 ring-border"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-1">
            <label className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-muted" title="Attach image">
              <ImagePlus className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addImages(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              onPaste={(e) => {
                if (e.clipboardData?.files?.length) {
                  e.preventDefault();
                  addImages(e.clipboardData);
                }
              }}
              placeholder={placeholder}
              disabled={loading || disabled}
              rows={3}
              className="max-h-[220px] min-h-[72px] flex-1 resize-none bg-transparent py-1.5 text-sm leading-relaxed outline-none placeholder-muted-foreground disabled:opacity-50"
            />
            <motion.button
              onClick={send}
              disabled={!canSend}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded p-1 text-primary transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Draggable icon */}
      <motion.button
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        type="button"
        onClick={() => !isDragging && inputRef.current?.focus()}
        className="group relative flex h-16 w-16 cursor-grab items-center justify-center rounded-full shadow-xl pointer-events-auto active:cursor-grabbing"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.96 }}
      >
        {/* soft pulsing glow (faster while thinking) */}
        <motion.div
          className="absolute -inset-2 rounded-full bg-gradient-to-br from-indigo-500/40 via-fuchsia-500/30 to-cyan-400/30 blur-xl"
          animate={{ scale: [1, 1.18, 1], opacity: loading ? [0.6, 1, 0.6] : [0.4, 0.7, 0.4] }}
          transition={{ duration: loading ? 1.2 : 3, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* spinning conic gradient rim (speeds up while thinking) */}
        <motion.div
          className="absolute -inset-[2.5px] rounded-full"
          style={{ background: "conic-gradient(from 0deg, #6366f1, #ec4899, #22d3ee, #6366f1)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: loading ? 1.4 : 7, repeat: Infinity, ease: "linear" }}
        />
        {/* inner disc */}
        <div className="absolute inset-[2px] rounded-full bg-gradient-to-br from-indigo-500 to-violet-600" />
        {/* bobbing bot */}
        <motion.div
          animate={loading ? { rotate: [0, -8, 8, 0], y: [0, -1, 0] } : { y: [0, -2, 0] }}
          transition={{ duration: loading ? 1 : 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 drop-shadow"
        >
          <Bot className="h-8 w-8 text-white" />
        </motion.div>
        {/* status dot */}
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: loading ? 0.8 : 2, repeat: Infinity }}
          className={`absolute -bottom-1 -right-1 z-10 h-3.5 w-3.5 rounded-full border-2 border-white shadow-lg ${loading ? "bg-amber-400 shadow-amber-400/50" : "bg-emerald-400 shadow-emerald-400/50"}`}
        />
      </motion.button>
    </motion.div>
  );
};

export default FloatingAssistant;
