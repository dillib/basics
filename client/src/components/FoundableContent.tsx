import { useEffect, useRef, type ReactNode } from "react";

/**
 * Collapsible body that stays in the page while collapsed, using the
 * browser's hidden="until-found": invisible and out of layout, but indexed by
 * search engines and revealed by find-in-page (which fires "beforematch" so
 * we can open it properly). Browsers without until-found treat it as plain
 * `hidden`, i.e. the same collapsed look as before.
 *
 * React doesn't pass hidden="until-found" through, so it's set on the DOM.
 */
export default function FoundableContent({ open, onFound, children }: { open: boolean; onFound: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const onFoundRef = useRef(onFound);
  onFoundRef.current = onFound;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "until-found");
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = () => onFoundRef.current();
    el.addEventListener("beforematch", handler);
    return () => el.removeEventListener("beforematch", handler);
  }, []);

  return <div ref={ref}>{children}</div>;
}
