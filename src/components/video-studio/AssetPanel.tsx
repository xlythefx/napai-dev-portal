// Asset library for the Video Studio. Import images/videos from the local
// computer (a multi-file picker → uploaded to the media store, persisted on
// project.assets so the render service can fetch them). Click the + on a
// thumbnail to drop it onto the timeline at the playhead, or drag it onto a
// track. Mirrors TemplateLibrary's drag mechanic (dataTransfer keys
// "assetUrl"/"assetKind").

import React, { useRef, useState } from "react";
import { FolderOpen, Loader2, Film, ImageIcon, X, Plus, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadMedia, isLocalMediaUrl } from "@/lib/mediaUploadApi";
import { uid } from "@/lib/remotion/defaults";
import type { MediaRef } from "@/lib/remotion/types";

interface AssetPanelProps {
  assets: MediaRef[];
  email: string;
  onAddAsset: (asset: MediaRef) => void;
  onRemoveAsset: (id: string) => void;
  /** Add this asset to the timeline as a new clip at the playhead. */
  onUse: (asset: MediaRef) => void;
}

const AssetPanel: React.FC<AssetPanelProps> = ({ assets, email, onAddAsset, onRemoveAsset, onUse }) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = () => inputRef.current?.click();

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const kind: MediaRef["kind"] = file.type.startsWith("video") ? "video" : "image";
        try {
          const { url } = await uploadMedia(email, file);
          onAddAsset({ id: uid(), kind, url, name: file.name });
        } catch (e) {
          toast({
            title: `Couldn't import ${file.name}`,
            description: String((e as Error)?.message || e),
            variant: "destructive",
          });
        }
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assets</span>
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FolderOpen className="h-3 w-3" />} Import
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {assets.length === 0 ? (
          <button
            type="button"
            onClick={pick}
            className="flex w-full flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-border p-6 text-center text-muted-foreground hover:border-primary/50"
          >
            <FolderOpen className="h-5 w-5" />
            <span className="text-xs font-medium">Import media</span>
            <span className="text-[10px]">Select images or videos from your computer</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {assets.map((a) => (
              <div
                key={a.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("assetUrl", a.url);
                  e.dataTransfer.setData("assetKind", a.kind);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className="group overflow-hidden rounded-lg border border-border bg-card"
                title="Drag onto the timeline, or click + to add at the playhead"
              >
                <div className="relative aspect-video bg-muted/40">
                  {a.kind === "video" ? (
                    <video src={a.url} muted className="h-full w-full object-cover" />
                  ) : (
                    <img src={a.url} alt={a.name || ""} className="h-full w-full object-cover" />
                  )}
                  <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/50 p-0.5 text-white">
                    {a.kind === "video" ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                  </span>
                  <span className="pointer-events-none absolute right-7 top-1 rounded bg-black/50 p-0.5 text-white opacity-0 transition group-hover:opacity-100">
                    <GripVertical className="h-3 w-3" />
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveAsset(a.id)}
                    className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5 opacity-0 shadow ring-1 ring-border transition group-hover:opacity-100"
                    aria-label="Remove asset"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                  <span className="truncate text-[11px] font-medium" title={a.name}>{a.name || a.kind}</span>
                  <button
                    type="button"
                    onClick={() => onUse(a)}
                    className="shrink-0 rounded p-1 text-primary hover:bg-muted"
                    aria-label="Add to timeline"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {isLocalMediaUrl(a.url) && (
                  <p className="px-2 pb-1.5 text-[9px] text-amber-500">Local preview — re-upload before render.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
};

export default AssetPanel;
