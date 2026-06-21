// In-browser template compiler. Transpiles a TSX template string with Sucrase
// and evaluates it with the curated primitives injected as scope, producing a
// React component for live <Player> preview.
//
// The matching Node path (server/remotion/templateWrap.mjs) compiles the SAME
// raw code via esbuild after prepending an import header — so a template that
// previews here renders identically on export.

import type React from "react";
import { transform } from "sucrase";
import type { PropValues } from "./types";
import { buildScope, PRIMITIVE_NAMES } from "./registry";

export type TemplateComponent = React.FC<{ props: PropValues }>;

export interface CompiledTemplate {
  component: TemplateComponent | null;
  error: string | null;
}

const cache = new Map<string, CompiledTemplate>();

/** Cheap pre-check used by the editor + AI client before accepting code. */
export function parseTemplate(code: string): { ok: boolean; error: string | null } {
  try {
    transform(code, { transforms: ["typescript", "jsx", "imports"], jsxRuntime: "classic", production: true });
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || String(e) };
  }
}

export function compileTemplate(code: string): CompiledTemplate {
  const cached = cache.get(code);
  if (cached) return cached;

  let result: CompiledTemplate;
  try {
    // `imports` transform turns `export default X` into `exports.default = X`
    // (and would turn imports into require() — but validated templates have
    // none). Bare identifiers (AbsoluteFill, useCurrentFrame, brand, …) stay
    // free and resolve to the injected primitives.
    const js = transform(code, {
      transforms: ["typescript", "jsx", "imports"],
      jsxRuntime: "classic",
      production: true,
    }).code;

    const names = PRIMITIVE_NAMES;
    const scope = buildScope();
    const args = names.map((n) => scope[n]);

    const requireStub = (id: string) => {
      throw new Error(`Templates cannot import modules ("${id}").`);
    };

    // eslint-disable-next-line no-new-func
    const factory = new Function(
      ...names,
      "require",
      "exports",
      "module",
      `${js}\n;return (module.exports && module.exports.default) || exports.default;`
    );

    const mod = { exports: {} as { default?: TemplateComponent } };
    const component = factory(...args, requireStub, mod.exports, mod) as TemplateComponent | undefined;

    if (typeof component !== "function") {
      throw new Error("Template must `export default` a component.");
    }
    result = { component, error: null };
  } catch (e) {
    result = { component: null, error: (e as Error)?.message || String(e) };
  }

  cache.set(code, result);
  return result;
}

/** Compile a whole project's templates into an id -> component map for <Player>.
 *  Templates that fail to compile map to a component that renders nothing (the
 *  TemplateHost shows the error instead, keyed by missing component). */
export function compileTemplateMap(
  templates: { id: string; code: string }[]
): { components: Record<string, TemplateComponent>; errors: Record<string, string> } {
  const components: Record<string, TemplateComponent> = {};
  const errors: Record<string, string> = {};
  for (const t of templates) {
    const { component, error } = compileTemplate(t.code);
    if (component) components[t.id] = component;
    if (error) errors[t.id] = error;
  }
  return { components, errors };
}
