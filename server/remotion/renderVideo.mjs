// Render a video Project to an MP4 using @remotion/bundler + @remotion/renderer.
// Bundles are cached by a hash of (template code + dims + fps), since only those
// determine the bundle — scenes/props vary per render and are passed as
// inputProps. The headless browser is downloaded on first use.

import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia, ensureBrowser } from "@remotion/renderer";
import { generateEntry } from "./generateEntry.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const CACHE_ROOT = join(PROJECT_ROOT, ".remotion-cache");

const bundleCache = new Map(); // hash -> serveUrl

function projectHash(project) {
  const h = createHash("sha1");
  h.update(project.templates.map((t) => `${t.id}:${t.code}`).join("|"));
  h.update(`|${project.fps}|${project.width}|${project.height}`);
  return h.digest("hex").slice(0, 16);
}

function assertMediaUrls(project) {
  const isLocal = (v) => typeof v === "string" && /^(data:|blob:)/.test(v);
  (project.clips || []).forEach((clip, i) => {
    const layer = clip.layer || {};
    if (isLocal(layer.src)) {
      throw new Error(`Clip ${i + 1} (${layer.type}) uses a local-only URL — upload the media before rendering.`);
    }
    if (layer.type === "component") {
      for (const [k, v] of Object.entries(layer.props || {})) {
        if (isLocal(v)) {
          throw new Error(`Clip ${i + 1} prop "${k}" is a local-only URL — upload the media before rendering.`);
        }
      }
    }
  });
  for (const seg of project.background?.segments || []) {
    if (isLocal(seg?.background?.src)) {
      throw new Error("A background image is a local-only URL — upload it before rendering.");
    }
  }
}

async function getServeUrl(project, onProgress) {
  const hash = projectHash(project);
  if (bundleCache.has(hash)) return bundleCache.get(hash);

  const entryDir = join(CACHE_ROOT, hash);
  mkdirSync(entryDir, { recursive: true });
  const entryPoint = generateEntry(entryDir, project, PROJECT_ROOT);

  const serveUrl = await bundle({
    entryPoint,
    onProgress: (p) => onProgress?.({ phase: "bundling", progress: p / 100 }),
  });
  bundleCache.set(hash, serveUrl);
  return serveUrl;
}

/**
 * @param {object} project
 * @param {{ onProgress?: (p: {phase:string, progress:number}) => void }} [opts]
 * @returns {Promise<string>} absolute path to the rendered .mp4
 */
export async function renderProjectToMp4(project, { onProgress } = {}) {
  if (!project || !Array.isArray(project.clips) || project.clips.length === 0) {
    throw new Error("Project has no clips.");
  }
  assertMediaUrls(project);

  await ensureBrowser();
  const serveUrl = await getServeUrl(project, onProgress);
  const inputProps = {
    tracks: project.tracks ?? [],
    clips: project.clips ?? [],
    background: project.background ?? { segments: [] },
    durationInFrames: Math.max(1, project.durationInFrames || 1),
  };

  const composition = await selectComposition({ serveUrl, id: "main", inputProps });

  const outDir = join(tmpdir(), "napai-remotion-out");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${projectHash(project)}-${Date.now()}.mp4`);

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outPath,
    inputProps,
    onProgress: ({ progress }) => onProgress?.({ phase: "rendering", progress }),
  });

  return outPath;
}
