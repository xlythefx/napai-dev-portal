const ImageReveal = ({ props }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  const zoom = Number(props.zoom) || 1.15;
  const scale = interpolate(frame, [0, durationInFrames], [1, zoom], { extrapolateRight: "clamp" });
  const panX = interpolate(frame, [0, durationInFrames], [-width * 0.03, width * 0.03], {
    extrapolateRight: "clamp",
  });
  const capIn = interpolate(frame, [8, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const overlay = Number(props.overlayOpacity);

  return (
    <AbsoluteFill style={{ background: "#000000", overflow: "hidden" }}>
      {props.image ? (
        <Img
          src={props.image}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale}) translateX(${panX}px)`,
          }}
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
          Add an image
        </AbsoluteFill>
      )}

      <AbsoluteFill
        style={{ background: `linear-gradient(to top, rgba(0,0,0,${overlay}), transparent 55%)` }}
      />

      <div
        style={{
          position: "absolute",
          bottom: height * 0.08,
          left: width * 0.06,
          right: width * 0.06,
          opacity: capIn,
          transform: `translateY(${(1 - capIn) * 20}px)`,
        }}
      >
        <div
          style={{
            color: "#ffffff",
            fontFamily: brand.fontHeading,
            fontWeight: 800,
            fontSize: height * 0.05,
            lineHeight: 1.1,
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
          }}
        >
          {props.caption}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default ImageReveal;
