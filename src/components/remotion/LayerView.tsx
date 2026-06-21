// Pure per-type content of a single layer (text/image/video/shape). The parent
// wrapper (LayerStack) owns position/size/rotation/opacity; this only fills the
// box. Shared by the in-browser <Player> and the Node render bundle, so relative
// imports only. OffthreadVideo works in both Player and render.

import React from "react";
import { Img, OffthreadVideo } from "remotion";
import { evalColor, evalNumber, type Layer } from "../../lib/remotion/layers";

const placeholder = (label: string): React.ReactNode => (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "2px dashed rgba(148,163,184,0.5)",
      color: "#94a3b8",
      fontFamily: "system-ui, sans-serif",
      fontSize: 20,
      borderRadius: 8,
    }}
  >
    {label}
  </div>
);

const LayerView: React.FC<{ layer: Layer; frame: number }> = ({ layer, frame }) => {
  switch (layer.type) {
    case "text": {
      const color = evalColor(layer.color, frame);
      const fontSize = evalNumber(layer.fontSize, frame);
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            fontFamily: layer.fontFamily,
            fontWeight: layer.weight as React.CSSProperties["fontWeight"],
            fontSize,
            color,
            textAlign: layer.align,
            lineHeight: layer.lineHeight,
            letterSpacing: layer.letterSpacing,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            overflow: "hidden",
          }}
        >
          {layer.text}
        </div>
      );
    }
    case "image":
      return layer.src ? (
        <Img src={layer.src} style={{ width: "100%", height: "100%", objectFit: layer.fit, borderRadius: layer.radius }} />
      ) : (
        <>{placeholder("Image")}</>
      );
    case "video":
      return layer.src ? (
        <OffthreadVideo
          src={layer.src}
          startFrom={Number(layer.trimStart) || 0}
          volume={layer.volume}
          style={{ width: "100%", height: "100%", objectFit: layer.fit }}
        />
      ) : (
        <>{placeholder("Video")}</>
      );
    case "shape": {
      const fill = evalColor(layer.fill, frame);
      const border = layer.strokeWidth > 0 ? `${layer.strokeWidth}px solid ${layer.stroke}` : "none";
      if (layer.shape === "ellipse") {
        return <div style={{ width: "100%", height: "100%", background: fill, border, borderRadius: "50%", boxSizing: "border-box" }} />;
      }
      if (layer.shape === "line") {
        return <div style={{ width: "100%", height: "100%", background: fill }} />;
      }
      return <div style={{ width: "100%", height: "100%", background: fill, border, borderRadius: layer.radius, boxSizing: "border-box" }} />;
    }
    default:
      return null; // "component" is handled by LayerStack via TemplateHost
  }
};

export default LayerView;
