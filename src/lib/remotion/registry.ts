// Browser-side primitive scope. Maps every curated primitive name (the single
// source of truth in server/remotion/primitives.mjs) to a live value, so the
// in-browser template compiler can inject them as `new Function` arguments.
//
// The Node render path builds the equivalent set via an import header
// (server/remotion/templateWrap.mjs) generated from the same primitives list —
// that shared list is what keeps preview === export.

import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  interpolateColors,
  spring,
  Easing,
  random,
  AbsoluteFill,
  Sequence,
  Series,
  Img,
  Audio,
  Video,
  staticFile,
} from "remotion";
import { PRIMITIVE_NAMES } from "../../../server/remotion/primitives.mjs";
import { BRAND } from "../../../server/remotion/brand.mjs";

export const brand = BRAND;

// Name -> live value. Keys MUST cover every entry in PRIMITIVE_NAMES.
// `Video` here is Remotion's <Video> (Player-correct); the node header binds the
// same identifier to <OffthreadVideo> (render-correct).
const SCOPE: Record<string, unknown> = {
  React,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  interpolateColors,
  spring,
  Easing,
  random,
  AbsoluteFill,
  Sequence,
  Series,
  Img,
  Audio,
  Video,
  staticFile,
  brand,
};

export { PRIMITIVE_NAMES };

export function buildScope(): Record<string, unknown> {
  return SCOPE;
}
