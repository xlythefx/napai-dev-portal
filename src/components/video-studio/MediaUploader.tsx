// Image/video picker that uploads to the media store and stores the SERVED URL
// (not a data/blob URL) so the render service can fetch it. Shows the current
// media and an uploading state.

import React, { useRef, useState } from "react";
import { Loader2, Upload, X, Film, ImageIcon, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadMedia, isLocalMediaUrl } from "@/lib/mediaUploadApi";

interface MediaUploaderProps {
  kind: "image" | "video" | "audio";
  value: string;
  email: string;
  onChange: (url: string) => void;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({ kind, value, email, onChange }) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = () => inputRef.current?.click();

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadMedia(email, file);
      onChange(url);
    } catch (e) {
      toast({
        title: "Upload failed",
        description: String((e as Error)?.message || e),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const accept = kind === "video" ? "video/*" : kind === "audio" ? "audio/*" : "image/*";
  const Icon = kind === "video" ? Film : kind === "audio" ? Music : ImageIcon;

  return (
    <div className="space-y-1.5">
      <div className="relative flex h-24 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : value ? (
          kind === "video" ? (
            <video src={value} className="h-full w-full object-cover" muted />
          ) : kind === "audio" ? (
            <audio src={value} controls className="w-[90%]" />
          ) : (
            <img src={value} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Icon className="h-5 w-5" />
            <span className="text-[10px]">No {kind}</span>
          </div>
        )}
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow ring-1 ring-border"
            aria-label="Remove media"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {value && isLocalMediaUrl(value) && (
        <p className="text-[10px] text-amber-500">Local preview only — re-upload before rendering.</p>
      )}

      <button
        type="button"
        onClick={pick}
        disabled={uploading}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
      >
        <Upload className="h-3.5 w-3.5" /> {value ? "Replace" : "Upload"} {kind}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default MediaUploader;
