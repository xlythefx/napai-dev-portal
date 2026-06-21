// Video Template page — a shared, DB-backed library of vibe-coded Remotion
// templates, authored away from the video editor with a DOCKED AI sidebar.
//   - Library view : grid of built-in seeds (read-only starters) + DB templates.
//   - Editor view  : live preview + name/description + a props form to exercise
//                    previewProps, with the AI assistant docked on the right.
// Saving writes { code, propsSchema, previewProps } to content_video_templates.
// Templates used inside a video still get embedded into that video's project JSON
// at add-time (see VideoEditor) so the renderer stays self-contained.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Plus, Sparkles, MoreVertical, Pencil, Trash2, Copy, Loader2, Save, Wand2, SlidersHorizontal, Tag, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { confirm } from "@/components/ui/confirm-dialog";
import TemplatePreviewCard from "@/components/video-studio/TemplatePreviewCard";
import ChatSidebar, { type RunTurnArgs } from "@/components/ai-chat/ChatSidebar";
import { editTemplateStream } from "@/lib/videoAssistantApi";
import PropsSchemaForm from "@/components/video-studio/PropsSchemaForm";
import { SEED_TEMPLATES } from "@/lib/remotion/seedTemplates";
import { ASPECT_DIMENSIONS, type AspectRatio, type Template } from "@/lib/remotion/types";
import { uid } from "@/lib/remotion/defaults";
import type { CopyModel } from "@/lib/copywriterApi";
import {
  VideoTemplateRecord,
  createVideoTemplate,
  deleteVideoTemplate,
  listVideoTemplates,
  suggestTags,
  templateIdForRow,
  updateVideoTemplate,
} from "@/lib/videoTemplatesApi";

