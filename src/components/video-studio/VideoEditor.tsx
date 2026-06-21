// Video Studio editor (flat-timeline, v3). Center: live <Player> +
// direct-manipulation EditOverlay + transport. Left: clip inspector + Effect
// Controls (keyframes). Right: draggable Templates + Animation presets. Bottom:
// multi-track Timeline (clips are the rectangles). Clips are the source of truth
// (project.clips/tracks/background); scenes are derived only on save / for AI.

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Player, type PlayerRef, type CallbackListener } from "@remotion/player";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Film, Play, Pause, Undo2, Redo2, Moon, Sun, Plus, BookmarkPlus, Sparkles, LayoutTemplate, FolderOpen, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { CopyModel } from "@/lib/copywriterApi";
import { TimelineComposition } from "@/components/remotion/TimelineComposition";
import { compileTemplateMap, type TemplateComponent } from "@/lib/remotion/compileTemplate";
import { uid } from "@/lib/remotion/defaults";
import { projectDuration } from "@/lib/remotion/timing";
import { migrateToFlat, flattenToScenes, sceneToClips, shiftLayerKeyframes } from "@/lib/remotion/migrateV3";
import { editVideoProject, editVideoProjectStream, type VideoEditScope, type PresetCatalogEntry } from "@/lib/videoAssistantApi";
import { autoArrange, bumpClipFromOverlap, newClip, newTrack, newSection, cloneClip, trackHasRoom } from "@/lib/remotion/clips";
import { splitClipAt, rippleDelete as rippleDeleteClips } from "@/lib/remotion/clipOps";
import { applyPreset } from "@/lib/remotion/animationPresets";
import {
  defaultBackground,
  evalColor,
  evalNumber,
  getAnimatable,
  isAnimated,
  moveKeyframe,
  newAudioLayer,
  newComponentLayer,
  newImageLayer,
  newShapeLayer,
  newTextLayer,
  newVideoLayer,
  removeKeyframe,
  setAnimatableOnLayer,
  setKeyframe,
  setKeyframeEasing,
  toggleKeyframed,
  type Animatable,
  type Easing,
  type Layer,
  type SceneBackground,
  type ShapeLayer,
} from "@/lib/remotion/layers";
import type { Clip, MediaRef, Project, Scene, ScenesProject, Section, Template, Track, TrackKind } from "@/lib/remotion/types";
import EditOverlay, { type TransformPatch } from "./EditOverlay";
import LayerInspector from "./LayerInspector";
import EffectControls from "./EffectControls";
import Timeline from "./Timeline";
import TemplateLibrary from "./TemplateLibrary";
import PresetLibrary from "./PresetLibrary";
import AssetPanel from "./AssetPanel";
import type { AlignKind } from "./AlignToolbar";
import { type AssistScope } from "./VideoAssistantPanel";
import ChatSidebar, { type RunTurnArgs } from "@/components/ai-chat/ChatSidebar";
import SavePresetDialog from "./SavePresetDialog";
import RenderDialog from "./RenderDialog";
import { listVideoTemplates, listScenePresets, createScenePreset, type ScenePreset } from "@/lib/videoTemplatesApi";

interface VideoEditorProps {
  project: Project;
  onChange: (project: Project) => void;
  onBack: () => void;
}

type LeftTab = "properties" | "templates" | "presets" | "assets";
const LEFT_TABS: { key: LeftTab; label: string; icon: typeof Plus }[] = [
  { key: "properties", label: "Properties", icon: SlidersHorizontal },
  { key: "templates", label: "Templates", icon: LayoutTemplate },
  { key: "presets", label: "Presets", icon: Sparkles },
  { key: "assets", label: "Assets", icon: FolderOpen },
];

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Defensive: guarantee the project carries the v3 flat-timeline fields. */
function ensureFlat(p: Project): Project {
  if (Array.isArray(p.clips) && Array.isArray(p.tracks) && p.background) return p;
  return migrateToFlat(p);
}

function nextTrackName(p: Project, kind: TrackKind): string {
  const n = p.tracks.filter((t) => t.kind === kind).length + 1;
  return kind === "video" ? `V${n}` : `A${n}`;
}

const FONT_FAMILIES = ["Poppins", "Inter", "Montserrat", "Roboto", "Open+Sans", "Lato", "Playfair+Display", "Oswald"];

