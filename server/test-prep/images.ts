/**
 * Google Docs puts pasted images on the clipboard as googleusercontent.com
 * links the browser can't download (CSP/CORS), so the server fetches them.
 * Only Google's image hosts over https: anything else could make the server
 * fetch internal addresses (SSRF).
 */

// Client-pasted images are shrunk in the browser; these can't be, so cap them
// (10 big images would also exceed the model's inline request limit).
const MAX_BYTES = 1.5 * 1024 * 1024;

export function isAllowedImageUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && (u.hostname === "googleusercontent.com" || u.hostname.endsWith(".googleusercontent.com"));
  } catch {
    return false;
  }
}

/** The image as a data URL, or null when it isn't an allowed, reasonably sized image. */
export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  if (!isAllowedImageUrl(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: "follow" });
    if (!res.ok || !isAllowedImageUrl(res.url || url)) return null;
    const type = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (!/^image\/(png|jpeg|jpg|webp|gif)$/.test(type)) return null;
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
