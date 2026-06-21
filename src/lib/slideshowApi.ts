import { API_BASE } from "./api";
import { DeckSettings, Slide, Slideshow } from "./slideshow";

const url = (path: string) => `${API_BASE}/controllers/tools/content_slideshows/${path}`;

export interface SlideshowPreview {
  aspectRatio: string;
  background: {
    type: string;
    color: string;
    gradientFrom: string;
    gradientTo: string;
    gradientAngle: number;
  };
  firstText: string;
  slideCount: number;
  durationMs: number;
}

export interface SlideshowSummary {
  id: string;
  name: string;
  slideCount: number;
  durationMs: number;
  updated_at: string;
  preview: SlideshowPreview | null;
}

export async function listSlideshows(user_email: string): Promise<SlideshowSummary[]> {
  const res = await fetch(url(`list.php?user_email=${encodeURIComponent(user_email)}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to load slideshows (${res.status})`);
  return (data.slideshows ?? []).map((s: SlideshowSummary & { id: number }) => ({ ...s, id: String(s.id) }));
}

export async function getSlideshow(user_email: string, id: string): Promise<Slideshow> {
  const qs = new URLSearchParams({ id, user_email });
  const res = await fetch(url(`get.php?${qs.toString()}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to load slideshow (${res.status})`);
  const s = data.slideshow;
  return {
    id: String(s.id),
    name: s.name,
    settings: s.settings as DeckSettings,
    slides: s.slides as Slide[],
    createdAt: Date.parse(s.created_at) || Date.now(),
    updatedAt: Date.parse(s.updated_at) || Date.now(),
  };
}

export async function createSlideshow(
  user_email: string,
  name: string,
  settings: DeckSettings,
  slides: Slide[]
): Promise<string> {
  const res = await fetch(url("create.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_email, name, slideshow_json: { settings, slides } }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data?.error || `Failed to create slideshow (${res.status})`);
  return String(data.id);
}

export async function updateSlideshow(
  user_email: string,
  id: string,
  deck: { name: string; settings: DeckSettings; slides: Slide[] }
): Promise<void> {
  const res = await fetch(url("update.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_email,
      id: Number(id),
      name: deck.name,
      slideshow_json: { settings: deck.settings, slides: deck.slides },
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data?.error || `Failed to save slideshow (${res.status})`);
}

export async function deleteSlideshow(user_email: string, id: string): Promise<void> {
  const res = await fetch(url("delete.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_email, id: Number(id) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to delete slideshow (${res.status})`);
}
