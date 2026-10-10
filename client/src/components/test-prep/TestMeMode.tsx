import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import QuestionCard from "./QuestionCard";
import type { ClientSet } from "@shared/test-prep";
import { scoreByConcept, type Progress } from "@/lib/testPrepProgress";

/**
 * Every question, no help, optional timer; then a score by concept. Its own
 * answer sheet: starts empty (not the Learn answers) and resets on "Take it again".
 */
export default function TestMeMode({ set, onLearn }: { set: ClientSet; onLearn(conceptId: string): void }) {
  const own = set.questions.filter((q) => !q.practice && !q.unreadable && !set.unavailable?.includes(q.id));
  const [session, setSession] = useState<Progress>({});
  const [run, setRun] = useState(0); // remounts the cards on a new attempt
  const [timed, setTimed] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!timed || done) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [timed, done]);

  if (done) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your results</h2>
        {timed && <p className="text-sm text-muted-foreground">Time: {Math.floor(seconds / 60)}m {seconds % 60}s</p>}
        <ul className="divide-y rounded-xl border bg-card">
          {scoreByConcept(set, session).map((r) => (
            <li key={r.conceptId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="flex-1 font-medium">{r.title}</span>
              <span className="text-sm text-muted-foreground">{r.total ? `${r.right} of ${r.total} right` : "Written answers"}</span>
              {r.right < r.total && <Button size="sm" variant="outline" onClick={() => onLearn(r.conceptId)}>Learn this</Button>}
            </li>
          ))}
        </ul>
        <Button variant="ghost" onClick={() => { setDone(false); setSeconds(0); setSession({}); setRun((n) => n + 1); }}>Take it again</Button>
      </div>
    );
  }

  const answered = own.filter((q) => (session[q.id]?.tries ?? 0) > 0).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch id="timer" checked={timed} onCheckedChange={setTimed} />
          <Label htmlFor="timer" className="flex items-center gap-1"><Timer className="h-4 w-4" /> Timer</Label>
        </div>
        {timed && <span className="font-mono text-sm">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span>}
        <span className="text-sm text-muted-foreground">{answered} of {own.length} answered</span>
      </div>
      {own.map((q) => (
        <QuestionCard
          key={`${run}-${q.id}`} setId={set.id} q={q} mode="test"
          image={q.image !== undefined ? `/api/test-prep/${set.id}/images/${q.image}` : undefined}
          flagged={false}
          entry={session[q.id]}
          onUpdate={(next) => setSession((s) => ({ ...s, [q.id]: next }))}
        />
      ))}
      <Button size="lg" onClick={() => setDone(true)} disabled={!answered}>Finish and see results</Button>
    </div>
  );
}
