const LowerThird = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 18 } });
  const exit = spring({ frame: frame - (durationInFrames - 20), fps, config: { damping: 18 } });
  const offX = interpolate(enter, [0, 1], [-width * 0.6, 0]) + interpolate(exit, [0, 1], [0, -width * 0.6]);

  const centered = props.position === "bottom-center";

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          bottom: height * 0.13,
          left: centered ? 0 : width * 0.06,
          right: centered ? 0 : "auto",
          display: "flex",
          justifyContent: centered ? "center" : "flex-start",
          transform: `translateX(${offX}px)`,
        }}
      >
        <div
          style={{
            background: props.accent,
            padding: `${height * 0.022}px ${width * 0.035}px`,
            borderRadius: brand.radius,
            boxShadow: "0 14px 50px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              color: "#ffffff",
              fontFamily: brand.fontHeading,
              fontWeight: 800,
              fontSize: height * 0.05,
              lineHeight: 1.1,
            }}
          >
            {props.name}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.85)",
              fontFamily: brand.fontBody,
              fontSize: height * 0.027,
              marginTop: 6,
            }}
          >
            {props.role}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default LowerThird;
