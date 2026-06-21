// Persistent, collapsible VSCode-style AI sidebar shared by every studio.
// Multiple named chat sessions per project (tabs: new / rename / close / switch),
// a transcript that streams the model's THINKING and its answer, and a composer.
// Studio-agnostic: each studio passes a `runTurn` that performs the actual AI
// edit and streams thinking/session back. Session memory is retained server-side
// via resume (the active tab's claudeSessionId), so turns continue one session.

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Brain, ImagePlus, Loader2, MessageSquare,
  PanelRightClose, PanelRightOpen, Plus, Send, Sparkles, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AttachedImage, MAX_ATTACHMENTS, collectImages } from "@/lib/imageInput";
import { CopyModel, getClaudeStatus } from "@/lib/copywriterApi";
import type { ChatMessage, ChatProjectType } from "@/lib/chatSessionsApi";
import { useProjectChats } from "./useProjectChats";

export interface RunTurnArgs {
  instruction: string;
  images: string[];
  resume: string | null; // active tab's Claude session id → retained memory
  onThinking: (text: string) => void;
  onSession: (sessionId: string) => void;
}

interface ChatSidebarProps {
  projectType: ChatProjectType;
  projectId: string;
  title?: string;
  model: CopyModel;
  onModelChange: (model: CopyModel) => void;
  /** Run one AI turn. Stream reasoning via onThinking, capture the resumable
   *  session via onSession, resolve with a short user-facing summary. */
  runTurn: (args: RunTurnArgs) => Promise<{ summary: string }>;
  /** Extra composer controls (e.g. the video scope selector). */
  controls?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  collapsed: boolean;
  onToggle: () => void;
  /** Float as a rounded card pinned to the bottom-right instead of a docked rail. */
  floating?: boolean;
}

const updateLast = (msgs: ChatMessage[], patch: (m: ChatMessage) => ChatMessage): ChatMessage[] =>
  msgs.map((m, i) => (i === msgs.length - 1 ? patch(m) : m));

