import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import FloatingAssistant, { FloatingMessage } from "@/components/ui/floating-assistant";
import { CopyModel, getClaudeStatus } from "@/lib/copywriterApi";
import { AssistantMessage, DeckEditScope, editDeck } from "@/lib/slideshowAssistantApi";
import { Slide, Slideshow } from "@/lib/slideshow";

interface SlideAssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck: Slideshow;
  targetSlideId: string;
  pendingActive: boolean;
  onProposal: (proposedSlides: Slide[], summary: string, changedSlideIds: string[], replace: boolean) => void;
}

let msgSeq = 0;
const newId = () => `m${Date.now()}-${msgSeq++}`;

const SlideAssistantPanel = ({ open, onOpenChange, deck, targetSlideId, pendingActive, onProposal }: SlideAssistantPanelProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<FloatingMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<AssistantMessage[]>([]);
  const [scope, setScope] = useState<DeckEditScope>("deck");
  const [model, setModel] = useState<CopyModel>("haiku");
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!import.meta.env.DEV) {
      setAvailable(true);
      return;
    }
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
      const { summary, proposedSlides, changedSlideIds, replace } = await editDeck({
        instruction,
        scope,
        targetSlideId,
        deck,
        history: apiMessages,
        model,
        images,
      });
      if (!proposedSlides.length) throw new Error("The assistant didn't return any changes.");
      const astMsg: FloatingMessage = { id: newId(), text: summary, sender: "assistant" };
      setMessages((m) => [...m, astMsg]);
      setApiMessages((a) => [...a, { role: "user", content: instruction }, { role: "assistant", content: summary }]);
      onProposal(proposedSlides, summary, changedSlideIds, replace);
      drop(astMsg.id, 6000);
    } catch (e) {
      const msg = String((e as Error)?.message || e);
      const errMsg: FloatingMessage = { id: newId(), text: `Sorry — ${msg}`, sender: "assistant" };
      setMessages((m) => [...m, errMsg]);
      toast({ title: "Assistant failed", description: msg, variant: "destructive" });
      drop(errMsg.id, 6000);
    } finally {
      setLoading(false);
    }
    drop(userMsg.id, 5000);
  };

  const extra = (
    <div className="flex items-center gap-1.5">
      <div className="flex rounded-md border border-border p-0.5 text-[10px] font-medium">
        {(["slide", "deck"] as DeckEditScope[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={`rounded px-1.5 py-0.5 ${scope === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {s === "slide" ? "Slide" : "Deck"}
          </button>
        ))}
      </div>
      <select
        value={model}
        onChange={(e) => setModel(e.target.value as CopyModel)}
        className="rounded border border-border bg-transparent px-1 py-0.5 text-[10px] outline-none"
      >
        <option value="haiku">Haiku</option>
        <option value="sonnet">Sonnet</option>
        <option value="opus">Opus</option>
      </select>
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
      placeholder={scope === "deck" ? "Generate or change the deck… (e.g. create 8 slides)" : "Change this slide…"}
      extra={extra}
      onSend={onSend}
    />
  );
};

export default SlideAssistantPanel;
