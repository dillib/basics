import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import QuestionCard from "./QuestionCard";
import type { ClientSet } from "@shared/test-prep";
import type { Progress } from "@/lib/testPrepProgress";

/** Every question, no help, optional timer; then a score by concept. */
export default function TestMeMode({ set, progress, onUpdate, onLearn }: {
  set: ClientSet;
  progress: Progress;
  onUpdate(qid: string, next: Progress[string]): void;
  onLearn(conceptId: string): void;
}) {
  const own = set.questions.filter((q) => !q.practice && !q.unreadable && !set.unavailable?.includes(q.id));
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
          {set.concepts.map((c) => {
            const graded = c.questionIds.map((id) => set.questions.find((q) => q.id === id)).filter((q) => q && q.type !== "open");
            const right = graded.filter((q) => progress[q!.id]?.correct === true).length;
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="flex-1 font-medium">{c.title}</span>
                <span className="text-sm text-muted-foreground">{graded.length ? `${right} of ${graded.length} right` : "Written answers"}</span>
                {right < graded.length && <Button size="sm" variant="outline" onClick={() => onLearn(c.id)}>Learn this</Button>}
              </li>
            );
          })}
        </ul>
        <Button variant="ghost" onClick={() => { setDone(false); setSeconds(0); }}>Take it again</Button>
      </div>
    );
  }

  const answered = own.filter((q) => (progress[q.id]?.tries ?? 0) > 0).length;
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
          key={q.id} setId={set.id} q={q} mode="test"
          image={q.image !== undefined ? set.images[q.image] : undefined}
          flagged={false}
          entry={progress[q.id]}
          onUpdate={(next) => onUpdate(q.id, next)}
        />
      ))}
      <Button size="lg" onClick={() => setDone(true)} disabled={!answered}>Finish and see results</Button>
    </div>
  );
}
