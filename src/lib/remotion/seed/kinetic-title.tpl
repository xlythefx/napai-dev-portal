const KineticTitle = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const subOpacity = interpolate(frame, [12, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const size = Number(props.size) || 120;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${props.bgFrom}, ${props.bgTo})`,
        justifyContent: "center",
        alignItems: "center",
        padding: width * 0.08,
      }}
    >
      <h1
        style={{
          margin: 0,
          color: props.color,
          fontFamily: brand.fontHeading,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.05,
          textAlign: "center",
          transform: `translateY(${(1 - titleIn) * 70}px)`,
          opacity: titleIn,
        }}
      >
        {props.title}
      </h1>
      <p
        style={{
          marginTop: 28,
          color: props.color,
          opacity: subOpacity * 0.85,
          fontFamily: brand.fontBody,
          fontSize: size * 0.32,
          textAlign: "center",
        }}
      >
        {props.subtitle}
      </p>
    </AbsoluteFill>
  );
};

export default KineticTitle;
