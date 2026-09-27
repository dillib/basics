import InlineText from "./InlineText";
import type { Principle } from "@shared/schema";

/**
 * "The short answer", right under the lesson title: what a searcher came for,
 * before any tools or badges (and what snippets / AI answers quote). Newer
 * lessons carry a written 40-60 word answer; older ones list their principles,
 * which are the lesson's key truths in one line each.
 */
export default function ShortAnswer({ answer, principles }: { answer?: string | null; principles: Pick<Principle, "id" | "title">[] }) {
  if (!answer && principles.length === 0) return null;
  return (
    <section aria-labelledby="short-answer-title" className="mb-5 rounded-xl border border-border bg-card/70 p-4 sm:p-5" data-testid="short-answer">
      <h2 id="short-answer-title" className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">The short answer</h2>
      {answer ? (
        <p className="text-base leading-relaxed text-foreground sm:text-lg"><InlineText text={answer} /></p>
      ) : (
        <>
          <p className="text-base text-foreground">It comes down to {principles.length} ideas:</p>
          <ol className="mt-2 space-y-1 pl-5 text-base leading-relaxed text-foreground list-decimal marker:text-muted-foreground">
            {principles.map((p) => <li key={p.id}><InlineText text={p.title} /></li>)}
          </ol>
        </>
      )}
    </section>
  );
}
