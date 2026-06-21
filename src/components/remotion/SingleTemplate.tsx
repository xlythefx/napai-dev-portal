// One template rendered full-frame — used by compact previews and thumbnails
// (via @remotion/player's <Player>/<Thumbnail>). Mirrors how VideoComposition
// renders a single scene, so a card preview matches the master timeline.

import React from "react";
import { AbsoluteFill } from "remotion";
import TemplateHost from "./TemplateHost";
import type { TemplateComponent } from "@/lib/remotion/compileTemplate";
import type { PropValues } from "@/lib/remotion/types";

// `type` (not `interface`) so it satisfies Remotion's `Record<string, unknown>`
// component-props constraint.
export type SingleTemplateProps = {
  component?: TemplateComponent;
  props: PropValues;
};

const SingleTemplate: React.FC<SingleTemplateProps> = ({ component, props }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <TemplateHost component={component} props={props} />
  </AbsoluteFill>
);

export default SingleTemplate;
