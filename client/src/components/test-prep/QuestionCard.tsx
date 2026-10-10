import { useState } from "react";
import { CheckCircle2, Eye, Lightbulb, Loader2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { PrepQuestion } from "@shared/test-prep";
import type { Progress } from "@/lib/testPrepProgress";

type Entry = Progress[string];
const EMPTY: Entry = { tries: 0, correct: null, revealed: false, hintsUsed: 0 };

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong. Please try again.");
  return data as T;
}

/**
 * One question. Learn mode: answer, get right/wrong and why, ask for hints,
 * and see the answer only after an attempt. Test mode: answer only; the
 * result is shown on the results screen.
 */
export default function QuestionCard({
  setId, q, image, flagged, unavailable = false, mode, entry = EMPTY, onUpdate, onFix,
}: {
  setId: string;
  q: PrepQuestion;
  image?: string;
  flagged: boolean;
  unavailable?: boolean;
  mode: "learn" | "test";
  entry?: Entry;
  onUpdate(next: Entry): void;
  onFix?(stem: string): Promise<void>;
}) {
  const [value, setValue] = useState(entry.lastAnswer ?? "");
  const [busy, setBusy] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fix, setFix] = useState("");

  const base = `/api/test-prep/${setId}`;
  const run = async (f: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await f(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const check = () => run(async () => {
    const r = await post<{ correct: boolean | null; explanation: string }>(`${base}/attempt`, { qid: q.id, answer: value });
    onUpdate({ ...entry, tries: entry.tries + 1, correct: r.correct, lastAnswer: value, explanation: r.explanation });
  });
  const hint = () => run(async () => {
    const level = Math.min(hints.length + 1, 2);
    const r = await post<{ hint: string }>(`${base}/hint`, { qid: q.id, level });
    setHints((h) => [...h, r.hint]);
    onUpdate({ ...entry, hintsUsed: Math.max(entry.hintsUsed, level) });
  });
  const reveal = () => run(async () => {
    const r = await post<{ answer: string; explanation: string }>(`${base}/reveal`, { qid: q.id });
    onUpdate({ ...entry, revealed: true, answer: r.answer, explanation: r.explanation });
  });

  if (q.unreadable) {
    return (
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <p className="text-sm font-medium">Question {q.n}: Couldn't read this one, type it in</p>
        <Textarea value={fix} onChange={(e) => setFix(e.target.value)} placeholder="Type the question here" />
        <Button size="sm" disabled={!fix.trim() || busy} onClick={() => onFix && run(() => onFix(fix))}>Save question</Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <p className="font-medium whitespace-pre-wrap">{q.practice ? "Practice: " : `${q.n}. `}{q.stem}</p>
        <p className="text-sm text-muted-foreground">We couldn't prepare this one. Try pasting it again in a new set, or ask your teacher.</p>
      </div>
    );
  }

  const answered = entry.tries > 0;
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3" data-testid={`question-${q.id}`}>
      <p className="font-medium whitespace-pre-wrap">{q.practice ? "Practice: " : `${q.n}. `}{q.stem}</p>
      {image && <img src={image} alt={`Image for question ${q.n}`} className="max-h-72 rounded-lg border" referrerPolicy="no-referrer" />}

      {q.type === "mc" || q.type === "tf" ? (
        <RadioGroup value={value} onValueChange={setValue} className="space-y-1">
          {q.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <RadioGroupItem value={o} id={`${q.id}-${i}`} />
              <Label htmlFor={`${q.id}-${i}`} className="font-normal">{o}</Label>
            </div>
          ))}
        </RadioGroup>
      ) : q.type === "open" ? (
        <Textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder="Write your answer" />
      ) : (
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={q.type === "numeric" ? "Your answer (e.g. 0.75 or 3/4)" : "Your answer"} />
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={check} disabled={busy || !value.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "test" ? (answered ? "Update answer" : "Save answer") : "Check"}
        </Button>
        {mode === "learn" && hints.length < 2 && !entry.revealed && (
          <Button size="sm" variant="outline" onClick={hint} disabled={busy}><Lightbulb className="mr-1 h-4 w-4" /> {hints.length ? "Another hint" : "Hint"}</Button>
        )}
        {mode === "learn" && !entry.revealed && (
          <Button size="sm" variant="ghost" onClick={reveal} disabled={busy || !answered} title={answered ? undefined : "Try it first, then you can see the answer."}>
            <Eye className="mr-1 h-4 w-4" /> Show answer
          </Button>
        )}
      </div>
      {mode === "learn" && !answered && <p className="text-xs text-muted-foreground">Try it first, then you can see the answer.</p>}

      {hints.map((h, i) => <p key={i} className="text-sm rounded-lg bg-muted px-3 py-2"><strong>Hint {i + 1}:</strong> {h}</p>)}

      {mode === "learn" && answered && entry.explanation && (
        <div className={`flex gap-2 rounded-lg px-3 py-2 text-sm ${entry.correct === true ? "bg-emerald-500/10" : entry.correct === false ? "bg-rose-500/10" : "bg-muted"}`}>
          {entry.correct === true ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : entry.correct === false ? <XCircle className="h-4 w-4 shrink-0 text-rose-600" /> : null}
          <p>{entry.correct === true ? "Correct. " : entry.correct === false ? "Not quite. " : ""}{entry.explanation}</p>
        </div>
      )}
      {entry.revealed && entry.answer && <p className="text-sm"><strong>Answer:</strong> {entry.answer}</p>}
      {flagged && (entry.revealed || answered) && (
        <p className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400"><AlertTriangle className="h-4 w-4" /> Check this one with your teacher</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
