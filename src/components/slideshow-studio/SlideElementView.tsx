import { CSSProperties } from "react";
import { SlideElement } from "@/lib/slideshow";

// Pure presentational render of one slide element's CONTENT, filling its parent
// wrapper (which owns position/size/rotation/opacity). Used in both edit and play.
export default function SlideElementView({ element }: { element: SlideElement }) {
  if (element.type === "text") {
    const style: CSSProperties = {
      width: "100%",
      fontFamily: element.fontFamily,
      fontWeight: element.fontWeight as CSSProperties["fontWeight"],
      fontSize: element.fontSize,
      color: element.color,
      textAlign: element.align,
      lineHeight: element.lineHeight,
      letterSpacing: element.letterSpacing,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      margin: 0,
      userSelect: "none",
    };
    return <div style={style}>{element.text}</div>;
  }

  if (element.type === "image") {
    return (
      <img
        src={element.src}
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: element.fit,
          borderRadius: element.borderRadius,
          display: "block",
          pointerEvents: "none",
        }}
      />
    );
  }

  // shape
  if (element.shape === "line") {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
        <div style={{ width: "100%", height: element.strokeWidth, backgroundColor: element.stroke }} />
      </div>
    );
  }

  const shapeStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    backgroundColor: element.fill,
    borderRadius: element.shape === "circle" ? "50%" : element.borderRadius,
    border: element.strokeWidth > 0 ? `${element.strokeWidth}px solid ${element.stroke}` : undefined,
    boxSizing: "border-box",
  };
  return <div style={shapeStyle} />;
}
