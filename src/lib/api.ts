/**
 * API base URL for napai-api backend.
 * Change this single value to switch between local and production.
 * Override with VITE_RAG_API_URL in .env for local dev.
 */
export const API_BASE =
  import.meta.env.VITE_RAG_API_URL || "http://localhost/napai-api";
  //import.meta.env.VITE_RAG_API_URL || "https://nap-ai.com/api";
