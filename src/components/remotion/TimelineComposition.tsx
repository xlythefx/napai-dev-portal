// THE shared flat-timeline composition (v3). A pure function of
// (tracks, clips, background, components): lays every clip out on the global
// frame line via its own <Sequence from={startFrame}>. Because useCurrentFrame()
// inside a Sequence is clip-LOCAL, the existing keyframe engine (evalNumber) and
// LayerView/TemplateHost render unchanged — only a clip's POSITION is global.
//
// Imported by BOTH the in-browser <Player> and the Node render bundle (templates
// statically imported), so preview === export. Relative imports only (no "@/",
// no ?raw/seedTemplates) so the webpack render bundle can compile it.

import React from "react";
import { AbsoluteFill, Audio, Sequence, useCurrentFrame } from "remotion";
import TemplateHost from "./TemplateHost";
import LayerView from "./LayerView";
import { backgroundStyle, evalNumber } from "../../lib/remotion/layers";
import { isClipMuted, orderedClipsForRender } from "../../lib/remotion/clips";
import type { BackgroundTrack, Clip, PropValues, Track } from "../../lib/remotion/types";

export type TemplateComponentMap = Record<string, React.ComponentType<{ props: PropValues }>>;

// `type` (not `interface`) to satisfy Remotion's Record<string, unknown> prop
// constraint (interfaces lack an implicit index signature).
export type TimelineCompositionProps = {
  tracks: Track[];
  clips: Clip[];
  background: BackgroundTrack;
  components: TemplateComponentMap;
};

/** Paints the background segment covering the current frame (gaps → black). */
const BackgroundTrackView: React.FC<{ background?: BackgroundTrack }> = ({ background }) => {
  const frame = useCurrentFrame();
  const seg = (background?.segments ?? []).find(
    (s) => frame >= s.startFrame && frame < s.startFrame + Math.max(1, s.durationInFrames)
  );
  return <AbsoluteFill style={backgroundStyle(seg?.background)} />;
};

/** One clip's content at the clip-local frame. Mirrors the old LayerStack body. */
const ClipView: React.FC<{ clip: Clip; components: TemplateComponentMap; z: number; muted: boolean }> = ({
  clip,
  components,
  z,
  muted,
}) => {
  const frame = useCurrentFrame();
  const layer = clip.layer;
  if (layer.hidden) return null;

  // Audio: non-visual; the wrapping Sequence already positions/trims it in time.
  if (layer.type === "audio") {
    if (!layer.src) return null;
    const volume = muted ? () => 0 : (f: number) => Math.max(0, Math.min(1, evalNumber(layer.volume, f)));
    return <Audio src={layer.src} startFrom={Number(layer.trimStart) || 0} volume={volume} />;
  }

  const x = evalNumber(layer.transform.x, frame);
  const y = evalNumber(layer.transform.y, frame);
  const scale = evalNumber(layer.transform.scale, frame);
  const rotation = evalNumber(layer.transform.rotation, frame);
  const opacity = evalNumber(layer.transform.opacity, frame);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: layer.width,
        height: layer.height,
        transform: `rotate(${rotation}deg) scale(${scale})`,
        transformOrigin: "center center",
        opacity,
        zIndex: z,
      }}
    >
      {layer.type === "component" ? (
        <TemplateHost component={components[layer.templateId]} props={layer.props} templateId={layer.templateId} />
      ) : (
        <LayerView layer={layer} frame={frame} />
      )}
    </div>
  );
};

export const TimelineComposition: React.FC<TimelineCompositionProps> = ({ tracks, clips, background, components }) => {
  const ordered = orderedClipsForRender(tracks, clips);
  return (
    <AbsoluteFill>
      <BackgroundTrackView background={background} />
      {ordered.map((clip, i) => (
        <Sequence
          key={clip.id}
          from={clip.startFrame}
          durationInFrames={Math.max(1, clip.durationInFrames)}
          layout="none"
        >
          {/* z starts at 1 so every clip paints above the background fill */}
          <ClipView clip={clip} components={components} z={i + 1} muted={isClipMuted(tracks, clip)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export default TimelineComposition;
