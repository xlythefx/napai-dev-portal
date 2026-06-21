// SINGLE SOURCE OF TRUTH for the curated primitives available to template code.
//
// A "template" is a TSX string the AI (or user) writes. It references these
// identifiers by *bare name* (no imports). Two consumers read this list so they
// never drift:
//   - Browser preview  (src/lib/remotion/registry.ts) maps each name to a live
//     value and injects them as `new Function` args after Sucrase transpile.
//   - Node render       (server/remotion/templateWrap.mjs) generates an import
//     header from this list and prepends it to the raw template code so esbuild
//     (via @remotion/bundler) can compile it.
//
// IMPORTANT: this file must stay pure data — no Node-only imports — because the
// browser bundles it too.

export const PRIMITIVES = [
  { name: "React", from: "react", default: true },
  { name: "useCurrentFrame", from: "remotion" },
  { name: "useVideoConfig", from: "remotion" },
  { name: "interpolate", from: "remotion" },
  { name: "interpolateColors", from: "remotion" },
  { name: "spring", from: "remotion" },
  { name: "Easing", from: "remotion" },
  { name: "random", from: "remotion" },
  { name: "AbsoluteFill", from: "remotion" },
  { name: "Sequence", from: "remotion" },
  { name: "Series", from: "remotion" },
  { name: "Img", from: "remotion" },
  { name: "Audio", from: "remotion" },
  { name: "staticFile", from: "remotion" },
  // Video: the browser <Player> wants <Video>; the server render wants
  // <OffthreadVideo>. Templates always write bare <Video>; each side binds the
  // correct implementation. (Node aliases OffthreadVideo -> Video.)
  { name: "Video", from: "remotion", nodeImport: "OffthreadVideo" },
  // Brand design tokens. Browser supplies the object; node imports { brand }
  // from the generated ./brand module (named export).
  { name: "brand", from: "./brand", brand: true },
];

export const PRIMITIVE_NAMES = PRIMITIVES.map((p) => p.name);
