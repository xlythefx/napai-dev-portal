import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, AlertTriangle, X, ImagePlus, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CanvasItem } from "@/lib/contentStudio";
import { CopyModel, getClaudeStatus } from "@/lib/copywriterApi";
import { AssistantMessage, editCanvas } from "@/lib/assistantApi";
import { AttachedImage, MAX_ATTACHMENTS, collectImages } from "@/lib/imageInput";

interface AssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCanvas: CanvasItem;
  pendingActive: boolean;
  onProposal: (proposed: CanvasItem, summary: string) => void;
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: number;
  images?: string[];
}

const MODELS: { value: CopyModel; label: string }[] = [
  { value: "haiku", label: "Haiku" },
  { value: "sonnet", label: "Sonnet" },
  { value: "opus", label: "Opus" },
];

const AssistantPanel = ({ open, onOpenChange, currentCanvas, pendingActive, onProposal }: AssistantPanelProps) => {
  const { toast } = useToast();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [messages, setMessages] = useState<Message[]>([]);
  const [apiMessages, setApiMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [model, setModel] = useState<CopyModel>("haiku");
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getClaudeStatus().then((s) => {
      if (!cancelled) setAvailable(s.ok && s.loggedIn);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      setPosition({
        x: Math.max(20, window.innerWidth - 180),
        y: Math.max(200, window.innerHeight - 180),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [open]);

  // Auto-grow the composer (holds a lot of text, then scrolls).
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input, open]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setDragOffset({
      x: clientX - position.x,
      y: clientY - position.y,
    });
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

  const handleSendMessage = async () => {
    const instruction = input.trim();
    if (!instruction || loading || pendingActive) return;

    const sentImages = images.map((i) => i.dataUrl);
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      text: instruction,
      sender: "user",
      timestamp: Date.now(),
      images: sentImages,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setImages([]);

    setLoading(true);
    try {
      const { summary, proposed } = await editCanvas({
        instruction,
        canvas: currentCanvas,
        history: apiMessages,
        model: "haiku",
        images: sentImages,
      });

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-ast`,
        text: summary,
        sender: "assistant",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setApiMessages((m) => [...m, { role: "user", content: instruction }, { role: "assistant", content: summary }]);
      onProposal(proposed, summary);

      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessage.id));
      }, 5000);
    } catch (e) {
      const msg = String((e as Error)?.message || e);
      const errorMessage: Message = {
        id: `msg-${Date.now()}-err`,
        text: `Oops, something went wrong: ${msg}`,
        sender: "assistant",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setApiMessages((m) => [...m, { role: "user", content: instruction }, { role: "assistant", content: errorMessage.text }]);
      toast({ title: "Assistant failed", description: msg, variant: "destructive" });

      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== errorMessage.id));
      }, 5000);
    } finally {
      setLoading(false);
    }

    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    }, 4000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!open) return null;

  const visibleMessages = messages.slice(-5);
  const canSend = (input.trim().length > 0 || images.length > 0) && !loading && !pendingActive;

  return (
    <motion.div
      ref={containerRef}
      className="fixed z-50 pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Message bubbles container with thought bubble effect */}
      <div className="absolute bottom-20 right-0 flex flex-col gap-2 w-72 max-w-xs pointer-events-auto">
        {/* Connection line from bubbles to robot */}
        {(visibleMessages.length > 0 || loading) && (
          <div className="absolute -bottom-4 right-8 h-4 w-1 bg-gradient-to-b from-muted to-transparent rounded-full" />
        )}

        <AnimatePresence mode="popLayout">
          {available === false && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-2 text-xs"
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500 flex-shrink-0" />
              <span className="text-amber-700">Sign in via claude login</span>
            </motion.div>
          )}

          {visibleMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{
                opacity: 0,
                y: msg.sender === "user" ? 20 : -20,
                scale: 0.8,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: msg.sender === "user" ? 20 : -20,
                scale: 0.8,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] space-y-1 px-4 py-2 rounded-3xl text-xs leading-relaxed break-words relative ${
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground border border-border"
                }`}
              >
                {/* Thought bubble tail */}
                {msg.sender === "assistant" && (
                  <>
                    <div className="absolute -bottom-2 left-4 w-2 h-2 rounded-full bg-muted border border-border" />
                    <div className="absolute -bottom-3.5 left-2 w-1.5 h-1.5 rounded-full bg-muted border border-border" />
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
              <div className="px-4 py-2 rounded-3xl bg-muted text-foreground border border-border relative">
                {/* Thought bubble tail */}
                <div className="absolute -bottom-2 left-4 w-2 h-2 rounded-full bg-muted border border-border" />
                <div className="absolute -bottom-3.5 left-2 w-1.5 h-1.5 rounded-full bg-muted border border-border" />

                <div className="flex gap-1">
                  <motion.span
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    className="w-1.5 h-1.5 bg-primary rounded-full"
                  />
                  <motion.span
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
                    className="w-1.5 h-1.5 bg-primary rounded-full"
                  />
                  <motion.span
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    className="w-1.5 h-1.5 bg-primary rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Composer (always available while open) */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="absolute bottom-24 right-0 w-72 pointer-events-auto space-y-2"
      >
        <div className="space-y-2 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
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
              onKeyDown={handleKeyDown}
              onPaste={(e) => {
                if (e.clipboardData?.files?.length) {
                  e.preventDefault();
                  addImages(e.clipboardData);
                }
              }}
              placeholder="Tell me what to change…"
              disabled={loading || pendingActive}
              rows={1}
              className="max-h-[160px] min-h-[32px] flex-1 resize-none bg-transparent py-1.5 text-xs outline-none placeholder-muted-foreground disabled:opacity-50"
            />
            <motion.button
              onClick={handleSendMessage}
              disabled={!input.trim() || loading || pendingActive}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-1 text-primary hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* AI Assistant Icon */}
      <motion.button
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        type="button"
        onClick={() => {
          if (!isDragging) {
            inputRef.current?.focus();
          }
        }}
        className="pointer-events-auto cursor-grab active:cursor-grabbing relative w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 border-2 border-primary/60 shadow-lg flex items-center justify-center group"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.96 }}
        drag={false}
      >
        {/* Glow effect */}
        <motion.div
          className="absolute -inset-2 rounded-full bg-gradient-to-br from-primary/40 via-transparent to-primary/20 blur-lg opacity-60 group-hover:opacity-100"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        {/* Icon and pulse effect */}
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10"
        >
          <Bot className="w-8 h-8 text-white" />
        </motion.div>

        {/* Pulsing dot */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50 border border-white"
        />
      </motion.button>
    </motion.div>
  );
};

export default AssistantPanel;
