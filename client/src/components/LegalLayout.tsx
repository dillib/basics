import { useEffect, useRef, useState, type ReactNode } from "react";
import PageHero from "./PageHero";

/**
 * Layout for long legal documents (Terms, Privacy). The table of contents
 * is built from the <h2>s actually rendered in the document, so it can't
 * drift from the content, and it highlights the section being read.
 */

interface TocItem { id: string; label: string }

const slug = (s: string) => s.toLowerCase().replace(/^\d+\.\s*/, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function LegalLayout({
  title,
  lastUpdated,
  titleTestId,
  children,
}: {
  title: string;
  lastUpdated: string;
  titleTestId?: string;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLElement>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const headings = Array.from(root.querySelectorAll("h2"));
    setToc(headings.map((h) => {
      if (!h.id) h.id = slug(h.textContent || "");
      h.classList.add("scroll-mt-24");
      return { id: h.id, label: h.textContent || "" };
    }));
    // Active = the last heading scrolled past the top third of the viewport.
    // (An IntersectionObserver "band" misses sections whose heading has
    // already scrolled off while you're mid-section, leaving no highlight.)
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.33;
      let current: string | null = headings[0]?.id ?? null;
      for (const h of headings) {
        if (h.getBoundingClientRect().top <= line) current = h.id;
        else break;
      }
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const links = (onPick?: () => void) => (
    <ol className="space-y-1 text-sm">
      {toc.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            onClick={onPick}
            className={`block rounded-md border-l-2 py-1 pl-3 transition-colors ${
              active === item.id
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            {item.label}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <PageHero
        compact
        eyebrow="Legal"
        title={title}
        subtitle={<>Last updated <time className="font-medium text-foreground">{lastUpdated}</time></>}
        titleTestId={titleTestId}
      />
      <div className="container mx-auto px-4 py-10 sm:py-14">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[230px_minmax(0,1fr)]">
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-24">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">On this page</p>
              {links()}
            </div>
          </nav>

          <div className="min-w-0">
            {toc.length > 0 && (
              <details className="mb-6 rounded-xl border border-card-border bg-card p-4 lg:hidden">
                <summary className="cursor-pointer text-sm font-medium">On this page</summary>
                <div className="mt-3">{links()}</div>
              </details>
            )}
            <article
              ref={contentRef}
              className="rounded-2xl border border-card-border bg-card p-6 sm:p-10 [&_section:last-child]:mb-0 [&_section]:mb-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_li]:leading-relaxed [&_p]:leading-relaxed [&_strong]:text-foreground"
            >
              <div className="mx-auto max-w-[70ch]">{children}</div>
            </article>
          </div>
        </div>
      </div>
    </>
  );
}
