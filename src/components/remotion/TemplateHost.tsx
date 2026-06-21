// Renders a single compiled template component, guarded by an error boundary so
// one broken template never crashes the <Player> (or aborts a server render).

import React from "react";
import { AbsoluteFill } from "remotion";
// Relative (not "@/") so the Node render bundle can compile this file.
import type { PropValues } from "../../lib/remotion/types";

type TemplateComponent = React.ComponentType<{ props: PropValues }>;

interface TemplateHostProps {
  component?: TemplateComponent;
  props: PropValues;
  templateId?: string;
}

const placeholderStyle: React.CSSProperties = {
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  padding: 48,
  background: "#1a1a1a",
  color: "#f87171",
  fontFamily: "system-ui, sans-serif",
  fontSize: 28,
};

class TemplateErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.error("[TemplateHost] template render error:", err);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

const TemplateHost: React.FC<TemplateHostProps> = ({ component: Component, props, templateId }) => {
  if (!Component) {
    return (
      <AbsoluteFill style={placeholderStyle}>
        Missing or broken template{templateId ? `: ${templateId}` : ""}
      </AbsoluteFill>
    );
  }
  return (
    <TemplateErrorBoundary
      fallback={<AbsoluteFill style={placeholderStyle}>This template threw while rendering.</AbsoluteFill>}
    >
      <Component props={props} />
    </TemplateErrorBoundary>
  );
};

export default TemplateHost;
