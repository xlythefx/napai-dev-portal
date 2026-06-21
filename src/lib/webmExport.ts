// In-browser WebM export (phased: real-time capture).
//
// Renders each slide's live DOM (React + framer-motion) at full deck resolution
// off-screen, rasterizes it onto a canvas with html-to-image, and records the
// canvas stream with MediaRecorder. Animation runs in real time, so the output
// duration matches the deck; visual frame rate is limited by rasterization speed
// (choppy but correct timing). MP4 / frame-accurate render is a later (server)
// phase — the declarative slideshow model is built to support it.

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { toCanvas } from "html-to-image";
import SlideRenderer from "@/components/slideshow-studio/SlideRenderer";
import { Slideshow, deckDurationMs } from "./slideshow";

function pickMime(): string {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "video/webm";
}

function wait(ms: number) {
  return new Promise<void>((r) => window.setTimeout(r, ms));
}

function nextFrame() {
  return new Promise<void>((r) => requestAnimationFrame(() => r()));
}

// Preload all image-element + background data URLs so nothing pops in mid-capture.
async function preloadImages(deck: Slideshow): Promise<void> {
  const srcs = new Set<string>();
  for (const s of deck.slides) {
    if (s.background.type === "image" && s.background.src) srcs.add(s.background.src);
    for (const el of s.elements) if (el.type === "image" && el.src) srcs.add(el.src);
  }
  await Promise.all(
    [...srcs].map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
        })
    )
  );
}

export interface ExportOptions {
  onProgress?: (fraction: number) => void;
}

export async function exportDeckToWebm(deck: Slideshow, opts: ExportOptions = {}): Promise<Blob> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Your browser does not support MediaRecorder (WebM export).");
  }
  const { width, height, fps } = deck.settings;
  const total = deckDurationMs(deck);

  // Off-screen host for the live React stage at full resolution.
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-100000px;top:0;width:${width}px;height:${height}px;overflow:hidden;background:#000;`;
  document.body.appendChild(host);
  const root = createRoot(host);

  // Capture canvas + recorder.
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    root.unmount();
    host.remove();
    throw new Error("Could not get a 2D canvas context.");
  }
  const stream = canvas.captureStream(fps);
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, { mimeType: pickMime(), videoBitsPerSecond: 8_000_000 });
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  try {
    await preloadImages(deck);
    if (document.fonts?.ready) await document.fonts.ready;

    recorder.start();
    let elapsedBefore = 0;

    for (let i = 0; i < deck.slides.length; i++) {
      const slide = deck.slides[i];
      // Render this slide playing at scale 1, fresh playKey to replay enter anims.
      root.render(
        createElement(SlideRenderer, { slide, settings: deck.settings, scale: 1, mode: "play", playKey: i + 1 })
      );
      // Let React mount + fonts settle before the first grab.
      await nextFrame();
      await nextFrame();

      const slideMs = slide.durationMs + slide.transitionMs;
      const start = performance.now();
      // Real-time loop: rasterize as fast as we can; captureStream samples at fps.
      for (;;) {
        const now = performance.now();
        const into = now - start;
        if (into >= slideMs) break;
        try {
          const snap = await toCanvas(host, { width, height, pixelRatio: 1, cacheBust: false });
          ctx.drawImage(snap, 0, 0, width, height);
        } catch {
          /* skip a frame on transient rasterize errors */
        }
        opts.onProgress?.(Math.min(0.99, (elapsedBefore + into) / total));
        await nextFrame();
      }
      elapsedBefore += slideMs;
    }

    opts.onProgress?.(1);

    const blob: Blob = await new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      recorder.stop();
    });
    return blob;
  } finally {
    stream.getTracks().forEach((t) => t.stop());
    root.unmount();
    host.remove();
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
