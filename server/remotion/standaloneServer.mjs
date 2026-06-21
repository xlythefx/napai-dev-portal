// Standalone Node render service for production. Exposes the same
// POST /api/video-render that the Vite plugin serves in dev, reusing
// renderVideo.mjs. Run with: npm run render:server  (RENDER_PORT overrides 3001).
//
// In production, set API_RENDER_BASE in src/lib/api.ts to this service's origin
// and run it behind a process manager (NSSM / pm2 / systemd) on a box with a
// headless Chromium (downloaded on first render).

import { createServer } from "node:http";
import { readFile, unlink } from "node:fs/promises";
import { renderProjectToMp4 } from "./renderVideo.mjs";

const PORT = Number(process.env.RENDER_PORT) || 3001;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 50 * 1024 * 1024) reject(new Error("Request body too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const url = req.url || "";
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET" && url.startsWith("/health")) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "POST" && url.startsWith("/api/video-render")) {
    let outPath = null;
    try {
      const raw = await readBody(req);
      const payload = raw ? JSON.parse(raw) : {};
      outPath = await renderProjectToMp4(payload.project);
      const buf = await readFile(outPath);
      res.statusCode = 200;
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", 'attachment; filename="video.mp4"');
      res.end(buf);
    } catch (err) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: err?.message || String(err) }));
    } finally {
      if (outPath) unlink(outPath).catch(() => {});
    }
    return;
  }

  res.statusCode = 404;
  res.end("Not found");
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[remotion-render] listening on http://localhost:${PORT}`);
});
