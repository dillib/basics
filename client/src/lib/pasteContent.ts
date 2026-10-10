import { TEST_PREP_LIMITS } from "@shared/test-prep";

/** Pasted homework: is it a set of questions rather than one topic search? */
export function looksLikeQuestionSet(text: string): boolean {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const numbered = lines.filter((l) => /^(q\s*\d+|\d+\s*[.)]|\(\d+\))\s*\S/i.test(l)).length;
  if (numbered >= 3) return true;
  const options = lines.filter((l) => /^\(?[a-h][).]\s+\S/i.test(l)).length;
  const questionMarks = (text.match(/\?/g) || []).length;
  return options >= 2 && questionMarks >= 2;
}

/**
 * Text plus any images on the clipboard: image files (screenshots), inline
 * data images, and hosted image links. Google Docs puts its images on the
 * clipboard as googleusercontent.com links; the browser can't download those
 * (CSP/CORS), so they go to the server as `imageUrls` (server/test-prep/images.ts).
 */
export async function extractClipboard(e: ClipboardEvent): Promise<{ text: string; images: string[]; imageUrls: string[] }> {
  const data = e.clipboardData;
  if (!data) return { text: "", images: [], imageUrls: [] };
  // Read everything synchronously: the clipboard is unreadable once the event returns.
  const text = data.getData("text/plain");
  const html = data.getData("text/html");
  const files = Array.from(data.files).filter((f) => f.type.startsWith("image/"));
  const images: string[] = [];
  const imageUrls: string[] = [];
  for (const file of files) images.push(await fileToDataUrl(file));
  if (!images.length) {
    for (const m of Array.from(html.matchAll(/<img[^>]+src="([^"]+)"/gi))) {
      const src = m[1].replace(/&amp;/g, "&");
      if (src.startsWith("data:image/")) images.push(src);
      else if (src.startsWith("https://")) imageUrls.push(src);
    }
  }
  return { text, images, imageUrls };
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/** Longest side ≤ maxSide, re-encoded as JPEG, so uploads stay small. */
export function shrinkImage(dataUrl: string, maxSide: number = TEST_PREP_LIMITS.maxImageSide): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.fillStyle = "#fff"; // transparent PNGs become white, not black
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("unreadable image"));
    img.src = dataUrl;
  });
}
