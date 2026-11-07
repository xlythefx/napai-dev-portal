# Nap.AI Digital Space

Vite + React 18 + TypeScript + Tailwind + shadcn/ui (`vite_react_shadcn_ts`).
Routing is `react-router-dom`, data is `@tanstack/react-query`, animation is
`framer-motion`.

## Use the 21st.dev MCP for UI work

The `21st` MCP server is registered at **local scope** for this project (stored
in `~/.claude.json`, not in the repo — the API key must never be committed).
**Use it for any UI work** — new sections, landing/marketing components,
redesigns, or replacing a hand-rolled visual with something better.

Workflow:

1. Search 21st for a component that fits the request before hand-writing one.
2. Pull the component source via the MCP rather than pasting from the website.
3. Drop it in `src/components/ui/` (shared primitives) and compose it from a
   section component in `src/components/`.
4. **Re-token it before committing** — see below. 21st components ship with
   their own palette and will not match this repo out of the box.

Verify with `claude mcp list` — it should read `21st: ... ✔ Connected`. If the
server is missing entirely, re-add it (run this in a **terminal**, not in the
Claude chat box):

```bash
claude mcp add --scope local --transport http 21st https://21st.dev/api/mcp \
  --header "x-api-key: <your-21st-key>"
```

## Design tokens — the non-negotiable part

Every colour lives in `src/index.css` as an **HSL triplet** custom property and
is exposed through `tailwind.config.ts`. The palette is deliberately
**monochrome** (greys from `0 0% 5%` to `0 0% 100%`), with `--destructive` the
only hue. Accent colours (emerald / violet / amber) appear only as small
category dots and gradient washes.

Rules when adapting a 21st component:

- **Never** hardcode hex, `rgb()`, or named colours in JSX or CSS. Use the
  Tailwind token classes (`bg-card`, `text-muted-foreground`, `border-border`,
  `bg-primary text-primary-foreground`) or `hsl(var(--token) / 0.1)` in inline
  styles.
- 21st components usually arrive with `bg-white` / `bg-black` / `text-gray-500`
  / `bg-blue-600`. Map them:
  `bg-white`→`bg-card`, `bg-black`→`bg-background`, `text-gray-500`→
  `text-muted-foreground`, `border-gray-200`→`border-border`, any brand accent→
  `bg-primary` / `text-primary`.
- Card idiom used across this repo:
  `rounded-2xl border border-border bg-card/60 backdrop-blur-sm` with
  `hover:border-foreground/30 transition-colors`.
- Radii come from `--radius` (0.75rem) — prefer `rounded-2xl` for cards,
  `rounded-full` for pills and buttons.

### Canvas and WebGL components need resolved colours

A `<canvas>` 2D context **cannot parse CSS custom properties**. Assigning
`ctx.fillStyle = "hsl(var(--primary))"` is an unparseable value, so it is
silently ignored and the style stays at its default black — the component
appears to work in light mode and breaks in dark mode.

Many 21st background components (flickering grids, wave fields, particle
backdrops) take a `color` prop and pass it straight to canvas. For those, resolve
the token first with the helpers in [src/lib/theme-color.ts](src/lib/theme-color.ts):

```tsx
import { useThemeColor } from "@/lib/theme-color";

// Re-resolves automatically when the theme changes.
const resolvedColor = useThemeColor(color); // "hsl(var(--primary))" -> "rgb(23, 23, 23)"
ctx.fillStyle = resolvedColor;
```

Use `resolveThemeColorHex()` for libraries that only accept `#rrggbb`.

Also make sure any `requestAnimationFrame` loop is cancelled in the effect
cleanup — several 21st canvas components ship without it and stack loops on
every re-render.

## Layout conventions

- Sections: `py-32`, `container mx-auto px-4`, content wrapped in a
  `motion.div` with `initial/whileInView` and `viewport={{ once: true }}`.
- Headings: `text-4xl md:text-6xl font-bold tracking-tighter leading-tight`,
  with the emphasised phrase in `<span className="text-primary">`.
- Eyebrow pill: `inline-flex items-center gap-2 px-3 py-1.5 rounded-full
  bg-primary/5 border border-primary/15`.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run lint` — ESLint
