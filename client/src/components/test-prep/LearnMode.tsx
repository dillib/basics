import { Link } from "wouter";
import { BookOpen } from "lucide-react";
import QuestionCard from "./QuestionCard";
import type { ClientSet } from "@shared/test-prep";
import type { Progress } from "@/lib/testPrepProgress";

/** Concept by concept: the idea first, then the student's questions, then practice for anything missed. */
export default function LearnMode({ set, progress, onUpdate, onFix }: {
  set: ClientSet;
  progress: Progress;
  onUpdate(qid: string, next: Progress[string]): void;
  onFix(qid: string, stem: string): Promise<void>;
}) {
  const byId = new Map(set.questions.map((q) => [q.id, q]));
  const unassigned = set.questions.filter((q) => !q.practice && !set.concepts.some((c) => c.questionIds.includes(q.id)));
  const card = (qid: string) => {
    const q = byId.get(qid);
    if (!q) return null;
    return (
      <QuestionCard
        key={q.id} setId={set.id} q={q} mode="learn"
        image={q.image !== undefined ? `/api/test-prep/${set.id}/images/${q.image}` : undefined}
        flagged={set.flagged.includes(q.id)}
        unavailable={set.unavailable?.includes(q.id)}
        entry={progress[q.id]}
        onUpdate={(next) => onUpdate(q.id, next)}
        onFix={(stem) => onFix(q.id, stem)}
      />
    );
  };

  return (
    <div className="space-y-10">
      {set.concepts.map((c, i) => {
        const missed = c.questionIds.some((id) => progress[id]?.correct === false || progress[id]?.revealed);
        return (
          <section key={c.id} id={`concept-${c.id}`} className="space-y-4">
            <h2 className="text-xl font-semibold">{i + 1}. {c.title}</h2>
            {c.card ? (
              <div className="rounded-xl border-l-4 border-primary bg-primary/5 p-4 space-y-2">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">What you need to know</p>
                <p className="whitespace-pre-wrap">{c.card.whatToKnow}</p>
                <p className="text-sm font-semibold">Worked example</p>
                <p className="whitespace-pre-wrap text-sm">{c.card.workedExample}</p>
                {c.lessonSlug && (
                  <Link href={`/topic/${c.lessonSlug}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    <BookOpen className="h-4 w-4" /> Full lesson on {c.title}
                  </Link>
                )}
              </div>
            ) : (
              set.status !== "ready" && set.status !== "failed" && <div className="h-24 animate-pulse rounded-xl bg-muted" aria-busy="true" />
            )}
            <div className="space-y-3">{c.questionIds.map(card)}</div>
            {missed && c.practiceIds.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Practice: a few more like these</p>
                {c.practiceIds.map(card)}
              </div>
            )}
          </section>
        );
      })}
      {unassigned.length > 0 && <section className="space-y-3">{unassigned.map((q) => card(q.id))}</section>}
    </div>
  );
}
