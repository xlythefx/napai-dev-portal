// Shared helpers for attaching screenshots/images to the AI assistants.
// Reads pasted/dropped/picked images, downscaling large ones to keep token cost
// and request size sane (Anthropic recommends a ~1568px long edge).

export interface AttachedImage {
  id: string;
  dataUrl: string;
}

export const MAX_ATTACHMENTS = 6;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read image"));
    r.readAsDataURL(blob);
  });
}

/** Read an image file/blob to a data URL, downscaling its long edge to maxDim. */
export async function imageToDataUrl(blob: Blob, maxDim = 1568): Promise<string> {
  const objUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Could not decode image"));
      i.src = objUrl;
    });
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    if (longest <= maxDim) return await blobToDataUrl(blob); // small enough, keep original
    const scale = maxDim / longest;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return await blobToDataUrl(blob);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(objUrl);
  }
}

function uid(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* noop */
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** Extract image File/Blobs from a paste or drop event's items/files. */
function imageBlobsFrom(dt: DataTransfer | null): Blob[] {
  if (!dt) return [];
  const out: Blob[] = [];
  if (dt.files && dt.files.length) {
    for (const f of Array.from(dt.files)) if (f.type.startsWith("image/")) out.push(f);
  }
  if (out.length === 0 && dt.items) {
    for (const it of Array.from(dt.items)) {
      if (it.kind === "file" && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) out.push(f);
      }
    }
  }
  return out;
}

/** Turn clipboard/drop/file-input sources into AttachedImage[], respecting the cap. */
export async function collectImages(
  source: DataTransfer | FileList | null,
  existingCount: number
): Promise<AttachedImage[]> {
  let blobs: Blob[];
  if (source instanceof FileList) {
    blobs = Array.from(source).filter((f) => f.type.startsWith("image/"));
  } else {
    blobs = imageBlobsFrom(source);
  }
  const room = Math.max(0, MAX_ATTACHMENTS - existingCount);
  blobs = blobs.slice(0, room);
  const results = await Promise.all(
    blobs.map(async (b) => ({ id: uid(), dataUrl: await imageToDataUrl(b) }))
  );
  return results;
}
