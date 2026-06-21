// Pure helpers over the v3 flat-timeline model (Clip / Track). Kept free of any
// non-render imports (no seedTemplates / ?raw) so the Node render bundle can use
// it, same rule as timing.ts / layers.ts.

import type { Clip, Section, Track, TrackKind } from "./types";
import { cloneLayer, uid, type Layer } from "./layers";

/** Global frame just past the end of a clip. */
export function clipEnd(clip: Clip): number {
  return clip.startFrame + Math.max(1, clip.durationInFrames);
}

/** Wrap an existing Layer payload as a placed clip. */
export function newClip(
  layer: Layer,
  trackId: string,
  startFrame: number,
  durationInFrames: number
): Clip {
  return {
    id: uid("clip"),
    trackId,
    layer,
    startFrame: Math.max(0, Math.round(startFrame)),
    durationInFrames: Math.max(1, Math.round(durationInFrames)),
  };
}

/** A timeline row. */
export function newTrack(kind: TrackKind, name: string): Track {
  return { id: uid("track"), kind, name };
}

/** A ruler marker (the old "Scene"). */
export function newSection(name: string, startFrame: number): Section {
  return { id: uid("sec"), name, startFrame: Math.max(0, Math.round(startFrame)) };
}

/** Clone a clip (fresh ids on clip AND its layer) nudged later in time so the
 *  copy is visible; stays on the same track. */
export function cloneClip(clip: Clip, frameOffset = 0): Clip {
  return {
    id: uid("clip"),
    trackId: clip.trackId,
    layer: cloneLayer(clip.layer),
    startFrame: Math.max(0, clip.startFrame + Math.round(frameOffset)),
    durationInFrames: clip.durationInFrames,
  };
}

/** Clips on a given track, ordered by start frame. */
export function clipsOnTrack(clips: Clip[], trackId: string): Clip[] {
  return clips.filter((c) => c.trackId === trackId).sort((a, b) => a.startFrame - b.startFrame);
}

/** Clips visible at a global frame (start ≤ frame < end). */
export function clipsAtFrame(clips: Clip[], frame: number): Clip[] {
  return clips.filter((c) => frame >= c.startFrame && frame < clipEnd(c));
}

/**
 * Clips in render order. Tracks are stored TOP→BOTTOM (UI order), so we walk
 * them BOTTOM→TOP and, within each track, preserve the clips' array order — the
 * resulting sequence maps to ascending zIndex, reproducing the old
 * `zIndex = layer array index` semantics. Hidden VIDEO tracks are skipped;
 * audio tracks are kept (their clips still need to play). Orphaned clips (track
 * missing) are appended last.
 */
export function orderedClipsForRender(tracks: Track[], clips: Clip[]): Clip[] {
  const out: Clip[] = [];
  for (let i = tracks.length - 1; i >= 0; i--) {
    const t = tracks[i];
    if (t.kind === "video" && t.hidden) continue;
    for (const c of clips) if (c.trackId === t.id) out.push(c);
  }
  for (const c of clips) if (!tracks.some((t) => t.id === c.trackId)) out.push(c);
  return out;
}

/** Is a clip's track muted (audio) — used to silence playback in render. */
export function isClipMuted(tracks: Track[], clip: Clip): boolean {
  const t = tracks.find((tr) => tr.id === clip.trackId);
  return !!t?.muted;
}

function clipsOverlap(a: Clip, b: Clip): boolean {
  return a.startFrame < b.startFrame + Math.max(1, b.durationInFrames) && b.startFrame < a.startFrame + Math.max(1, a.durationInFrames);
}

/** True if a [start, start+dur) window is free of clips on the given track. */
export function trackHasRoom(clips: Clip[], trackId: string, start: number, dur: number): boolean {
  return !clips.some((c) => c.trackId === trackId && c.startFrame < start + dur && start < c.startFrame + Math.max(1, c.durationInFrames));
}

/**
 * Re-pack video clips onto stacked video tracks so simultaneous clips never
 * share a row (Premiere-style). z-order is preserved: a clip earlier in the
 * array stays BELOW any later clip it overlaps. Audio tracks/clips are left
 * untouched. Tracks are returned TOP→BOTTOM (UI order); the bottom row is "V1".
 */
export function autoArrange(tracks: Track[], clips: Clip[]): { tracks: Track[]; clips: Clip[] } {
  const isAudio = (c: Clip) => c.layer.type === "audio";
  const videoClips = clips.filter((c) => !isAudio(c)); // array order == z (bottom→top)
  const audioClips = clips.filter(isAudio);
  const audioTracks = tracks.filter((t) => t.kind === "audio");

  const zRows: Clip[][] = []; // zRows[0] = bottom (lowest z)
  const placed: { clip: Clip; row: number }[] = [];
  for (const c of videoClips) {
    let minRow = 0;
    for (const p of placed) if (clipsOverlap(p.clip, c)) minRow = Math.max(minRow, p.row + 1);
    let row = -1;
    for (let i = minRow; i < zRows.length; i++) {
      if (!zRows[i].some((pc) => clipsOverlap(pc, c))) { row = i; break; }
    }
    if (row < 0) { zRows.push([]); row = zRows.length - 1; }
    zRows[row].push(c);
    placed.push({ clip: c, row });
  }

  const existingVideo = tracks.filter((t) => t.kind === "video");
  const rowTrack: Track[] = zRows.map((_, i) => newTrack("video", `V${i + 1}`)); // row i (bottom→top)
  const videoTracksTopToBottom = zRows.length > 0 ? [...rowTrack].reverse() : existingVideo.length ? existingVideo : [newTrack("video", "V1")];

  const reassigned = placed.map(({ clip, row }) => ({ ...clip, trackId: rowTrack[row].id }));
  return {
    tracks: [...videoTracksTopToBottom, ...audioTracks],
    clips: [...reassigned, ...audioClips],
  };
}

/**
 * If a clip overlaps another clip on its current track, move it to a same-kind
 * track that has room — or create one (video on top, audio at the bottom). Only
 * the given clip moves; everything else stays put. This is the per-edit
 * "no two clips share a row" guard (Premiere-style) used after move/duplicate/drop.
 */
export function bumpClipFromOverlap(tracks: Track[], clips: Clip[], clipId: string): { tracks: Track[]; clips: Clip[] } {
  const clip = clips.find((c) => c.id === clipId);
  if (!clip) return { tracks, clips };
  const kind: TrackKind = clip.layer.type === "audio" ? "audio" : "video";
  const overlapsOn = (trackId: string) => clips.some((c) => c.id !== clipId && c.trackId === trackId && clipsOverlap(c, clip));
  if (!overlapsOn(clip.trackId)) return { tracks, clips };

  const free = tracks.find((t) => t.kind === kind && t.id !== clip.trackId && !overlapsOn(t.id));
  if (free) return { tracks, clips: clips.map((c) => (c.id === clipId ? { ...c, trackId: free.id } : c)) };

  const name = `${kind === "video" ? "V" : "A"}${tracks.filter((t) => t.kind === kind).length + 1}`;
  const t = newTrack(kind, name);
  const nextTracks = kind === "video" ? [t, ...tracks] : [...tracks, t];
  return { tracks: nextTracks, clips: clips.map((c) => (c.id === clipId ? { ...c, trackId: t.id } : c)) };
}
