// Brand design tokens — the single source consumed by both the browser preview
// (src/lib/remotion/registry.ts re-exports this) and the Node render service
// (generateEntry.mjs serializes this into a brand module the templates import).
// Pure data only.

export const BRAND = {
  fontHeading: "Poppins, system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontBody: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
  colors: {
    primary: "#6366f1",
    accent: "#ec4899",
    dark: "#0f172a",
    light: "#f8fafc",
    muted: "#94a3b8",
    success: "#10b981",
    warning: "#f59e0b",
  },
  radius: 16,
};
