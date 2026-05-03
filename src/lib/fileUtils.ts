import * as pdfjsLib from "pdfjs-dist";

// Use worker from public folder - .js avoids MIME type issues on Hostinger (serves .mjs as text/plain)
const workerUrl = (import.meta.env.BASE_URL || "/") + "pdf.worker.min.js";
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "txt") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) ?? "");
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  if (ext === "pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const textParts: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      textParts.push(pageText);
    }

    return textParts.join("\n\n");
  }

  throw new Error(`Unsupported file type: ${ext}. Use .txt or .pdf`);
}

export function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) return [];

  let start = 0;
  while (start < trimmed.length) {
    let end = start + chunkSize;
    if (end < trimmed.length) {
      // Try to break at word boundary
      const lastSpace = trimmed.lastIndexOf(" ", end);
      if (lastSpace > start) end = lastSpace;
    }
    const chunk = trimmed.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start = end - overlap;
    if (start >= trimmed.length) break;
  }

  return chunks;
}
