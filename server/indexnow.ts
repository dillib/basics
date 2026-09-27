/**
 * IndexNow (indexnow.org): tell Bing, Yandex, Naver, Seznam... the moment a
 * lesson is published or rewritten, instead of waiting for a re-crawl. Bing's
 * index also feeds ChatGPT search and Copilot.
 *
 * The key is public by design -- search engines verify it by fetching
 * /<key>.txt from this site (served in routes.ts). Override with
 * INDEXNOW_KEY if it ever needs rotating.
 */
export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "a763e0002b6d297a11a8546ce5e5cfac";

const SITE = (process.env.PUBLIC_URL || "https://www.basicstutor.com").replace(/\/$/, "");

/** Fire-and-forget; never throws. Production only (dev URLs aren't public). */
export function notifyIndexNow(paths: string[]): void {
  if (process.env.NODE_ENV !== "production" || process.env.INDEXNOW_DISABLED === "true" || paths.length === 0) return;
  const host = new URL(SITE).host;
  const urlList = paths.map((p) => `${SITE}${p.startsWith("/") ? p : `/${p}`}`);
  fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList }),
    signal: AbortSignal.timeout(10_000),
  })
    .then((r) => console.log(`[IndexNow] ${urlList.length} URL(s) -> ${r.status}`))
    .catch((err) => console.warn("[IndexNow] ping failed:", err?.message));
}
