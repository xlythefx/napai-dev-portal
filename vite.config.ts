import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { claudeBridge } from "./vite-claude-plugin";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    // Forward the PHP backend (relative /napai-api/*) to WAMP on port 80 so the
    // app works in the plain dev server too — api.ts keeps API_BASE relative
    // for same-origin/proxied requests. (Cloude's remote config injects the
    // same proxy; keeping it here makes `vite`/`npm run dev` work standalone.)
    proxy: {
      "/napai-api": { target: "http://localhost", changeOrigin: true },
    },
  },
  plugins: [react(), claudeBridge()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // @remotion/bundler and @remotion/renderer are Node-only (they spawn a
  // headless Chromium and run esbuild). They're imported solely from
  // server/*.mjs via the Vite plugin — never from src/. Excluding them from
  // the client dep optimizer keeps them out of the browser graph.
  optimizeDeps: {
    exclude: ["@remotion/bundler", "@remotion/renderer"],
  },
}));