const ASPECTS: { key: AspectRatio; label: string }[] = [
  { key: "9:16", label: "9:16" },
  { key: "1:1", label: "1:1" },
  { key: "16:9", label: "16:9" },
];

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const VideoTemplateStudio = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const email = user?.email ?? "";

  const [records, setRecords] = useState<VideoTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aspect, setAspect] = useState<AspectRatio>("9:16");
  const [model, setModel] = useState<CopyModel>("sonnet");
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [suggestingTags, setSuggestingTags] = useState(false);

  // editor state (null view = library)
  const [editing, setEditing] = useState(false);
  const [editingDbId, setEditingDbId] = useState<number | null>(null);
  const [working, setWorking] = useState<Template | null>(null);
  const [name, setName] = useState("Untitled template");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const dims = ASPECT_DIMENSIONS[aspect];

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecords(await listVideoTemplates());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ----- open the editor -----
  const startNew = () => {
    setEditingDbId(null);
    setWorking(null);
    setName("Untitled template");
    setDescription("");
    setTags([]);
    setTagInput("");
    setEditing(true);
  };
  const startEdit = (rec: VideoTemplateRecord) => {
    setEditingDbId(rec.dbId);
    setWorking(clone(rec.template));
    setName(rec.name);
    setDescription(rec.description ?? "");
    setTags(rec.template.tags ?? []);
    setTagInput("");
    setEditing(true);
  };
  const startFromSeed = (seed: Template) => {
    const draft: Template = { ...clone(seed), id: uid("tpl"), name: `${seed.name} copy` };
    setEditingDbId(null);
    setWorking(draft);
    setName(draft.name);
    setDescription("");
    setTags(seed.tags ?? []);
    setTagInput("");
    setEditing(true);
  };
  const closeEditor = () => {
    setEditing(false);
    refresh();
  };

  // ----- AI proposal → swap the live preview -----
  const onProposal = (template: Template, _summary: string) => {
    setWorking(template);
    if (name.trim() === "" || name === "Untitled template") setName(template.name);
  };

  // Chat is keyed by the saved template id (vtpl_*) once saved; an unsaved draft
  // shares a single "template-draft" key. runTurn vibe-codes via the stream path.
  const templateChatId = working?.id?.startsWith("vtpl_") ? working.id : "template-draft";
  const runTemplateTurn = (args: RunTurnArgs) =>
    editTemplateStream(
      {
        instruction: args.instruction,
        mode: working ? "edit" : "create",
        template: working ?? undefined,
        history: [],
        model,
        images: args.images,
        resume: args.resume,
      },
      { onThinking: args.onThinking, onSession: args.onSession },
    ).then(({ summary, template }) => {
      onProposal(template, summary);
      return { summary };
    });

  const onPropChange = (key: string, value: string | number) =>
    setWorking((t) => (t ? { ...t, previewProps: { ...t.previewProps, [key]: value } } : t));

  // ----- save to DB -----
  const onSuggestTags = async () => {
    if (!working || suggestingTags) return;
    setSuggestingTags(true);
    try {
      const suggested = await suggestTags({ name: name.trim() || working.name, code: working.code, model });
      setTags((xs) => [...new Set([...xs, ...suggested])]);
    } catch (e) {
      toast({ title: "Couldn't suggest tags", description: String((e as Error)?.message || e), variant: "destructive" });
    } finally {
      setSuggestingTags(false);
    }
  };

  const save = async () => {
    if (!working || saving) return;
    if (!email) {
      toast({ title: "Sign in required", description: "You must be signed in to save templates.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const tpl: Template = { ...working, name: name.trim() || "Untitled template", tags };
      if (editingDbId == null) {
        const id = await createVideoTemplate({ user_email: email, name: tpl.name, description, template: tpl });
        setEditingDbId(id);
        setWorking({ ...tpl, id: templateIdForRow(id) });
        toast({ title: "Template saved", description: "Added to the shared library." });
      } else {
        await updateVideoTemplate({ dbId: editingDbId, name: tpl.name, description, template: tpl });
        toast({ title: "Template updated" });
      }
      refresh();
    } catch (e) {
      toast({ title: "Couldn't save", description: String((e as Error)?.message || e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (rec: VideoTemplateRecord) => {
    if (!(await confirm({ title: `Delete "${rec.name}"?`, description: "This removes the template from the shared library for everyone. This cannot be undone.", confirmText: "Delete", tone: "danger" }))) return;
    try {
      await deleteVideoTemplate(rec.dbId);
      refresh();
    } catch (e) {
      toast({ title: "Couldn't delete", description: String((e as Error)?.message || e), variant: "destructive" });
    }
  };

  // ===================== EDITOR VIEW (full screen) =====================
  if (editing) {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
          <Button variant="ghost" size="sm" onClick={closeEditor}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Templates
          </Button>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 max-w-[220px] font-medium" placeholder="Template name" />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-9 max-w-[280px] text-sm"
            placeholder="Short description (optional)"
          />
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-full border border-border p-0.5 text-xs">
              {ASPECTS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => setAspect(a.key)}
                  className={`rounded-full px-2.5 py-1 ${aspect === a.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={save} disabled={!working || saving} className="rounded-full">
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              {editingDbId == null ? "Save to library" : "Save"}
            </Button>
          </div>
        </div>

        {/* Tags — AI-suggested, editable; help the video AI pick this template to reuse */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/20 px-4 py-1.5">
          <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
              {t}
              <button
                type="button"
                onClick={() => setTags((xs) => xs.filter((x) => x !== t))}
                aria-label={`Remove ${t}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                e.preventDefault();
                const t = tagInput.trim().toLowerCase();
                setTags((xs) => (xs.includes(t) ? xs : [...xs, t]));
                setTagInput("");
              } else if (e.key === "Backspace" && !tagInput && tags.length) {
                setTags((xs) => xs.slice(0, -1));
              }
            }}
            placeholder={tags.length ? "Add tag…" : "Tags — Enter or comma to add"}
            className="h-7 min-w-[140px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={onSuggestTags}
            disabled={!working || suggestingTags}
            className="h-7 shrink-0 rounded-full text-xs"
            title="Let AI suggest tags from this template"
          >
            {suggestingTags ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
            Suggest
          </Button>
        </div>

        {/* Body: preview + props (left) / AI sidebar (right) */}
        <div className="flex min-h-0 flex-1">
          <main className="flex min-h-0 flex-1 flex-col bg-muted/30">
            <div className="flex min-h-0 flex-1 items-center justify-center p-6">
              {working ? (
                <div className="h-full max-h-full w-auto" style={{ aspectRatio: `${dims.width} / ${dims.height}` }}>
                  <TemplatePreviewCard
                    code={working.code}
                    props={working.previewProps}
                    width={dims.width}
                    height={dims.height}
                    durationInFrames={90}
                    className="h-full w-full rounded-lg"
                  />
                </div>
              ) : (
                <div className="flex max-w-sm flex-col items-center gap-3 text-center text-muted-foreground">
                  <Wand2 className="h-10 w-10 opacity-60" />
                  <p className="text-lg font-medium text-foreground">Describe your template</p>
                  <p className="text-sm">Use the AI builder on the right to vibe-code a Remotion component. It'll preview here live — then tweak its props and Save.</p>
                </div>
              )}
            </div>

            {working && working.propsSchema.length > 0 && (
              <div className="max-h-[42%] shrink-0 overflow-y-auto border-t border-border bg-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Preview props</p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                    {working.propsSchema.length} {working.propsSchema.length === 1 ? "field" : "fields"}
                  </span>
                </div>
                <PropsSchemaForm schema={working.propsSchema} values={working.previewProps} email={email} onChange={onPropChange} layout="grid" />
              </div>
            )}
          </main>

          <ChatSidebar
            projectType="template"
            projectId={templateChatId}
            title="AI Template Builder"
            model={model}
            onModelChange={setModel}
            runTurn={runTemplateTurn}
            placeholder={working ? "Refine the motion, colors, layout…" : "Describe a template to create… (e.g. a neon countdown title)"}
            disabled={saving}
            collapsed={chatCollapsed}
            onToggle={() => setChatCollapsed((v) => !v)}
          />
        </div>
      </div>
    );
  }

  // ===================== LIBRARY VIEW =====================
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="px-4 pb-24 pt-32">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
          >
            <div>
              <div className="mb-2 inline-flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-primary">Video Templates</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tighter md:text-5xl">Template library</h1>
              <p className="mt-2 text-muted-foreground">
                Vibe-code reusable animated templates with AI. Saved templates are shared and show up in every video's Templates panel.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full border border-border p-0.5 text-xs">
                {ASPECTS.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => setAspect(a.key)}
                    className={`rounded-full px-2.5 py-1 ${aspect === a.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <Button onClick={startNew} className="rounded-full">
                <Plus className="mr-2 h-4 w-4" /> New template
              </Button>
            </div>
          </motion.div>

          {/* Built-in starters */}
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Built-in starters</h2>
          <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SEED_TEMPLATES.map((t) => (
              <Card key={t.id} className="group overflow-hidden">
                <div className="relative" style={{ aspectRatio: `${dims.width} / ${dims.height}` }}>
                  <TemplatePreviewCard
                    code={t.code}
                    props={t.previewProps}
                    width={dims.width}
                    height={dims.height}
                    durationInFrames={90}
                    className="h-full w-full"
                  />
                  <Badge variant="secondary" className="absolute left-2 top-2">Built-in</Badge>
                </div>
                <div className="flex items-center justify-between gap-1 p-3">
                  <span className="truncate text-sm font-medium">{t.name}</span>
                  <Button size="sm" variant="outline" className="h-7 shrink-0 rounded-full text-xs" onClick={() => startFromSeed(t)}>
                    <Copy className="mr-1 h-3 w-3" /> Customize
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Shared (DB) templates */}
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Shared templates</h2>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <Card className="flex flex-col items-center gap-3 p-12 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={refresh}>Retry</Button>
            </Card>
          ) : records.length === 0 ? (
            <Card
              className="flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-16 text-center hover:border-primary/50"
              onClick={startNew}
            >
              <Wand2 className="h-10 w-10 text-muted-foreground" />
              <p className="text-lg font-medium">Create your first template</p>
              <p className="max-w-sm text-sm text-muted-foreground">Describe a look and the AI will write the Remotion component for you.</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {records.map((rec, i) => (
                <motion.div key={rec.dbId} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="group overflow-hidden">
                    <div className="relative cursor-pointer" style={{ aspectRatio: `${dims.width} / ${dims.height}` }} onClick={() => startEdit(rec)}>
                      <TemplatePreviewCard
                        code={rec.template.code}
                        props={rec.template.previewProps}
                        width={dims.width}
                        height={dims.height}
                        durationInFrames={90}
                        className="h-full w-full"
                      />
                      <div className="absolute right-2 top-2" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => startEdit(rec)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => remove(rec)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-medium">{rec.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{rec.description || "No description"}</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <Link to="/tools/video-studio">
              <Button variant="ghost" className="text-muted-foreground">← Back to Video Studio</Button>
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default VideoTemplateStudio;
