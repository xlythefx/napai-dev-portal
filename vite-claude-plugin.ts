import type { ServerResponse } from "node:http";
import type { Plugin, Connect } from "vite";
import { readFile, unlink } from "node:fs/promises";
// @ts-expect-error — plain .mjs module, no type declarations needed
import { generateCopy, claudeStatus, editCanvas, editCanvasStream, editDeck, editDeckStream, editVideoProject, editVideoProjectStream, editTemplate, editTemplateStream, suggestTags } from "./server/claudeBridge.mjs";

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// Reads the full request body as a string.
function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(body);
}

// Pipe a streaming bridge fn's NDJSON events ({thinking|delta|session|done}) to
// the response, terminating with an {error} line on failure.
async function streamEndpoint(
  res: ServerResponse,
  payload: unknown,
  streamFn: (p: unknown, onEvent: (ev: unknown) => void) => Promise<void>,
) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  try {
    await streamFn(payload, (ev) => res.write(JSON.stringify(ev) + "\n"));
  } catch (err) {
    const message = errMessage(err);
    const notInstalled = message.includes("ENOENT");
    res.write(JSON.stringify({ type: "error", error: notInstalled ? "The `claude` CLI was not found. Install Claude Code and run `claude login`." : message }) + "\n");
  }
  res.end();
}

const middleware: Connect.NextHandleFunction = async (req, res, next) => {
  const url = req.url || "";

  if (req.method === "GET" && url.startsWith("/api/claude-status")) {
    try {
      sendJson(res, 200, { ok: true, ...claudeStatus() });
    } catch (err) {
      sendJson(res, 200, { ok: false, loggedIn: false, error: errMessage(err) });
    }
    return;
  }

  if (req.method === "POST" && url.startsWith("/api/copywrite")) {
    try {
      const raw = await readBody(req);
      const payload = raw ? JSON.parse(raw) : {};
      const result = await generateCopy(payload);
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      const message = errMessage(err);
      const notInstalled = message.includes("ENOENT");
      sendJson(res, 200, {
        ok: false,
        error: notInstalled ? "The `claude` CLI was not found. Install Claude Code and run `claude login`." : message,
      });
    }
    return;
  }

  if (req.method === "POST" && url.startsWith("/api/canvas-edit")) {
    try {
      const raw = await readBody(req);
      const payload = raw ? JSON.parse(raw) : {};
      if (payload.stream) { await streamEndpoint(res, payload, editCanvasStream); return; }
      const result = await editCanvas(payload);
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      const message = errMessage(err);
      const notInstalled = message.includes("ENOENT");
      sendJson(res, 200, {
        ok: false,
        error: notInstalled ? "The `claude` CLI was not found. Install Claude Code and run `claude login`." : message,
      });
    }
    return;
  }

  if (req.method === "POST" && url.startsWith("/api/slideshow-edit")) {
    try {
      const raw = await readBody(req);
      const payload = raw ? JSON.parse(raw) : {};
      if (payload.stream) { await streamEndpoint(res, payload, editDeckStream); return; }
      const result = await editDeck(payload);
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      const message = errMessage(err);
      const notInstalled = message.includes("ENOENT");
      sendJson(res, 200, {
        ok: false,
        error: notInstalled ? "The `claude` CLI was not found. Install Claude Code and run `claude login`." : message,
      });
    }
    return;
  }

  if (req.method === "POST" && url.startsWith("/api/video-edit")) {
    const raw = await readBody(req);
    const payload = raw ? JSON.parse(raw) : {};
    // Streaming path (token-by-token NDJSON) — the editor builds the timeline live.
    if (payload.stream) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Cache-Control", "no-cache");
      try {
        await editVideoProjectStream(payload, (ev: unknown) => res.write(JSON.stringify(ev) + "\n"));
      } catch (err) {
        const message = errMessage(err);
        const notInstalled = message.includes("ENOENT");
        res.write(JSON.stringify({ type: "error", error: notInstalled ? "The `claude` CLI was not found. Install Claude Code and run `claude login`." : message }) + "\n");
      }
      res.end();
      return;
    }
    try {
      const result = await editVideoProject(payload);
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      const message = errMessage(err);
      const notInstalled = message.includes("ENOENT");
      sendJson(res, 200, {
        ok: false,
        error: notInstalled ? "The `claude` CLI was not found. Install Claude Code and run `claude login`." : message,
      });
    }
    return;
  }

  if (req.method === "POST" && url.startsWith("/api/template-edit")) {
    try {
      const raw = await readBody(req);
      const payload = raw ? JSON.parse(raw) : {};
      if (payload.stream) { await streamEndpoint(res, payload, editTemplateStream); return; }
      const result = await editTemplate(payload);
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      const message = errMessage(err);
      const notInstalled = message.includes("ENOENT");
      sendJson(res, 200, {
        ok: false,
        error: notInstalled ? "The `claude` CLI was not found. Install Claude Code and run `claude login`." : message,
      });
    }
    return;
  }

  if (req.method === "POST" && url.startsWith("/api/suggest-tags")) {
    try {
      const raw = await readBody(req);
      const payload = raw ? JSON.parse(raw) : {};
      const result = await suggestTags(payload);
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      sendJson(res, 200, { ok: false, error: errMessage(err) });
    }
    return;
  }

  if (req.method === "POST" && url.startsWith("/api/video-render")) {
    let outPath: string | null = null;
    try {
      const raw = await readBody(req);
      const payload = raw ? JSON.parse(raw) : {};
      // Lazy-import: pulls in the heavy Remotion bundler/renderer only on first use.
      const { renderProjectToMp4 } = await import("./server/remotion/renderVideo.mjs");
      outPath = await renderProjectToMp4(payload.project);
      const buf = await readFile(outPath);
      res.statusCode = 200;
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", 'attachment; filename="video.mp4"');
      res.end(buf);
    } catch (err) {
      sendJson(res, 200, { ok: false, error: errMessage(err) });
    } finally {
      if (outPath) unlink(outPath).catch(() => {});
    }
    return;
  }

  next();
};

// Vite plugin: serve the copywriter endpoints during `npm run dev` and
// `npm run preview`, in-process (no separate server to start).
export function claudeBridge(): Plugin {
  return {
    name: "napai-claude-bridge",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
