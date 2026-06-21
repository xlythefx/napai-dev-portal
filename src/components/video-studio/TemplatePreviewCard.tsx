// A compact, self-contained looping preview of ONE template (or one scene's
// template) using @remotion/player. Default paused (shows frame 0 as a
// thumbnail) with a manual play/pause toggle to keep CPU in check.

import React, { useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { AbsoluteFill } from "remotion";
import { Play, Pause, AlertTriangle } from "lucide-react";
import TemplateHost from "@/components/remotion/TemplateHost";
import { compileTemplate, type TemplateComponent } from "@/lib/remotion/compileTemplate";
import type { PropValues } from "@/lib/remotion/types";

const PreviewComposition: React.FC<{ component?: TemplateComponent; props: PropValues }> = ({ component, props }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <TemplateHost component={component} props={props} />
  </AbsoluteFill>
);

interface TemplatePreviewCardProps {
  code: string;
  props: PropValues;
  width: number;
  height: number;
  fps?: number;
  durationInFrames?: number;
  className?: string;
}

const TemplatePreviewCard: React.FC<TemplatePreviewCardProps> = ({
  code,
  props,
  width,
  height,
  fps = 30,
  durationInFrames = 90,
  className = "",
}) => {
  const playerRef = useRef<PlayerRef>(null);
  const [playing, setPlaying] = useState(false);
  const compiled = useMemo(() => compileTemplate(code), [code]);

  const toggle = () => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isPlaying()) {
      p.pause();
      setPlaying(false);
    } else {
      p.play();
      setPlaying(true);
    }
  };

  if (!compiled.component) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 bg-zinc-900 p-3 text-center ${className}`}>
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span className="text-[10px] leading-tight text-amber-400">{compiled.error}</span>
      </div>
    );
  }

  return (
    <div className={`group relative overflow-hidden bg-black ${className}`}>
      <Player
        ref={playerRef}
        component={PreviewComposition}
        inputProps={{ component: compiled.component, props }}
        durationInFrames={Math.max(1, durationInFrames)}
        compositionWidth={width}
        compositionHeight={height}
        fps={fps}
        loop
        clickToPlay={false}
        style={{ width: "100%", height: "100%" }}
        acknowledgeRemotionLicense
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100"
        aria-label={playing ? "Pause preview" : "Play preview"}
      >
        <span className="rounded-full bg-black/60 p-2 backdrop-blur">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </span>
      </button>
    </div>
  );
};

export default TemplatePreviewCard;
