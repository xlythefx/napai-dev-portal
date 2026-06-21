/**
 * API base URL for the napai-api backend.
 * Relative by default so requests are same-origin and can be PROXIED — this is what makes
 * the app work in cloud-ide's preview (local AND over the tunnel): /napai-api/* is forwarded
 * to the real backend (WAMP at http://localhost/napai-api) by the dev server's proxy.
 * For a production build, set VITE_API_URL (e.g. https://nap-ai.com/api).
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? "/napai-api";

/**
 * Base URL for the Remotion render service.
 * Dev: empty string -> same-origin /api/video-render (served by the Vite plugin).
 * Prod: point at the standalone Node render service, e.g. "https://render.nap-ai.com".
 */
export const API_RENDER_BASE = "";
