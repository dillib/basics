// The server sends each public page with a pre-rendered HTML snapshot inside
// #root (server/seo.ts) -- the real lesson text, for crawlers and for a fast
// first paint. React replaces #root on mount; without this, readers saw that
// text vanish into a blank/"Loading..." state for a moment before the app
// drew it again. Capture the snapshot before React mounts (this module is
// imported from main.tsx) and show it as the loading state of the page it
// belongs to, until the real page is ready.

const initial = (() => {
  if (typeof document === "undefined") return null;
  const html = document.getElementById("root")?.innerHTML.trim() ?? "";
  return html ? { path: window.location.pathname, html } : null;
})();
let consumed = false;

/** Stop showing the snapshot (the real page has rendered, or we navigated away). */
export function consumeSnapshot() {
  consumed = true;
}

/**
 * Loading state for `path`: the server snapshot if this is still the page the
 * visitor landed on, else `fallback`. The HTML is our own server's output,
 * already escaped there (server/seo.ts), so rendering it is safe.
 */
export function SnapshotOr({ path = typeof window !== "undefined" ? window.location.pathname : "", fallback }: { path?: string; fallback: React.ReactNode }) {
  if (initial && !consumed && initial.path === path) {
    return <div aria-busy="true" dangerouslySetInnerHTML={{ __html: initial.html }} />;
  }
  return <>{fallback}</>;
}
