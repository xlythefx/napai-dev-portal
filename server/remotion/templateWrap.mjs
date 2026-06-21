// Wraps a raw template TSX string (no imports, bare-identifier primitives) into
// a compilable ES module for the Node render bundle, by prepending an import
// header generated from the SAME primitive list the browser preview uses
// (server/remotion/primitives.mjs) — this shared list is what keeps preview ===
// export.

import { PRIMITIVES } from "./primitives.mjs";

/** Build the `import ... from "..."` header for the curated primitives. */
export function buildHeader() {
  // Group primitives by their source module.
  const groups = new Map(); // from -> { defaults: string[], named: string[] }
  for (const p of PRIMITIVES) {
    const g = groups.get(p.from) || { defaults: [], named: [] };
    if (p.default) g.defaults.push(p.name);
    else g.named.push(p.nodeImport ? `${p.nodeImport} as ${p.name}` : p.name);
    groups.set(p.from, g);
  }

  const lines = [];
  for (const [from, g] of groups) {
    const parts = [];
    if (g.defaults.length) parts.push(g.defaults[0]);
    if (g.named.length) parts.push(`{ ${g.named.join(", ")} }`);
    lines.push(`import ${parts.join(", ")} from "${from}";`);
  }
  return lines.join("\n");
}

/** Prepend the header to raw template code, producing a self-contained module. */
export function wrapTemplate(code) {
  return `${buildHeader()}\n\n${code}\n`;
}
