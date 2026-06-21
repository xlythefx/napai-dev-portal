// Floating AI assistant for the Video Studio. Three scopes:
//   - Scene   : edit just the current section's layers/props/timing
//   - Project : generate or restructure the whole timeline (full rebuild)
//   - Append  : add new scenes to the END, keeping the existing timeline intact
// All route to /api/video-edit (streamed). Template (code) authoring now lives on
// its own page (/tools/video-templates) with a docked assistant, so this panel no
// longer vibe-codes templates.

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import FloatingAssistant, { FloatingMessage } from "@/components/ui/floating-assistant";
import { CopyModel, getClaudeStatus } from "@/lib/copywriterApi";
import { AssistantMessage } from "@/lib/videoAssistantApi";
import type { Project } from "@/lib/remotion/types";

export type AssistScope = "scene" | "project" | "append";

interface VideoAssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  targetSceneId: string;
  pendingActive: boolean;
  scope: AssistScope;
  onScopeChange: (scope: AssistScope) => void;
  model: CopyModel;
  /** Stream a Scene/Project/Append edit — builds the timeline live and applies it. */
  onSceneStream: (req: { instruction: string; scope: "scene" | "project" | "append"; images: string[]; history: AssistantMessage[] }) => Promise<{ summary: string }>;
}

let seq = 0;
const newId = () => `m${Date.now()}-${seq++}`;

const VideoAssistantPanel = ({
  open,
  onOpenChange,
  pendingActive,
  scope,
  onScopeChange,
  onSceneStream,
}: VideoAssistantPanelProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<FloatingMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getClaudeStatus().then((s) => !cancelled && setAvailable(s.ok && s.loggedIn));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const drop = (id: string, ms: number) => setTimeout(() => setMessages((m) => m.filter((x) => x.id !== id)), ms);

  const onSend = async (text: string, images: string[]) => {
    if (pendingActive) return;
    const instruction = text || "Use the attached screenshot(s) as the design reference.";
    const userMsg: FloatingMessage = { id: newId(), text: text || "(screenshot)", sender: "user", images };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    try {
      const { summary } = await onSceneStream({ instruction, scope, images, history: apiMessages });
      const astMsg: FloatingMessage = { id: newId(), text: summary, sender: "assistant" };
      setMessages((m) => [...m, astMsg]);
      setApiMessages((a) => [...a, { role: "user", content: instruction }, { role: "assistant", content: summary }]);
      drop(astMsg.id, 6000);
    } catch (e) {
      const msg = String((e as Error)?.message || e);
      const errMsg: FloatingMessage = { id: newId(), text: `Sorry — ${msg}`, sender: "assistant" };
      setMessages((m) => [...m, errMsg]);
      toast({ title: "Assistant failed", description: msg, variant: "destructive" });
      drop(errMsg.id, 7000);
    } finally {
      setLoading(false);
    }
    drop(userMsg.id, 5000);
  };

  const scopes: { key: AssistScope; label: string }[] = [
    { key: "scene", label: "Scene" },
    { key: "project", label: "Project" },
    { key: "append", label: "Append" },
  ];

  const placeholder =
    scope === "project"
      ? "Build or restructure the video… (e.g. a 4-scene promo with an animated title)"
      : scope === "append"
      ? "Add scenes to the end… (e.g. a 3-scene outro with an animated CTA)"
      : "Edit this scene's layers — move, recolor, animate (e.g. fade the title in over 12 frames)…";

  const extra = (
    <div className="flex rounded-md border border-border p-0.5 text-[10px] font-medium">
      {scopes.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onScopeChange(s.key)}
          className={`rounded px-1.5 py-0.5 ${
            scope === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );

  return (
    <FloatingAssistant
      open={open}
      onOpenChange={onOpenChange}
      messages={messages}
      loading={loading}
      available={available}
      disabled={pendingActive}
      placeholder={placeholder}
      extra={extra}
      onSend={onSend}
    />
  );
};

export default VideoAssistantPanel;
