import { CheckCircle2, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClientSet } from "@shared/test-prep";
import { readiness, type Progress } from "@/lib/testPrepProgress";

/** Ready / Review by concept, and a printable one-page review sheet. */
export default function Readiness({ set, progress }: { set: ClientSet; progress: Progress }) {
  const rows = readiness(set, progress);
  const own = set.questions.filter((q) => !q.practice);
  return (
    <section className="rounded-xl border bg-card p-4 space-y-3 print:border-0 print:p-0">
      <div className="space-y-3 print:hidden">
      <h2 className="text-lg font-semibold">How ready are you?</h2>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.conceptId} className="flex items-center gap-2">
            {r.ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <RotateCcw className="h-4 w-4 text-amber-600" />}
            <span className="font-medium">{r.title}</span>
            <span className="text-sm text-muted-foreground">{r.ready ? "Ready" : "Review"}</span>
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" /> Print review sheet</Button>
      </div>

      {/* Print-only review sheet: concept cards plus your questions and the answers you revealed. */}
      <div className="hidden print:block print:text-black">
        <h1 className="text-xl font-bold">Review sheet{set.subject ? `: ${set.subject}` : ""}</h1>
        {set.concepts.map((c) => (
          <div key={c.id} className="mt-4 break-inside-avoid">
            <h2 className="font-semibold">{c.title}</h2>
            {c.card && <p className="text-sm">{c.card.whatToKnow}</p>}
            {c.card && <p className="text-sm italic">Example: {c.card.workedExample}</p>}
            <ol className="mt-1 list-decimal pl-5 text-sm">
              {own.filter((q) => c.questionIds.includes(q.id)).map((q) => (
                <li key={q.id}>{q.stem}{progress[q.id]?.answer ? ` — ${progress[q.id]!.answer}` : ""}</li>
              ))}
            </ol>
          </div>
        ))}
        <p className="mt-4 text-xs">BasicsTutor · basicstutor.com/test-prep</p>
      </div>
    </section>
  );
}
