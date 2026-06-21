const VideoClip = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const capIn = spring({ frame: frame - 6, fps, config: { damping: 16 } });

  return (
    <AbsoluteFill style={{ background: "#000000" }}>
      {props.video ? (
        <Video
          src={props.video}
          startFrom={Number(props.trimStart) || 0}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            color: "#64748b",
            fontFamily: brand.fontBody,
            fontSize: height * 0.03,
          }}
        >
          Add a video clip
        </AbsoluteFill>
      )}

      <div
        style={{
          position: "absolute",
          bottom: height * 0.1,
          left: 0,
          right: 0,
          textAlign: "center",
          transform: `translateY(${(1 - capIn) * 32}px)`,
          opacity: capIn,
        }}
      >
        <span
          style={{
            display: "inline-block",
            background: "rgba(0,0,0,0.55)",
            color: props.captionColor,
            fontFamily: brand.fontHeading,
            fontWeight: 700,
            fontSize: height * 0.042,
            padding: `${height * 0.014}px ${width * 0.035}px`,
            borderRadius: brand.radius,
            backdropFilter: "blur(4px)",
          }}
        >
          {props.caption}
        </span>
      </div>
    </AbsoluteFill>
  );
};

export default VideoClip;
