// How did this reader get here? Captured once, when the site first loads (this
// module is imported from main.tsx, before any client-side navigation). The
// first lesson opened on that landing page is attributed to the referrer /
// utm tags; lessons reached by clicking around afterwards count as "internal".
// Only what the browser already exposes is sent; the server keeps the
// referring domain alone (server/traffic.ts). No cookies.

const landing = (() => {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return {
    path: window.location.pathname,
    referrer: document.referrer || "",
    utmSource: params.get("utm_source") || undefined,
    utmMedium: params.get("utm_medium") || undefined,
  };
})();
let landingUsed = false;

function alreadyCounted(key: string): boolean {
  try {
    if (sessionStorage.getItem(key)) return true;
    sessionStorage.setItem(key, "1");
  } catch {
    /* storage blocked: count it anyway */
  }
  return false;
}

/** Report one read of a lesson (once per lesson per browser tab session). */
export function reportLessonView(topicId: string, pathname: string = window.location.pathname) {
  const isLanding = !!landing && !landingUsed && pathname === landing.path;
  if (isLanding) landingUsed = true;
  if (alreadyCounted(`bt-viewed:${topicId}`)) return;

  const body = isLanding
    ? { referrer: landing!.referrer, utmSource: landing!.utmSource, utmMedium: landing!.utmMedium }
    : { internal: true };
  fetch(`/api/topics/${encodeURIComponent(topicId)}/view`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
    credentials: "include",
  }).catch(() => {
    /* analytics must never break the page */
  });
}