const VideoEditor = ({ project: initial, onChange, onBack }: VideoEditorProps) => {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const { toast } = useToast();
  const navigate = useNavigate();

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [project, setProject] = useState<Project>(() => ensureFlat(initial));
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const [autoKeyframe, setAutoKeyframe] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Dark editor: toggle `dark` on <html>; restore the app's prior theme on close.
  useEffect(() => {
    const html = document.documentElement;
    const had = html.classList.contains("dark");
    return () => { had ? html.classList.add("dark") : html.classList.remove("dark"); };
  }, []);
  useEffect(() => {
    const html = document.documentElement;
    darkMode ? html.classList.add("dark") : html.classList.remove("dark");
  }, [darkMode]);

  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [leftTab, setLeftTab] = useState<LeftTab>("properties");
  const [timelineH, setTimelineH] = useState(260);
  const [assistScope, setAssistScope] = useState<AssistScope>("scene");
  const [aiModel, setAiModel] = useState<CopyModel>("sonnet");
  const [configuring, setConfiguring] = useState(false); // AI is applying timeline edits
  const [renderOpen, setRenderOpen] = useState(false);

  // The shared template library (built-in seeds + DB). Authoring lives on the
  // Template Studio page; here we only browse it and embed-on-use.
  const [dbTemplates, setDbTemplates] = useState<Template[]>([]);
  useEffect(() => {
    let cancelled = false;
    listVideoTemplates()
      .then((recs) => !cancelled && setDbTemplates(recs.map((r) => r.template)))
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Reusable scene presets (self-growing library); refreshable after a save.
  const [scenePresets, setScenePresets] = useState<ScenePreset[]>([]);
  const [presetDraft, setPresetDraft] = useState<{ scene: Scene; templates: Template[]; summary: string; defaultName: string } | null>(null);
  const [savingPreset, setSavingPreset] = useState(false);
  const refreshPresets = useCallback(() => {
    listScenePresets().then(setScenePresets).catch(() => {});
  }, []);
  useEffect(() => { refreshPresets(); }, [refreshPresets]);

  const playerRef = useRef<PlayerRef>(null);

  const projectRef = useRef(project);
  projectRef.current = project;
  const historyRef = useRef<{ stack: string[]; index: number }>({ stack: [JSON.stringify(ensureFlat(initial))], index: 0 });
  const [, setHistVersion] = useState(0);
  const clipboardRef = useRef<Clip[]>([]);
  const streamingRef = useRef(false); // suppress history/autosave while the AI streams edits

  const recordHistory = useCallback(() => {
    if (streamingRef.current) return; // coalesce a streamed edit into ONE snapshot (taken on done)
    const h = historyRef.current;
    const json = JSON.stringify(projectRef.current);
    if (json === h.stack[h.index]) return;
    h.stack = [...h.stack.slice(0, h.index + 1), json].slice(-60);
    h.index = h.stack.length - 1;
    setHistVersion((v) => v + 1);
  }, []);
  const undo = useCallback(() => {
    recordHistory();
    const h = historyRef.current;
    if (h.index <= 0) return;
    h.index -= 1;
    setProject(JSON.parse(h.stack[h.index]));
    setHistVersion((v) => v + 1);
  }, [recordHistory]);
  const redo = useCallback(() => {
    const h = historyRef.current;
    if (h.index >= h.stack.length - 1) return;
    h.index += 1;
    setProject(JSON.parse(h.stack[h.index]));
    setHistVersion((v) => v + 1);
  }, []);
  const canUndo = historyRef.current.index > 0;
  const canRedo = historyRef.current.index < historyRef.current.stack.length - 1;

  useEffect(() => {
    const t = setTimeout(recordHistory, 400);
    return () => clearTimeout(t);
  }, [project, recordHistory]);

  // Editor fonts for text layers.
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${FONT_FAMILIES.map((f) => `family=${f}:wght@300;400;500;600;700;800;900`).join("&")}&display=swap`;
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
  }, []);

  // Autosave (debounced; paused while the AI streams — saved once on done).
  useEffect(() => {
    const t = setTimeout(() => { if (!streamingRef.current) onChangeRef.current(project); }, 500);
    return () => clearTimeout(t);
  }, [project]);

  // ----- derived -----
  const selectedClips = useMemo(() => project.clips.filter((c) => selectedClipIds.includes(c.id)), [project.clips, selectedClipIds]);
  const selectedClip = selectedClips[0] ?? null;

  // Merged library shown in the Templates panel: project-embedded first (the copy
  // used at render), then any remaining shared DB templates (deduped by id).
  const libraryTemplates = useMemo<Template[]>(() => {
    const byId = new Map<string, Template>();
    for (const t of project.templates) byId.set(t.id, t);
    for (const t of dbTemplates) if (!byId.has(t.id)) byId.set(t.id, t);
    return [...byId.values()];
  }, [project.templates, dbTemplates]);

  // Token-light preset catalog for the AI (+ ordered text slots it can fill).
  const presetCatalog = useMemo<PresetCatalogEntry[]>(
    () =>
      scenePresets.map((p) => ({
        id: p.id,
        name: p.name,
        tags: p.tags,
        description: p.description ?? undefined,
        slots: (p.scene.layers ?? []).flatMap((l) => (l.type === "text" ? [l.text] : [])),
      })),
    [scenePresets],
  );

  /** Clip-local playhead for a clip (keyframes are clip-local). */
  const localFrameOf = useCallback(
    (clip: Clip) => Math.max(0, Math.min(frame - clip.startFrame, Math.max(0, clip.durationInFrames - 1))),
    [frame]
  );
  const localFrame = selectedClip ? localFrameOf(selectedClip) : 0;

  // ----- preview (templates compiled from the embedded project copy) -----
  const templatesKey = useMemo(() => hashString(project.templates.map((t) => `${t.id}:${t.code}`).join("|")), [project.templates]);
  const components = useMemo<Record<string, TemplateComponent>>(
    () => compileTemplateMap(project.templates).components,
    [templatesKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const durationInFrames = Math.max(1, projectDuration({ durationInFrames: project.durationInFrames, clips: project.clips }));
  const hasContent = project.clips.length > 0;

  // ----- Player frame/playing sync -----
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const onFrame: CallbackListener<"frameupdate"> = (e) => setFrame(e.detail.frame);
    const onPlay: CallbackListener<"play"> = () => setPlaying(true);
    const onPause: CallbackListener<"pause"> = () => setPlaying(false);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
    };
  }, [templatesKey, hasContent]);

  // Track the active track from the current selection (for add-clip placement).
  useEffect(() => {
    if (selectedClip) setActiveTrackId(selectedClip.trackId);
  }, [selectedClip]);

  // ----- mutation core -----
  const updateClip = useCallback((clipId: string, fn: (c: Clip) => Clip) =>
    setProject((p) => ({ ...p, clips: p.clips.map((c) => (c.id === clipId ? fn(c) : c)) })), []);
  const updateClipLayer = useCallback((clipId: string, fn: (l: Layer) => Layer) =>
    updateClip(clipId, (c) => ({ ...c, layer: fn(c.layer) })), [updateClip]);

  // ----- selection -----
  const selectClips = useCallback((ids: string[], additive: boolean) => {
    setSelectedClipIds((cur) => {
      if (!additive) return ids;
      const s = new Set(cur);
      for (const id of ids) (s.has(id) ? s.delete(id) : s.add(id));
      return [...s];
    });
  }, []);

  // ----- add clip -----
  const addClip = (layer: Layer, kind: TrackKind) => {
    let newClipId = "";
    let newActive = "";
    setProject((p) => {
      let tracks = p.tracks;
      const dur = Math.max(1, Math.round(2 * p.fps));
      const sameKind = tracks.filter((t) => t.kind === kind);
      const room = (t: Track) => trackHasRoom(p.clips, t.id, frame, dur);
      // Prefer the active track if it has room, else the lowest same-kind track
      // with room, else a fresh track — so new clips don't pile up (Premiere-ish).
      let track =
        (activeTrackId ? sameKind.find((t) => t.id === activeTrackId && room(t)) : undefined) ??
        sameKind.find(room);
      if (!track) {
        track = newTrack(kind, nextTrackName(p, kind));
        tracks = kind === "video" ? [track, ...tracks] : [...tracks, track];
      }
      const clip = newClip(layer, track.id, frame, dur);
      newClipId = clip.id;
      newActive = track.id;
      return { ...p, tracks, clips: [...p.clips, clip] };
    });
    if (newActive) setActiveTrackId(newActive);
    if (newClipId) setSelectedClipIds([newClipId]);
  };
  const onAddText = () => addClip(newTextLayer(project.width, project.height), "video");
  const onAddImage = () => addClip(newImageLayer(project.width, project.height, ""), "video");
  const onAddVideo = () => addClip(newVideoLayer(project.width, project.height, ""), "video");
  const onAddAudio = () => addClip(newAudioLayer(), "audio");
  const onAddShape = (shape: ShapeLayer["shape"]) => addClip(newShapeLayer(project.width, project.height, shape), "video");
  // Embed a library template's code into the project (the render-time copy) the
  // first time it's used; existing embedded copies are left untouched so live
  // clips don't change underfoot.
  const embedTemplate = (p: Project, tpl: Template): Project =>
    p.templates.some((t) => t.id === tpl.id) ? p : { ...p, templates: [...p.templates, tpl] };

  const onAddComponent = (templateId: string) => {
    const t = libraryTemplates.find((x) => x.id === templateId);
    if (!t) return;
    setProject((p) => embedTemplate(p, t));
    addClip(newComponentLayer(project.width, project.height, t.id, { ...t.previewProps }, t.name), "video");
  };
  const onDropTemplate = (templateId: string, trackId: string, atFrame: number) => {
    const t = libraryTemplates.find((x) => x.id === templateId);
    if (!t) return;
    const layer = newComponentLayer(project.width, project.height, t.id, { ...t.previewProps }, t.name);
    const clip = newClip(layer, trackId, atFrame, Math.max(1, Math.round(2 * project.fps)));
    setProject((p) => {
      const withTpl = embedTemplate(p, t);
      const r = bumpClipFromOverlap(withTpl.tracks, [...withTpl.clips, clip], clip.id);
      return { ...withTpl, tracks: r.tracks, clips: r.clips };
    });
    setSelectedClipIds([clip.id]);
  };
  // ----- assets (imported local media, persisted on project.assets) -----
  const addAsset = (asset: MediaRef) => setProject((p) => ({ ...p, assets: [...(p.assets ?? []), asset] }));
  const removeAsset = (id: string) => setProject((p) => ({ ...p, assets: (p.assets ?? []).filter((a) => a.id !== id) }));
  const layerForAsset = (kind: MediaRef["kind"], url: string) =>
    kind === "video" ? newVideoLayer(project.width, project.height, url) : newImageLayer(project.width, project.height, url);
  const useAsset = (asset: MediaRef) => addClip(layerForAsset(asset.kind, asset.url), "video");
  const onDropAsset = (url: string, kind: "image" | "video", trackId: string, atFrame: number) => {
    const clip = newClip(layerForAsset(kind, url), trackId, atFrame, Math.max(1, Math.round(3 * project.fps)));
    setProject((p) => {
      const r = bumpClipFromOverlap(p.tracks, [...p.clips, clip], clip.id);
      return { ...p, tracks: r.tracks, clips: r.clips };
    });
    setSelectedClipIds([clip.id]);
  };

  // ----- resizable timeline (drag the handle above it) -----
  const timelineResize = useRef<{ startY: number; startH: number } | null>(null);
  const startTimelineResize = (e: ReactPointerEvent) => {
    timelineResize.current = { startY: e.clientY, startH: timelineH };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onTimelineResizeMove = (e: ReactPointerEvent) => {
    const st = timelineResize.current;
    if (!st) return;
    const dy = st.startY - e.clientY; // drag up → taller
    setTimelineH(Math.max(140, Math.min(window.innerHeight * 0.8, st.startH + dy)));
  };
  const endTimelineResize = (e: ReactPointerEvent) => {
    timelineResize.current = null;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  };

  // After a move/trim settles, push the clip to its own row if it now overlaps.
  const onCommitClip = (clipId: string) =>
    setProject((p) => { const r = bumpClipFromOverlap(p.tracks, p.clips, clipId); return { ...p, tracks: r.tracks, clips: r.clips }; });

  // ----- transform / animatable property writes (clip-local) -----
  const applyTransformPatch = (clipId: string, patch: TransformPatch) =>
    updateClip(clipId, (c) => {
      const lf = localFrameOf(c);
      const writeNum = (cur: Animatable<number>, value: number) => (autoKeyframe || isAnimated(cur) ? setKeyframe(cur, lf, value) : value);
      const l = c.layer;
      const tr = { ...l.transform };
      if (patch.x !== undefined) tr.x = writeNum(l.transform.x, patch.x);
      if (patch.y !== undefined) tr.y = writeNum(l.transform.y, patch.y);
      if (patch.scale !== undefined) tr.scale = writeNum(l.transform.scale, patch.scale);
      if (patch.rotation !== undefined) tr.rotation = writeNum(l.transform.rotation, patch.rotation);
      if (patch.opacity !== undefined) tr.opacity = writeNum(l.transform.opacity, patch.opacity);
      const next = { ...l, transform: tr } as Layer;
      if (patch.width !== undefined) next.width = patch.width;
      if (patch.height !== undefined) next.height = patch.height;
      return { ...c, layer: next };
    });

  const applyAnimatablePatch = (clipId: string, key: string, value: number | string) =>
    updateClip(clipId, (c) => {
      const cur = getAnimatable(c.layer, key);
      if (cur === undefined) return c;
      const lf = localFrameOf(c);
      const written = autoKeyframe || isAnimated(cur) ? setKeyframe(cur, lf, value) : value;
      return { ...c, layer: setAnimatableOnLayer(c.layer, key, written) };
    });

  const applyLayerPatch = (clipId: string, patch: Record<string, unknown>) =>
    updateClipLayer(clipId, (l) => ({ ...l, ...patch } as Layer));
  const onComponentProp = (key: string, value: string | number) => {
    if (!selectedClip || selectedClip.layer.type !== "component") return;
    updateClipLayer(selectedClip.id, (l) => (l.type === "component" ? { ...l, props: { ...l.props, [key]: value } } : l));
  };

  // ----- keyframe ops -----
  const valueAt = (l: Layer, key: string, f: number) => {
    const cur = getAnimatable(l, key);
    if (cur === undefined) return 0;
    return key === "color" || key === "fill" ? evalColor(cur as Animatable<string>, f) : evalNumber(cur as Animatable<number>, f);
  };
  const toggleKeyframe = (clipId: string, key: string) =>
    updateClip(clipId, (c) => {
      const cur = getAnimatable(c.layer, key);
      if (cur === undefined) return c;
      const lf = localFrameOf(c);
      return { ...c, layer: setAnimatableOnLayer(c.layer, key, toggleKeyframed(cur, lf, valueAt(c.layer, key, lf))) };
    });
  const addKeyframe = (clipId: string, key: string, atFrame: number) =>
    updateClip(clipId, (c) => {
      const cur = getAnimatable(c.layer, key);
      if (cur === undefined) return c;
      return { ...c, layer: setAnimatableOnLayer(c.layer, key, setKeyframe(cur, atFrame, valueAt(c.layer, key, atFrame))) };
    });
  const deleteKeyframe = (clipId: string, key: string, atFrame: number) =>
    updateClipLayer(clipId, (l) => { const cur = getAnimatable(l, key); return cur === undefined ? l : setAnimatableOnLayer(l, key, removeKeyframe(cur, atFrame)); });
  const moveKeyframeAt = (clipId: string, key: string, from: number, to: number) =>
    updateClipLayer(clipId, (l) => { const cur = getAnimatable(l, key); return cur === undefined ? l : setAnimatableOnLayer(l, key, moveKeyframe(cur, from, to)); });
  const setEasingAt = (clipId: string, key: string, atFrame: number, easing: Easing) =>
    updateClipLayer(clipId, (l) => { const cur = getAnimatable(l, key); return cur === undefined ? l : setAnimatableOnLayer(l, key, setKeyframeEasing(cur, atFrame, easing)); });

  // ----- timeline clip ops -----
  const moveClip = (clipId: string, startFrame: number, trackId?: string) =>
    updateClip(clipId, (c) => ({ ...c, startFrame: Math.max(0, Math.round(startFrame)), trackId: trackId ?? c.trackId }));
  const trimClip = (clipId: string, startFrame: number, durationInFrames: number) =>
    updateClip(clipId, (c) => ({ ...c, startFrame: Math.max(0, Math.round(startFrame)), durationInFrames: Math.max(1, Math.round(durationInFrames)) }));
  const splitClip = (clipId: string) => setProject((p) => ({ ...p, clips: splitClipAt(p.clips, clipId, frame) }));
  const duplicateClip = (clipId: string) =>
    setProject((p) => {
      const idx = p.clips.findIndex((c) => c.id === clipId);
      if (idx < 0) return p;
      const copy = cloneClip(p.clips[idx], p.clips[idx].durationInFrames);
      const clips = [...p.clips];
      clips.splice(idx + 1, 0, copy);
      // copy lands right after the original; if that still overlaps, bump it up a track
      const r = bumpClipFromOverlap(p.tracks, clips, copy.id);
      setSelectedClipIds([copy.id]);
      return { ...p, tracks: r.tracks, clips: r.clips };
    });
  const deleteClip = (clipId: string) => {
    setProject((p) => ({ ...p, clips: p.clips.filter((c) => c.id !== clipId) }));
    setSelectedClipIds((ids) => ids.filter((id) => id !== clipId));
  };
  const rippleDelete = (clipId: string) => setProject((p) => ({ ...p, clips: rippleDeleteClips(p.clips, clipId) }));
  const toggleClipHidden = (clipId: string) => updateClipLayer(clipId, (l) => ({ ...l, hidden: !l.hidden }));
  const toggleClipLocked = (clipId: string) => updateClipLayer(clipId, (l) => ({ ...l, locked: !l.locked }));
  const reorderZ = (clipId: string, dir: 1 | -1) =>
    setProject((p) => {
      const idx = p.clips.findIndex((c) => c.id === clipId);
      if (idx < 0) return p;
      const c = p.clips[idx];
      let j = -1;
      if (dir === 1) { for (let k = idx + 1; k < p.clips.length; k++) if (p.clips[k].trackId === c.trackId) { j = k; break; } }
      else { for (let k = idx - 1; k >= 0; k--) if (p.clips[k].trackId === c.trackId) { j = k; break; } }
      if (j < 0) return p;
      const clips = [...p.clips];
      [clips[idx], clips[j]] = [clips[j], clips[idx]];
      return { ...p, clips };
    });

  // ----- track ops -----
  const addTrack = (kind: TrackKind) =>
    setProject((p) => {
      const t = newTrack(kind, nextTrackName(p, kind));
      setActiveTrackId(t.id);
      return { ...p, tracks: kind === "video" ? [t, ...p.tracks] : [...p.tracks, t] };
    });
  const deleteTrack = (trackId: string) =>
    setProject((p) => {
      if (p.tracks.length <= 1) return p;
      const hasClips = p.clips.some((c) => c.trackId === trackId);
      if (hasClips && !window.confirm("Delete this track and all its clips?")) return p;
      return { ...p, tracks: p.tracks.filter((t) => t.id !== trackId), clips: p.clips.filter((c) => c.trackId !== trackId) };
    });
  const patchTrack = (trackId: string, patch: Partial<Track>) =>
    setProject((p) => ({ ...p, tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)) }));
  const toggleTrackHidden = (id: string) => patchTrack(id, { hidden: !project.tracks.find((t) => t.id === id)?.hidden });
  const toggleTrackLocked = (id: string) => patchTrack(id, { locked: !project.tracks.find((t) => t.id === id)?.locked });
  const toggleTrackMuted = (id: string) => patchTrack(id, { muted: !project.tracks.find((t) => t.id === id)?.muted });
  const renameTrack = (id: string, name: string) => patchTrack(id, { name });
  const onAutoArrange = () => setProject((p) => { const a = autoArrange(p.tracks, p.clips); return { ...p, tracks: a.tracks, clips: a.clips }; });

  // ----- section ops -----
  const addSection = (atFrame: number) =>
    setProject((p) => ({ ...p, sections: [...(p.sections ?? []), newSection(`Section ${(p.sections?.length ?? 0) + 1}`, atFrame)] }));
  const moveSection = (id: string, atFrame: number) =>
    setProject((p) => ({ ...p, sections: (p.sections ?? []).map((s) => (s.id === id ? { ...s, startFrame: Math.max(0, Math.round(atFrame)) } : s)) }));
  const renameSection = (id: string, name: string) =>
    setProject((p) => ({ ...p, sections: (p.sections ?? []).map((s) => (s.id === id ? { ...s, name } : s)) }));
  const deleteSection = (id: string) =>
    setProject((p) => ({ ...p, sections: (p.sections ?? []).filter((s) => s.id !== id) }));

  // ----- background (segment under the playhead) -----
  const bgUnderPlayhead = useMemo<SceneBackground>(() => {
    const seg = (project.background?.segments ?? []).find((s) => frame >= s.startFrame && frame < s.startFrame + s.durationInFrames);
    return seg?.background ?? project.background?.segments?.[0]?.background ?? defaultBackground();
  }, [project.background, frame]);
  const onBackgroundChange = (patch: Partial<SceneBackground>) =>
    setProject((p) => {
      const segs = p.background?.segments ?? [];
      const seg = segs.find((s) => frame >= s.startFrame && frame < s.startFrame + s.durationInFrames);
      if (seg) return { ...p, background: { segments: segs.map((s) => (s.id === seg.id ? { ...s, background: { ...s.background, ...patch } } : s)) } };
      const dur = projectDuration(p);
      const ns = { id: uid("bg"), startFrame: 0, durationInFrames: dur, background: { ...defaultBackground(), ...patch } };
      return { ...p, background: { segments: [...segs, ns] } };
    });

  // ----- align / nudge / clipboard -----
  const alignLayers = (kind: AlignKind) => {
    const sel = selectedClips;
    if (sel.length === 0) return;
    const rect = (c: Clip) => { const lf = localFrameOf(c); return { id: c.id, x: evalNumber(c.layer.transform.x, lf), y: evalNumber(c.layer.transform.y, lf), w: c.layer.width, h: c.layer.height }; };
    if (sel.length === 1) {
      const r = rect(sel[0]);
      const W = project.width, H = project.height;
      if (kind === "left") applyTransformPatch(r.id, { x: 0 });
      else if (kind === "centerH") applyTransformPatch(r.id, { x: Math.round((W - r.w) / 2) });
      else if (kind === "right") applyTransformPatch(r.id, { x: W - r.w });
      else if (kind === "top") applyTransformPatch(r.id, { y: 0 });
      else if (kind === "middleV") applyTransformPatch(r.id, { y: Math.round((H - r.h) / 2) });
      else if (kind === "bottom") applyTransformPatch(r.id, { y: H - r.h });
      return;
    }
    const rects = sel.map(rect);
    const minX = Math.min(...rects.map((r) => r.x));
    const maxX = Math.max(...rects.map((r) => r.x + r.w));
    const minY = Math.min(...rects.map((r) => r.y));
    const maxY = Math.max(...rects.map((r) => r.y + r.h));
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    if (kind === "left") rects.forEach((r) => applyTransformPatch(r.id, { x: Math.round(minX) }));
    else if (kind === "centerH") rects.forEach((r) => applyTransformPatch(r.id, { x: Math.round(cx - r.w / 2) }));
    else if (kind === "right") rects.forEach((r) => applyTransformPatch(r.id, { x: Math.round(maxX - r.w) }));
    else if (kind === "top") rects.forEach((r) => applyTransformPatch(r.id, { y: Math.round(minY) }));
    else if (kind === "middleV") rects.forEach((r) => applyTransformPatch(r.id, { y: Math.round(cy - r.h / 2) }));
    else if (kind === "bottom") rects.forEach((r) => applyTransformPatch(r.id, { y: Math.round(maxY - r.h) }));
    else if (kind === "distH" && rects.length >= 3) {
      const sorted = [...rects].sort((a, b) => a.x - b.x);
      const gap = (maxX - minX - sorted.reduce((s, r) => s + r.w, 0)) / (sorted.length - 1);
      let cur = minX;
      sorted.forEach((r) => { applyTransformPatch(r.id, { x: Math.round(cur) }); cur += r.w + gap; });
    } else if (kind === "distV" && rects.length >= 3) {
      const sorted = [...rects].sort((a, b) => a.y - b.y);
      const gap = (maxY - minY - sorted.reduce((s, r) => s + r.h, 0)) / (sorted.length - 1);
      let cur = minY;
      sorted.forEach((r) => { applyTransformPatch(r.id, { y: Math.round(cur) }); cur += r.h + gap; });
    }
  };

  const copySelection = () => { if (selectedClips.length) clipboardRef.current = selectedClips.map((c) => JSON.parse(JSON.stringify(c))); };
  const pasteClipboard = () => {
    const items = clipboardRef.current;
    if (!items?.length) return;
    const copies = items.map((c) => cloneClip(c, c.durationInFrames));
    setProject((p) => ({ ...p, clips: [...p.clips, ...copies] }));
    setSelectedClipIds(copies.map((c) => c.id));
  };
  const duplicateSelection = () => {
    if (!selectedClips.length) return;
    const copies = selectedClips.map((c) => cloneClip(c, c.durationInFrames));
    setProject((p) => ({ ...p, clips: [...p.clips, ...copies] }));
    setSelectedClipIds(copies.map((c) => c.id));
  };
  const deleteSelection = () => {
    if (!selectedClipIds.length) return;
    setProject((p) => ({ ...p, clips: p.clips.filter((c) => !selectedClipIds.includes(c.id)) }));
    setSelectedClipIds([]);
  };
  const nudgeSelection = (dx: number, dy: number) => {
    selectedClips.forEach((c) => {
      const lf = localFrameOf(c);
      applyTransformPatch(c.id, { x: Math.round(evalNumber(c.layer.transform.x, lf) + dx), y: Math.round(evalNumber(c.layer.transform.y, lf) + dy) });
    });
  };

  // ----- presets -----
  const onApplyPreset = (clipId: string, presetId: string) => updateClip(clipId, (c) => applyPreset(c, presetId, project.fps));

  // ----- AI: scene view in/out (shim around the scene-based assistant) -----
  // The assistant speaks "scenes"; we present the flat timeline as scenes and
  // convert its proposals back into clips. No server/sanitizer changes needed.
  const aiScenes = useMemo<Scene[]>(() => flattenToScenes(project), [project]);
  const aiProject = useMemo<ScenesProject>(() => ({ ...project, scenes: aiScenes }), [project, aiScenes]);
  const currentSectionId = useMemo(() => {
    const secs = [...(project.sections ?? [])].sort((a, b) => a.startFrame - b.startFrame);
    if (!secs.length) return aiScenes[0]?.id ?? "";
    let id = secs[0].id;
    for (const s of secs) { if (frame >= s.startFrame) id = s.id; else break; }
    return id;
  }, [project.sections, aiScenes, frame]);

  const sectionSpan = (sectionId: string): { start: number; end: number } => {
    const secs = [...(project.sections ?? [])].sort((a, b) => a.startFrame - b.startFrame);
    const idx = secs.findIndex((s) => s.id === sectionId);
    if (idx < 0) return { start: 0, end: projectDuration(project) };
    return { start: secs[idx].startFrame, end: idx + 1 < secs.length ? secs[idx + 1].startFrame : projectDuration(project) };
  };

  /** Embed (by id, with full code) any library templates referenced by these
   *  layers' component layers, so the renderer can resolve a freshly-picked one. */
  const withReferencedTemplates = (existing: Template[], layers: Layer[]): Template[] => {
    const byId = new Map(existing.map((t) => [t.id, t]));
    for (const l of layers) {
      if (l.type === "component" && l.templateId && !byId.has(l.templateId)) {
        const t = libraryTemplates.find((x) => x.id === l.templateId);
        if (t) byId.set(l.templateId, t);
      }
    }
    return [...byId.values()];
  };
  const sceneLayers = (scenes: Scene[]): Layer[] => scenes.flatMap((s) => s.layers ?? []);

  /** Expand a proposed scene that reuses a saved preset: clone the preset's stored
   *  scene, apply positional text overrides, mint fresh layer ids, and return the
   *  preset's bundled templates. Non-preset scenes (or unknown ids) pass through. */
  const expandScene = (scene: Scene): { scene: Scene; templates: Template[] } => {
    if (!scene.presetId) return { scene, templates: [] };
    const preset = scenePresets.find((p) => p.id === scene.presetId);
    if (!preset) return { scene, templates: [] };
    const src = JSON.parse(JSON.stringify(preset.scene)) as Scene;
    const texts = scene.presetTexts ?? [];
    let ti = 0;
    const layers = (src.layers ?? []).map((l) => {
      const next = { ...l, id: uid(l.type) } as Layer;
      if (next.type === "text") {
        const replacement = texts[ti++];
        if (typeof replacement === "string" && replacement.trim()) next.text = replacement;
      }
      return next;
    });
    return {
      scene: { ...src, id: scene.id, layers, durationInFrames: scene.durationInFrames || src.durationInFrames },
      templates: preset.templates ?? [],
    };
  };
  /** Expand a list of proposed scenes → expanded scenes + all referenced preset templates. */
  const expandAll = (scenes: Scene[]): { scenes: Scene[]; templates: Template[] } => {
    const tplById = new Map<string, Template>();
    const out = scenes.map((s) => {
      const { scene, templates } = expandScene(s);
      for (const t of templates) if (!tplById.has(t.id)) tplById.set(t.id, t);
      return scene;
    });
    return { scenes: out, templates: [...tplById.values()] };
  };

  /** Core: apply an AI scene proposal onto the clip timeline (no UI side effects). */
  const applyProposedScenesImmediate = (proposedScenes: Scene[], replace: boolean, targetSectionId: string) => {
    const { scenes: expanded, templates: presetTpls } = expandAll(proposedScenes);
    setProject((p) => {
      const templates = withReferencedTemplates([...presetTpls, ...p.templates], sceneLayers(expanded));
      if (replace) {
        // Project scope → rebuild the whole flat timeline from the new scene list.
        return migrateToFlat({ id: p.id, name: p.name, fps: p.fps, width: p.width, height: p.height, templates, assets: p.assets, scenes: expanded });
      }
      // Scene scope → splice just the target section's clips + background.
      const merged = expanded[0];
      if (!merged) return p;
      const { start, end } = sectionSpan(targetSectionId);
      let tracks = p.tracks;
      let videoId = tracks.find((t) => t.kind === "video")?.id;
      let audioId = tracks.find((t) => t.kind === "audio")?.id;
      if (!videoId) { const t = newTrack("video", "V1"); tracks = [t, ...tracks]; videoId = t.id; }
      if (!audioId) { const t = newTrack("audio", "A1"); tracks = [...tracks, t]; audioId = t.id; }
      const { clips: newClips, bg } = sceneToClips(merged, start, p.width, p.height, { video: videoId, audio: audioId });
      const kept = p.clips.filter((c) => c.startFrame < start || c.startFrame >= end);
      const segments = (p.background?.segments ?? []).filter((s) => s.startFrame < start || s.startFrame >= end);
      const arranged = autoArrange(tracks, [...kept, ...newClips]);
      return { ...p, templates, tracks: arranged.tracks, clips: arranged.clips, background: { segments: [...segments, bg] } };
    });
  };

  const ensureKindTracks = (p: Project) => {
    let tracks = p.tracks;
    let videoId = tracks.find((t) => t.kind === "video")?.id;
    let audioId = tracks.find((t) => t.kind === "audio")?.id;
    if (!videoId) { const t = newTrack("video", "V1"); tracks = [t, ...tracks]; videoId = t.id; }
    if (!audioId) { const t = newTrack("audio", "A1"); tracks = [...tracks, t]; audioId = t.id; }
    return { tracks, videoId, audioId };
  };

  /** Append scope: add new AI scenes to the END of the timeline. Rebuilt from a
   *  pre-edit snapshot so existing clips/sections/media (and any live-streamed
   *  partials) are preserved exactly and never double-appended. */
  const applyAppendImmediate = (proposedScenes: Scene[], baseSnapshot: string) => {
    const { scenes: expanded, templates: presetTpls } = expandAll(proposedScenes);
    setProject(() => {
      const base = JSON.parse(baseSnapshot) as Project;
      const { tracks, videoId, audioId } = ensureKindTracks(base);
      const trackIds = { video: videoId, audio: audioId };
      let at = projectDuration(base);
      let n = base.sections?.length ?? 0;
      const built = expanded.map((scene) => {
        const start = at;
        const { clips, bg } = sceneToClips(scene, start, base.width, base.height, trackIds);
        at += Math.max(1, scene.durationInFrames);
        return { clips, bg, section: newSection(`Scene ${++n}`, start) };
      });
      const arranged = autoArrange(tracks, [...base.clips, ...built.flatMap((b) => b.clips)]);
      return {
        ...base,
        templates: withReferencedTemplates([...presetTpls, ...base.templates], sceneLayers(expanded)),
        tracks: arranged.tracks,
        clips: arranged.clips,
        sections: [...(base.sections ?? []), ...built.map((b) => b.section)],
        background: { segments: [...(base.background?.segments ?? []), ...built.map((b) => b.bg)] },
        durationInFrames: Math.max(base.durationInFrames, at),
      };
    });
  };

  /**
   * Stream an AI Scene/Project edit: build the timeline live as the model writes,
   * then apply the authoritative (fully-sanitized) result. The whole edit is one
   * Undo (history/autosave are paused while streaming). Falls back to a single
   * non-streamed apply if the stream errors or the CLI emits no token deltas.
   */
  const onSceneStream = async (req: { instruction: string; scope: VideoEditScope; images: string[]; history: { role: "user" | "assistant"; content: string }[]; resume?: string | null; onThinking?: (t: string) => void; onSession?: (id: string) => void }): Promise<{ summary: string }> => {
    const targetSectionId = currentSectionId;
    const baseProject = { ...aiProject, templates: libraryTemplates }; // scene view + full library so the AI can reuse any template (not just embedded ones)
    const preSnapshot = JSON.stringify(projectRef.current);
    const span = req.scope === "scene" ? sectionSpan(targetSectionId) : { start: 0, end: 0 };
    let summary = "";
    let finalProposal: { proposedScenes: Scene[]; replace: boolean } | null = null;
    const cursor = { at: span.start }; // running global start for project-scope scenes

    streamingRef.current = true;
    setConfiguring(true);
    setSelectedClipIds([]);
    // Clear the region we're about to (re)build so streamed clips appear on a clean canvas.
    if (req.scope === "project") {
      setProject((p) => ({ ...p, clips: [], sections: [], background: { segments: [] }, durationInFrames: 1 }));
      cursor.at = 0;
    } else if (req.scope === "append") {
      // Don't wipe — stream new scenes onto the END of the existing timeline.
      cursor.at = projectDuration(projectRef.current);
    } else {
      setProject((p) => ({
        ...p,
        clips: p.clips.filter((c) => c.startFrame < span.start || c.startFrame >= span.end),
        background: { segments: (p.background?.segments ?? []).filter((s) => s.startFrame < span.start || s.startFrame >= span.end) },
      }));
    }

    const finish = () => { streamingRef.current = false; recordHistory(); setTimeout(() => setConfiguring(false), 400); };

    try {
      await editVideoProjectStream(
        { instruction: req.instruction, scope: req.scope, targetSceneId: targetSectionId, project: baseProject, history: req.history, model: aiModel, images: req.images, resume: req.resume ?? undefined, presets: presetCatalog },
        {
          onThinking: (t) => req.onThinking?.(t),
          onSession: (id) => req.onSession?.(id),
          onScene: (rawScene) => {
            const { scene, templates: presetTpls } = expandScene(rawScene); // expand a reused preset into real layers
            const at = cursor.at;
            setProject((p) => {
              const { tracks, videoId, audioId } = ensureKindTracks(p);
              const { clips: nc, bg } = sceneToClips(scene, at, p.width, p.height, { video: videoId, audio: audioId });
              const arranged = autoArrange(tracks, [...p.clips, ...nc]);
              return {
                ...p,
                templates: withReferencedTemplates([...presetTpls, ...p.templates], scene.layers ?? []),
                tracks: arranged.tracks,
                clips: arranged.clips,
                background: { segments: [...(p.background?.segments ?? []), bg] },
                sections: [...(p.sections ?? []), newSection(`Scene ${(p.sections?.length ?? 0) + 1}`, at)],
                durationInFrames: Math.max(p.durationInFrames, at + scene.durationInFrames),
              };
            });
            cursor.at += Math.max(1, scene.durationInFrames);
          },
          onLayer: (layer) => {
            const localStart = layer.startFrame ?? 0;
            const localEnd = layer.endFrame ?? Math.max(1, span.end - span.start);
            const payload = shiftLayerKeyframes({ ...layer, startFrame: undefined, endFrame: undefined }, -localStart);
            setProject((p) => {
              const { tracks, videoId, audioId } = ensureKindTracks(p);
              const clip = newClip(payload, layer.type === "audio" ? audioId : videoId, span.start + localStart, Math.max(1, localEnd - localStart));
              const arranged = autoArrange(tracks, [...p.clips, clip]);
              return { ...p, templates: withReferencedTemplates(p.templates, [layer]), tracks: arranged.tracks, clips: arranged.clips };
            });
          },
          onSummary: (t) => { summary = t; },
          onDone: (proposal) => { finalProposal = proposal; },
        }
      );
      if (finalProposal) {
        if (req.scope === "append") applyAppendImmediate(finalProposal.proposedScenes, preSnapshot);
        else applyProposedScenesImmediate(finalProposal.proposedScenes, finalProposal.replace, targetSectionId);
      }
      finish();
      return { summary: summary || "Updated the video." };
    } catch {
      // Stream failed (no SSE / old CLI / network) → restore + one non-streamed apply.
      try {
        const fb = await editVideoProject({ instruction: req.instruction, scope: req.scope, targetSceneId: targetSectionId, project: baseProject, history: req.history, model: aiModel, images: req.images, resume: req.resume ?? undefined, presets: presetCatalog });
        if (fb.sessionId) req.onSession?.(fb.sessionId);
        if (req.scope === "append") {
          applyAppendImmediate(fb.proposedScenes, preSnapshot); // rebuilds from the snapshot internally
        } else {
          setProject(JSON.parse(preSnapshot));
          applyProposedScenesImmediate(fb.proposedScenes, fb.replace, targetSectionId);
        }
        finish();
        return { summary: fb.summary || "Updated the video." };
      } catch (e2) {
        setProject(JSON.parse(preSnapshot));
        streamingRef.current = false;
        setConfiguring(false);
        throw e2;
      }
    }
  };

  // ----- transport -----
  const onChangeName = useCallback((name: string) => setProject((p) => ({ ...p, name })), []);
  const togglePlay = () => { const p = playerRef.current; if (!p) return; p.isPlaying() ? p.pause() : p.play(); };
  const seek = (f: number) => { playerRef.current?.seekTo(Math.max(0, Math.min(f, durationInFrames - 1))); setFrame(f); };

  // ----- keyboard shortcuts -----
  const kbd = useRef({ undo, redo, copySelection, pasteClipboard, nudgeSelection, deleteSelection, duplicateSelection, splitClip: () => {}, togglePlay: () => {}, deselect: () => setSelectedClipIds([]) });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = kbd.current;
      const key = e.key.toLowerCase();
      if (mod && key === "z") { e.preventDefault(); e.shiftKey ? k.redo() : k.undo(); return; }
      if (mod && key === "y") { e.preventDefault(); k.redo(); return; }
      if (mod && key === "c") { e.preventDefault(); k.copySelection(); return; }
      if (mod && key === "v") { e.preventDefault(); k.pasteClipboard(); return; }
      if (mod && key === "d") { e.preventDefault(); k.duplicateSelection(); return; }
      if (key === "s" && !mod) { e.preventDefault(); k.splitClip(); return; }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); k.deleteSelection(); return; }
      if (e.key === "Escape") { k.deselect(); return; }
      if (e.key === " ") { e.preventDefault(); k.togglePlay(); return; }
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft") { e.preventDefault(); k.nudgeSelection(-step, 0); }
      else if (e.key === "ArrowRight") { e.preventDefault(); k.nudgeSelection(step, 0); }
      else if (e.key === "ArrowUp") { e.preventDefault(); k.nudgeSelection(0, -step); }
      else if (e.key === "ArrowDown") { e.preventDefault(); k.nudgeSelection(0, step); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  kbd.current = {
    undo, redo, copySelection, pasteClipboard, nudgeSelection, deleteSelection, duplicateSelection,
    splitClip: () => selectedClip && splitClip(selectedClip.id),
    togglePlay, deselect: () => setSelectedClipIds([]),
  };

  // ----- template authoring lives on its own page (DB-backed, sidebar AI) -----
  const openTemplateStudio = () => navigate("/tools/video-templates");

  // ----- EditOverlay synthetic scene (clips visible at the playhead, transforms
  // pre-evaluated to plain numbers so EditOverlay can run at frame=0) -----
  const overlayScene = useMemo<Scene>(() => {
    const visible = project.clips.filter((c) => {
      if (c.layer.type === "audio") return false;
      const tr = project.tracks.find((t) => t.id === c.trackId);
      if (!tr || tr.hidden || tr.locked) return false;
      return frame >= c.startFrame && frame < c.startFrame + c.durationInFrames;
    });
    const layers: Layer[] = visible.map((c) => {
      const lf = localFrameOf(c);
      const tr = c.layer.transform;
      const evaluatedTransform = {
        x: evalNumber(tr.x, lf), y: evalNumber(tr.y, lf), scale: evalNumber(tr.scale, lf),
        rotation: evalNumber(tr.rotation, lf), opacity: evalNumber(tr.opacity, lf),
      };
      // Pre-evaluate text font size/color too so inline editing matches the canvas.
      const textEval = c.layer.type === "text"
        ? { fontSize: evalNumber(c.layer.fontSize, lf), color: evalColor(c.layer.color, lf) }
        : {};
      return { ...c.layer, ...textEval, id: c.id, transform: evaluatedTransform } as Layer;
    });
    return { id: "overlay", durationInFrames: 1, transition: "none", transitionDurationInFrames: 0, layers } as Scene;
  }, [project.clips, project.tracks, frame, localFrameOf]);

  // ----- AI chat sidebar adapter: one turn = a scoped scene/append/project edit -----
  // ----- save a section as a reusable scene preset (self-growing library) -----
  const saveSectionAsPreset = (sectionId: string) => {
    const scene = aiScenes.find((s) => s.id === sectionId);
    if (!scene || !(scene.layers?.length)) {
      toast({ title: "Nothing to save", description: "This section has no layers yet." });
      return;
    }
    const tplById = new Map(libraryTemplates.map((t) => [t.id, t]));
    // Strip media → empty placeholders (presets are reusable; media stays manual).
    const stripped: Scene = {
      ...(JSON.parse(JSON.stringify(scene)) as Scene),
      layers: (scene.layers ?? []).map((raw) => {
        const c = JSON.parse(JSON.stringify(raw)) as Layer;
        if (c.type === "image" || c.type === "video" || c.type === "audio") c.src = "";
        else if (c.type === "component") {
          const schema = tplById.get(c.templateId)?.propsSchema ?? [];
          for (const f of schema) if (f.type === "image" || f.type === "video") c.props = { ...c.props, [f.key]: "" };
        }
        return c;
      }),
    };
    const refTemplates = withReferencedTemplates([], scene.layers ?? []);
    const summary = (scene.layers ?? [])
      .map((l) => (l.type === "text" ? `text: ${l.text}` : l.type === "component" ? `component: ${tplById.get(l.templateId)?.name ?? l.templateId}` : l.type))
      .join("; ");
    const defaultName = (project.sections ?? []).find((s) => s.id === sectionId)?.name || "Scene preset";
    setPresetDraft({ scene: stripped, templates: refTemplates, summary, defaultName });
  };

  const onSavePreset = async (name: string, tags: string[]) => {
    if (!presetDraft) return;
    if (!email) { toast({ title: "Sign in required", description: "Sign in to save presets.", variant: "destructive" }); return; }
    setSavingPreset(true);
    try {
      await createScenePreset({ user_email: email, name, description: null, tags, scene: presetDraft.scene, templates: presetDraft.templates });
      toast({ title: "Saved as preset", description: "Added to the reusable library." });
      setPresetDraft(null);
      refreshPresets();
    } catch (e) {
      toast({ title: "Couldn't save preset", description: String((e as Error)?.message || e), variant: "destructive" });
    } finally {
      setSavingPreset(false);
    }
  };

  const runTurn = (args: RunTurnArgs) =>
    onSceneStream({
      instruction: args.instruction,
      scope: assistScope,
      images: args.images,
      history: [], // session memory (resume) carries continuity; no replayed history
      resume: args.resume,
      onThinking: args.onThinking,
      onSession: args.onSession,
    });

  const scopeControls = (
    <div className="flex rounded-md border border-border p-0.5 text-[10px] font-medium">
      {([
        { key: "scene", label: "Scene" },
        { key: "project", label: "Project" },
        { key: "append", label: "Append" },
      ] as { key: AssistScope; label: string }[]).map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => setAssistScope(s.key)}
          className={`rounded px-1.5 py-0.5 ${assistScope === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );

  const scopePlaceholder =
    assistScope === "project"
      ? "Build or restructure the video…"
      : assistScope === "append"
      ? "Add scenes to the end… (e.g. a 3-scene outro)"
      : "Edit this scene — move, recolor, animate…";

  return (
    <div className="flex h-full">
      <div className="flex h-full min-w-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/40 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-card/40">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Videos
        </Button>
        <div className="h-5 w-px bg-border" />
        <Input
          value={project.name}
          onChange={(e) => onChangeName(e.target.value)}
          className="h-9 max-w-[240px] border-transparent bg-transparent font-semibold shadow-none hover:border-border focus-visible:border-border"
        />
        <div className="flex items-center rounded-full border border-border bg-background p-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"><Undo2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"><Redo2 className="h-4 w-4" /></Button>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setDarkMode((v) => !v)} title={darkMode ? "Light mode" : "Dark mode"}>
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <select
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value as CopyModel)}
            className="h-8 rounded-full border border-border bg-transparent px-2.5 text-xs outline-none"
            title="AI model"
          >
            <option value="haiku">Haiku</option>
            <option value="sonnet">Sonnet</option>
            <option value="opus">Opus</option>
          </select>
          <Button variant="ghost" size="sm" onClick={() => saveSectionAsPreset(currentSectionId)} className="gap-1 rounded-full" title="Save the current scene as a reusable preset"><BookmarkPlus className="h-4 w-4" /> Save scene</Button>
          <Button variant="outline" size="sm" onClick={() => setChatCollapsed((v) => !v)} className="gap-1 rounded-full"><Sparkles className="h-4 w-4 text-primary" /> Nap.AI Agent</Button>
          <Button size="sm" onClick={() => setRenderOpen(true)} className="gap-1 rounded-full"><Film className="h-4 w-4" /> Render</Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* LEFT: tabbed — properties / templates / presets / assets */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-border">
          <div className="flex items-stretch border-b border-border">
            {LEFT_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setLeftTab(t.key)}
                title={t.label}
                aria-label={t.label}
                className={`flex flex-1 items-center justify-center border-b-2 py-2.5 transition ${
                  leftTab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          {leftTab === "properties" && (
            <>
              <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Properties</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 gap-1 rounded-full text-xs"><Plus className="h-3.5 w-3.5" /> Add</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onAddText}>Text</DropdownMenuItem>
                    <DropdownMenuItem onClick={onAddImage}>Image</DropdownMenuItem>
                    <DropdownMenuItem onClick={onAddVideo}>Video</DropdownMenuItem>
                    <DropdownMenuItem onClick={onAddAudio}>Audio</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onAddShape("rect")}>Rectangle</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAddShape("ellipse")}>Ellipse</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAddShape("line")}>Line</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <LayerInspector
                  project={project}
                  background={bgUnderPlayhead}
                  layer={selectedClip?.layer ?? null}
                  email={email}
                  frame={localFrame}
                  onTransformPatch={(patch) => selectedClip && applyTransformPatch(selectedClip.id, patch)}
                  onLayerPatch={(patch) => selectedClip && applyLayerPatch(selectedClip.id, patch)}
                  onAnimatablePatch={(key, value) => selectedClip && applyAnimatablePatch(selectedClip.id, key, value)}
                  onToggleKeyframe={(key) => selectedClip && toggleKeyframe(selectedClip.id, key)}
                  onComponentProp={onComponentProp}
                  onBackgroundChange={onBackgroundChange}
                  onEditCode={() => openTemplateStudio()}
                  onAlign={alignLayers}
                  canDistribute={selectedClips.length >= 3}
                />
              </div>
              <div className="max-h-[40%] shrink-0 overflow-y-auto">
                <EffectControls
                  clip={selectedClip}
                  fps={project.fps}
                  localFrame={localFrame}
                  autoKeyframe={autoKeyframe}
                  onToggleAutoKeyframe={() => setAutoKeyframe((v) => !v)}
                  onScrubLocal={(lf) => selectedClip && seek(selectedClip.startFrame + lf)}
                  onAddKeyframe={(key, f) => selectedClip && addKeyframe(selectedClip.id, key, f)}
                  onMoveKeyframe={(key, from, to) => selectedClip && moveKeyframeAt(selectedClip.id, key, from, to)}
                  onDeleteKeyframe={(key, f) => selectedClip && deleteKeyframe(selectedClip.id, key, f)}
                  onSetEasing={(key, f, easing) => selectedClip && setEasingAt(selectedClip.id, key, f, easing)}
                />
              </div>
            </>
          )}

          {leftTab === "templates" && (
            <div className="min-h-0 flex-1 overflow-hidden">
              <TemplateLibrary
                templates={libraryTemplates}
                width={project.width}
                height={project.height}
                fps={project.fps}
                onAddScene={onAddComponent}
                onManage={openTemplateStudio}
              />
            </div>
          )}

          {leftTab === "presets" && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PresetLibrary
                hasSelection={!!selectedClip && selectedClip.layer.type !== "audio"}
                onApply={(presetId) => selectedClip && onApplyPreset(selectedClip.id, presetId)}
              />
            </div>
          )}

          {leftTab === "assets" && (
            <div className="min-h-0 flex-1 overflow-hidden">
              <AssetPanel
                assets={project.assets ?? []}
                email={email}
                onAddAsset={addAsset}
                onRemoveAsset={removeAsset}
                onUse={useAsset}
              />
            </div>
          )}
        </aside>

        {/* CENTER: preview + transport */}
        <main className="relative flex min-h-0 flex-1 flex-col bg-muted/30">
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-4">
            {hasContent ? (
              <div className="relative h-full w-full">
                <Player
                  key={templatesKey}
                  ref={playerRef}
                  component={TimelineComposition}
                  inputProps={{ tracks: project.tracks, clips: project.clips, background: project.background, components }}
                  durationInFrames={durationInFrames}
                  fps={project.fps}
                  compositionWidth={project.width}
                  compositionHeight={project.height}
                  style={{ width: "100%", height: "100%" }}
                  acknowledgeRemotionLicense
                />
                {!playing && overlayScene.layers!.length > 0 && (
                  <EditOverlay
                    scene={overlayScene}
                    selectedIds={selectedClipIds}
                    frame={0}
                    compWidth={project.width}
                    compHeight={project.height}
                    onSelect={(id, additive) => (id === null ? setSelectedClipIds([]) : selectClips([id], additive))}
                    onMarquee={(ids, additive) => setSelectedClipIds((prev) => (additive ? Array.from(new Set([...prev, ...ids])) : ids))}
                    onChange={applyTransformPatch}
                    onCommit={() => {}}
                    onTextChange={(id, text) => applyLayerPatch(id, { text })}
                  />
                )}
              </div>
            ) : (
              <div className="flex max-w-sm flex-col items-center gap-3 text-center text-muted-foreground">
                <Film className="h-10 w-10 opacity-60" />
                <p className="text-lg font-medium text-foreground">Blank video</p>
                <p className="text-sm">Add a layer with the “Add” menu, drag in a template from the Templates tab, or use the AI assistant.</p>
              </div>
            )}
          </div>

          {/* Transport */}
          {hasContent && (
            <div className="flex items-center gap-2 border-t border-border bg-background px-3 py-1.5">
              <button onClick={togglePlay} className="rounded-full p-1.5 hover:bg-muted" aria-label={playing ? "Pause" : "Play"}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground">{(frame / project.fps).toFixed(1)}s</span>
              <input type="range" min={0} max={Math.max(0, durationInFrames - 1)} value={Math.min(frame, durationInFrames - 1)} onChange={(e) => seek(Number(e.target.value))} className="flex-1 accent-primary" />
              <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{(durationInFrames / project.fps).toFixed(1)}s</span>
            </div>
          )}
        </main>
      </div>

      {/* Resize handle — drag up/down to grow/shrink the timeline */}
      <div
        onPointerDown={startTimelineResize}
        onPointerMove={onTimelineResizeMove}
        onPointerUp={endTimelineResize}
        title="Drag to resize the timeline"
        className="group flex h-2 shrink-0 cursor-row-resize touch-none items-center justify-center border-t border-border bg-muted/30 hover:bg-primary/15"
      >
        <div className="h-1 w-12 rounded-full bg-border transition group-hover:bg-primary/60" />
      </div>

      {/* Bottom: multi-track timeline */}
      <div className="shrink-0 overflow-hidden" style={{ height: timelineH }}>
        <Timeline
          tracks={project.tracks}
          clips={project.clips}
          sections={project.sections ?? []}
          fps={project.fps}
          frame={frame}
          durationInFrames={durationInFrames}
          selectedClipIds={selectedClipIds}
          snapping
          configuring={configuring}
          onSelectClips={selectClips}
          onScrub={seek}
          onMoveClip={moveClip}
          onTrimClip={trimClip}
          onCommitClip={onCommitClip}
          onSplitClip={splitClip}
          onDuplicateClip={duplicateClip}
          onDeleteClip={deleteClip}
          onRippleDelete={rippleDelete}
          onToggleClipHidden={toggleClipHidden}
          onToggleClipLocked={toggleClipLocked}
          onBringForward={(id) => reorderZ(id, 1)}
          onSendBackward={(id) => reorderZ(id, -1)}
          onAddTrack={addTrack}
          onDeleteTrack={deleteTrack}
          onRenameTrack={renameTrack}
          onAutoArrange={onAutoArrange}
          onToggleTrackHidden={toggleTrackHidden}
          onToggleTrackLocked={toggleTrackLocked}
          onToggleTrackMuted={toggleTrackMuted}
          onAddSection={addSection}
          onMoveSection={moveSection}
          onRenameSection={renameSection}
          onDeleteSection={deleteSection}
          onSaveSectionAsPreset={saveSectionAsPreset}
          onDropTemplate={onDropTemplate}
          onDropAsset={onDropAsset}
          onApplyPreset={onApplyPreset}
        />
      </div>

      <RenderDialog open={renderOpen} onOpenChange={setRenderOpen} project={project} />

      <SavePresetDialog
        open={!!presetDraft}
        onOpenChange={(o) => { if (!o) setPresetDraft(null); }}
        defaultName={presetDraft?.defaultName ?? ""}
        summary={presetDraft?.summary ?? ""}
        model={aiModel}
        saving={savingPreset}
        onSave={onSavePreset}
      />
      </div>

      <ChatSidebar
        projectType="video"
        projectId={project.id}
        title="Nap.AI Agent"
        model={aiModel}
        onModelChange={setAiModel}
        runTurn={runTurn}
        controls={scopeControls}
        placeholder={scopePlaceholder}
        disabled={configuring}
        collapsed={chatCollapsed}
        onToggle={() => setChatCollapsed((v) => !v)}
        floating
      />
    </div>
  );
};

export default VideoEditor;
