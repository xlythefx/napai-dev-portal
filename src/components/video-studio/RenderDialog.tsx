// Render dialog: calls the Node render service and downloads the resulting MP4.
// Gated until every media prop is a server-fetchable URL (the renderer can't
// read data:/blob: URLs).

import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Film, AlertTriangle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { renderProject, downloadBlob } from "@/lib/videoRenderApi";
import { isLocalMediaUrl } from "@/lib/mediaUploadApi";
import { projectDuration } from "@/lib/remotion/timing";
import type { Project } from "@/lib/remotion/types";

interface RenderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
}

const RenderDialog: React.FC<RenderDialogProps> = ({ open, onOpenChange, project }) => {
  const { toast } = useToast();
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find media (clip src, component-clip media props, or background image) that
  // is still a local-only URL the render service can't fetch.
  const localMedia = useMemo(() => {
    const issues: string[] = [];
    (project.background?.segments ?? []).forEach((seg, i) => {
      if (seg.background?.type === "image" && isLocalMediaUrl(seg.background.src)) issues.push(`Background ${i + 1}`);
    });
    project.clips.forEach((clip) => {
      const l = clip.layer;
      if ((l.type === "image" || l.type === "video" || l.type === "audio") && isLocalMediaUrl(l.src)) {
        issues.push(l.name);
      }
      if (l.type === "component") {
        const t = project.templates.find((tp) => tp.id === l.templateId);
        t?.propsSchema.forEach((f) => {
          if ((f.type === "image" || f.type === "video") && isLocalMediaUrl(l.props[f.key])) issues.push(`${l.name}: ${f.label}`);
        });
      }
    });
    return issues;
  }, [project]);

  const durationSec = projectDuration(project) / project.fps;
  const noClips = project.clips.length === 0;
  const blocked = localMedia.length > 0 || noClips;

  const handleRender = async () => {
    setRendering(true);
    setError(null);
    try {
      const blob = await renderProject(project);
      downloadBlob(blob, `${project.name || "video"}.mp4`);
      toast({ title: "Render complete", description: "Your MP4 has been downloaded." });
      onOpenChange(false);
    } catch (e) {
      const msg = String((e as Error)?.message || e);
      setError(msg);
      toast({ title: "Render failed", description: msg, variant: "destructive" });
    } finally {
      setRendering(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !rendering && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" /> Render video
          </DialogTitle>
          <DialogDescription className="sr-only">Render this project to an MP4 and download it.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
            <span className="text-muted-foreground">Output</span>
            <span className="font-medium">
              {project.width}×{project.height} · {project.fps}fps · {durationSec.toFixed(1)}s
            </span>
          </div>

          {noClips && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p>Add at least one clip before rendering.</p>
            </div>
          )}

          {localMedia.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="font-medium">Upload media before rendering:</p>
                <ul className="mt-1 list-inside list-disc">
                  {localMedia.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          {rendering && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Rendering on the server… this can take a moment.
            </div>
          )}

          <Button onClick={handleRender} disabled={rendering || blocked} className="w-full rounded-full">
            {rendering ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Render &amp; download MP4
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RenderDialog;
