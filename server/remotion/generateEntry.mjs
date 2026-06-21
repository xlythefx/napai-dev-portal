// Generates a temporary Remotion project for one render: a brand module, one
// module per template (wrapped from raw code), and a Root that imports the SHARED
// VideoComposition from src/ and registers a single <Composition>. The entry dir
// lives inside the project (so webpack resolves node_modules + the relative src
// import), and templates are written as t0/t1/… to avoid any id-as-filename
// issues.

import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { BRAND } from "./brand.mjs";
import { wrapTemplate } from "./templateWrap.mjs";

/**
 * @param {string} entryDir   absolute dir to write the entry into (inside project)
 * @param {object} project    the video Project (templates + scenes + dims + fps)
 * @param {string} projectRoot absolute project root (contains src/ and node_modules/)
 * @returns {string} absolute path to index.ts (the bundle entry point)
 */
export function generateEntry(entryDir, project, projectRoot) {
  mkdirSync(entryDir, { recursive: true });

  // Everything is written flat in entryDir so the templates' `./brand` import
  // resolves (templates and brand sit side by side).
  writeFileSync(join(entryDir, "brand.tsx"), `export const brand = ${JSON.stringify(BRAND)};\n`, "utf8");

  // One module per template (wrapped with the primitive import header).
  const imports = [];
  const registry = [];
  project.templates.forEach((t, i) => {
    writeFileSync(join(entryDir, `t${i}.tsx`), wrapTemplate(t.code), "utf8");
    imports.push(`import Tpl${i} from "./t${i}";`);
    registry.push(`  ${JSON.stringify(t.id)}: Tpl${i},`);
  });

  // Relative path from the entry dir to src/ (forward slashes for the import).
  const srcDir = join(projectRoot, "src");
  const importBase = relative(entryDir, srcDir).split(sep).join("/");

  const defaultProps = {
    tracks: project.tracks ?? [],
    clips: project.clips ?? [],
    background: project.background ?? { segments: [] },
    durationInFrames: Math.max(1, project.durationInFrames || 1),
  };

  const root = `import React from "react";
import { Composition } from "remotion";
import { TimelineComposition } from "${importBase}/components/remotion/TimelineComposition";
import { projectDuration } from "${importBase}/lib/remotion/timing";
${imports.join("\n")}

const components = {
${registry.join("\n")}
};

const Main = ({ tracks, clips, background }) => (
  <TimelineComposition tracks={tracks} clips={clips} background={background} components={components} />
);

const DEFAULT_PROPS = ${JSON.stringify(defaultProps)};

export const RemotionRoot = () => (
  <Composition
    id="main"
    component={Main}
    width={${project.width}}
    height={${project.height}}
    fps={${project.fps}}
    durationInFrames={Math.max(1, projectDuration(DEFAULT_PROPS))}
    defaultProps={DEFAULT_PROPS}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(1, projectDuration(props)),
    })}
  />
);
`;
  writeFileSync(join(entryDir, "Root.tsx"), root, "utf8");

  const index = `import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";
registerRoot(RemotionRoot);
`;
  const indexPath = join(entryDir, "index.ts");
  writeFileSync(indexPath, index, "utf8");
  return indexPath;
}
