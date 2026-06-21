// Pure timing helpers, shared by the in-browser <Player> AND the Node render
// bundle. Kept free of any non-render imports (no seedTemplates / ?raw) so the
// Remotion webpack bundle can import them via TimelineComposition.

import type { Project, Scene } from "./types";

/** Transition frames clamped so they never exceed (and overlap past) either
 *  adjacent scene. 0 means "render as a hard cut". */
export function clampedTransitionFrames(scene: Scene, prev: Scene | undefined): number {
  if (!prev || scene.transition === "none") return 0;
  const max = Math.min(prev.durationInFrames, scene.durationInFrames) - 1;
  return Math.max(0, Math.min(Math.round(scene.transitionDurationInFrames || 0), Math.max(0, max)));
}

/** Total composition length. Adjacent scenes overlap by the (clamped) transition
 *  duration, so we subtract those overlaps. */
export function totalDurationInFrames(project: { scenes: Scene[] }): number {
  let total = 0;
  project.scenes.forEach((s, i) => {
    total += Math.max(1, s.durationInFrames);
    total -= clampedTransitionFrames(s, project.scenes[i - 1]);
  });
  return Math.max(1, total);
}

/** v3 master length: the explicit duration, clamped up to the latest clip end. */
export function projectDuration(p: Pick<Project, "durationInFrames" | "clips">): number {
  const maxEnd = (p.clips ?? []).reduce(
    (m, c) => Math.max(m, c.startFrame + Math.max(1, c.durationInFrames)),
    0
  );
  return Math.max(1, p.durationInFrames || 0, maxEnd);
}

/** Frame at which a given scene index starts on the master timeline. */
export function sceneStartFrame(project: { scenes: Scene[] }, index: number): number {
  let start = 0;
  for (let i = 0; i < index && i < project.scenes.length; i++) {
    start += Math.max(1, project.scenes[i].durationInFrames);
    start -= clampedTransitionFrames(project.scenes[i + 1], project.scenes[i]);
  }
  return Math.max(0, start);
}