// Live reasoning: a fixed-height window that auto-scrolls to the newest text as
// it streams, with no visible scrollbar — the thought just keeps coming.
const StreamingThinking = ({ text }: { text: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setSecs(Math.round((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [text]);
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-2">
      <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        <Brain className="h-3 w-3 animate-pulse" /> Thinking…
        {secs > 0 && <span className="tabular-nums text-muted-foreground/70">{secs}s</span>}
      </div>
      <div ref={ref} className="no-scrollbar max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px] text-muted-foreground">
        {text}
      </div>
    </div>
  );
};

const ChatSidebar = ({
  projectType, projectId, title = "AI Assistant",
  model, onModelChange, runTurn, controls, placeholder, disabled, collapsed, onToggle, floating = false,
}: ChatSidebarProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const email = user?.email ?? "";

  const chats = useProjectChats(email, projectType, projectId);
  const { tabs, active, activeId, ready } = chats;

  const [input, setInput] = useState("");
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    getClaudeStatus().then((s) => !cancelled && setAvailable(s.ok && s.loggedIn)).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages, loading]);

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

  const send = async () => {
    const text = input.trim();
    if ((!text && images.length === 0) || loading || disabled || !active) return;
    const imgs = images.map((i) => i.dataUrl);
    const instruction = text || "Use the attached screenshot(s) as the design reference.";

    // Append the user turn + a streaming assistant placeholder.
    chats.setActiveMessages((m) => [
      ...m,
      { role: "user", content: text || "(screenshot)", images: imgs },
      { role: "assistant", content: "", thinking: "", streaming: true },
    ]);
    setInput("");
    setImages([]);
    setLoading(true);
    const startedAt = Date.now();

    try {
      const { summary } = await runTurn({
        instruction,
        images: imgs,
        resume: active.claudeSessionId,
        onThinking: (t) => chats.setActiveMessages((m) => updateLast(m, (x) => ({ ...x, thinking: (x.thinking || "") + t }))),
        onSession: (sid) => chats.setActiveSession(sid),
      });
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      chats.setActiveMessages((m) => updateLast(m, (x) => ({
        ...x,
        content: summary || "Done.",
        streaming: false,
        thinkingSeconds: x.thinking ? elapsed : undefined,
      })));
    } catch (e) {
      const msg = String((e as Error)?.message || e);
      chats.setActiveMessages((m) => updateLast(m, (x) => ({ ...x, content: `Sorry — ${msg}`, streaming: false })));
      toast({ title: "Assistant failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
      // Persist after state has committed.
      setTimeout(() => chats.persistActive(), 0);
    }
  };

  const startRename = (id: string, current: string) => { setRenamingId(id); setRenameVal(current); };
  const commitRename = () => {
    if (renamingId) chats.renameTab(renamingId, renameVal);
    setRenamingId(null);
  };

  const collapsedRail = (
    <button
      type="button"
      onClick={onToggle}
      title="Open AI chat"
      className="flex h-full w-full flex-col items-center gap-3 py-3 text-muted-foreground hover:text-foreground"
    >
      <PanelRightOpen className="h-5 w-5" />
      <Sparkles className="h-4 w-4 text-primary" />
    </button>
  );

  const body = (
        <>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{title}</span>
            </div>
            <div className="flex items-center gap-1.5">
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
              <button type="button" onClick={onToggle} title="Hide AI chat" className="rounded p-1 text-muted-foreground hover:bg-muted">
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Session tabs */}
          <div className="flex items-stretch gap-px overflow-x-auto border-b border-border bg-muted/30">
            {tabs.map((t) => (
              <div
                key={t.id}
                onClick={() => chats.switchTo(t.id)}
                className={`group flex cursor-pointer items-center gap-1 whitespace-nowrap px-2 py-1.5 text-xs ${
                  t.id === activeId ? "bg-background font-medium text-foreground" : "text-muted-foreground hover:bg-background/60"
                }`}
              >
                <MessageSquare className="h-3 w-3 shrink-0" />
                {renamingId === t.id ? (
                  <input
                    autoFocus
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingId(null); }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-20 rounded border border-border bg-background px-1 text-xs outline-none"
                  />
                ) : (
                  <span onDoubleClick={(e) => { e.stopPropagation(); startRename(t.id, t.title); }} title="Double-click to rename">
                    {t.title}
                  </span>
                )}
                {tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); chats.closeTab(t.id); }}
                    className="rounded p-0.5 opacity-0 hover:bg-muted group-hover:opacity-100"
                    aria-label="Close chat"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => chats.addTab()} title="New chat" className="px-2 text-muted-foreground hover:bg-background/60 hover:text-foreground">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Transcript */}
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {available === false && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>Run <code>npm run dev</code> and sign in via <code>claude login</code> to use the assistant.</span>
              </div>
            )}
            {ready && (active?.messages.length ?? 0) === 0 && available !== false && (
              <div className="flex flex-col items-center gap-2 px-2 py-10 text-center text-muted-foreground">
                <Sparkles className="h-6 w-6 opacity-60" />
                <p className="text-sm font-medium text-foreground">Ask the AI to build or edit</p>
                <p className="text-xs">Describe what you want. I remember this chat, so you can keep refining across messages.</p>
              </div>
            )}
            {(active?.messages ?? []).map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[90%] space-y-1.5 break-words rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-muted text-foreground"
                  }`}
                >
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {msg.images.map((src, k) => <img key={k} src={src} alt="" className="h-12 w-12 rounded object-cover" />)}
                    </div>
                  )}
                  {msg.role === "assistant" && msg.thinking ? (
                    msg.streaming ? (
                      <StreamingThinking text={msg.thinking} />
                    ) : (
                      <details className="rounded-lg border border-border/60 bg-background/40">
                        <summary className="flex cursor-pointer items-center gap-1 p-2 text-[11px] font-medium text-muted-foreground">
                          <Brain className="h-3 w-3" />
                          {msg.thinkingSeconds ? `Thought for ${msg.thinkingSeconds} seconds` : "Thought process"}
                        </summary>
                        <div className="max-h-48 overflow-y-auto whitespace-pre-wrap p-2 pt-0 text-[11px] text-muted-foreground">{msg.thinking}</div>
                      </details>
                    )
                  ) : null}
                  {msg.content && <div className="whitespace-pre-wrap">{msg.content}</div>}
                  {msg.role === "assistant" && msg.streaming && !msg.thinking && (
                    <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Working…</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className="space-y-2 border-t border-border p-2">
            {controls}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {images.map((img) => (
                  <div key={img.id} className="relative">
                    <img src={img.dataUrl} alt="" className="h-12 w-12 rounded border border-border object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((x) => x.id !== img.id))}
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
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
              </label>
              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                onPaste={(e) => { if (e.clipboardData?.files?.length) { e.preventDefault(); addImages(e.clipboardData); } }}
                placeholder={placeholder ?? "Ask the AI to edit or create…"}
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
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </>
  );

  if (floating) {
    // Lovable-style: still reserves its column on the side, but the panel floats
    // inside a gutter as a rounded, glowing card (not flush to the screen edge).
    return (
      <aside
        className={`h-full shrink-0 p-3 transition-[width] duration-300 ease-in-out ${
          collapsed ? "w-16" : "w-[400px]"
        }`}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={onToggle}
            title="Open AI chat"
            className="flex h-full w-full flex-col items-center gap-3 rounded-2xl border border-border bg-background py-3 text-muted-foreground shadow-lg transition hover:text-foreground"
          >
            <PanelRightOpen className="h-5 w-5" />
            <Sparkles className="h-4 w-4 text-primary" />
          </button>
        ) : (
          <div className="relative h-full">
            {/* glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-1 rounded-[1.6rem] bg-gradient-to-b from-primary/40 via-fuchsia-500/25 to-cyan-400/30 opacity-70 blur-xl"
            />
            <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl ring-1 ring-primary/10">
              {body}
            </div>
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside
      className={`flex h-full shrink-0 flex-col overflow-hidden border-l border-border bg-background transition-[width] duration-300 ease-in-out ${
        collapsed ? "w-12" : "w-[360px]"
      }`}
    >
      {collapsed ? collapsedRail : body}
    </aside>
  );
};

export default ChatSidebar;
