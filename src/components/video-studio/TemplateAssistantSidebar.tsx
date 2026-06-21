// Docked AI assistant for the Video Template page. Unlike the editor's floating
// bubble, this is a fixed sidebar column: header + scrollable transcript + composer.
// It owns the chat history and calls editTemplate (/api/template-edit) to vibe-code
// the working template — create when there's nothing yet, edit to refine it. Each
// successful response is handed up via onProposal, which swaps the live preview.

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, ImagePlus, X, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AttachedImage, MAX_ATTACHMENTS, collectImages } from "@/lib/imageInput";
import { CopyModel, getClaudeStatus } from "@/lib/copywriterApi";
import { AssistantMessage, editTemplate } from "@/lib/videoAssistantApi";
import type { Template } from "@/lib/remotion/types";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  images?: string[];
}

interface TemplateAssistantSidebarProps {
  /** The template being iterated on (null until the AI creates the first one). */
  workingTemplate: Template | null;
  model: CopyModel;
  onModelChange: (model: CopyModel) => void;
  /** A new/edited template the user can keep — applied to the live preview. */
  onProposal: (template: Template, summary: string) => void;
  disabled?: boolean;
}

let seq = 0;
const newId = () => `m${Date.now()}-${seq++}`;

const TemplateAssistantSidebar = ({
  workingTemplate,
  model,
  onModelChange,
  onProposal,
  disabled,
}: TemplateAssistantSidebarProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    getClaudeStatus().then((s) => !cancelled && setAvailable(s.ok && s.loggedIn)).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

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

  const send = async () => {
    const text = input.trim();
    if ((!text && images.length === 0) || loading || disabled) return;
    const imgs = images.map((i) => i.dataUrl);
    const instruction = text || "Use the attached screenshot(s) as the design reference.";
    setMessages((m) => [...m, { id: newId(), sender: "user", text: text || "(screenshot)", images: imgs }]);
    setInput("");
    setImages([]);
    setLoading(true);
    try {
      const mode = workingTemplate ? "edit" : "create";
      const { summary, template } = await editTemplate({
        instruction,
        mode,
        template: mode === "edit" ? workingTemplate ?? undefined : undefined,
        history: apiMessages,
        model,
        images: imgs,
      });
      setMessages((m) => [...m, { id: newId(), sender: "assistant", text: summary }]);
      setApiMessages((a) => [...a, { role: "user", content: instruction }, { role: "assistant", content: summary }]);
      onProposal(template, summary);
    } catch (e) {
      const msg = String((e as Error)?.message || e);
      setMessages((m) => [...m, { id: newId(), sender: "assistant", text: `Sorry — ${msg}` }]);
      toast({ title: "Assistant failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const placeholder = workingTemplate
    ? "Refine it — change the motion, colors, layout…"
    : "Describe a template to create… (e.g. a neon countdown title)";

  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">AI Template Builder</span>
        </div>
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value as CopyModel)}
          className="h-7 rounded-full border border-border bg-transparent px-2 text-xs outline-none"
          title="AI model"
        >
          <option value="haiku">Haiku</option>
          <option value="sonnet">Sonnet</option>
          <option value="opus">Opus</option>
        </select>
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {available === false && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span>Run <code>npm run dev</code> and sign in via <code>claude login</code> to use the assistant.</span>
          </div>
        )}
        {messages.length === 0 && available !== false && (
          <div className="flex flex-col items-center gap-2 px-2 py-10 text-center text-muted-foreground">
            <Sparkles className="h-6 w-6 opacity-60" />
            <p className="text-sm font-medium text-foreground">Vibe-code a template</p>
            <p className="text-xs">Describe the look and motion you want. I'll write the Remotion component and you can refine it here, then Save.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] space-y-1 break-words rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                msg.sender === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-muted text-foreground"
              }`}
            >
              {msg.images && msg.images.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {msg.images.map((src, k) => (
                    <img key={k} src={src} alt="" className="h-12 w-12 rounded object-cover" />
                  ))}
                </div>
              )}
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Writing the template…
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="space-y-2 border-t border-border p-2">
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
        <div className="flex items-end gap-1 rounded-lg border border-border bg-background p-1">
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
            ref={taRef}
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
            rows={2}
            className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent py-1.5 text-sm leading-relaxed outline-none placeholder-muted-foreground disabled:opacity-50"
          />
          <button
            type="button"
            onClick={send}
            disabled={(!input.trim() && images.length === 0) || loading || disabled}
            className="rounded p-1.5 text-primary transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateAssistantSidebar;
