import { useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// Reader feedback at the end of a lesson. Votes feed the nightly self-heal job
// (server/self-heal-topics.ts), which rewrites a lesson only when complaints
// hold up. Anyone can vote; anonymous readers are identified by a random id
// kept in this browser, and their vote is remembered per lesson version.

const REASONS = [
  { id: "outdated", label: "Outdated" },
  { id: "inaccurate", label: "Inaccurate" },
  { id: "confusing", label: "Confusing" },
  { id: "too_basic", label: "Too basic" },
  { id: "too_advanced", label: "Too advanced" },
  { id: "other", label: "Something else" },
] as const;

type Vote = 1 | -1;
type Stage = "ask" | "details" | "done";

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode: vote still counts */ }
}

function visitorId(): string {
  let id = safeGet("bt-visitor");
  if (!id) {
    id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    safeSet("bt-visitor", id);
  }
  return id;
}

export default function LessonFeedback({ topicId, contentVersion }: { topicId: string; contentVersion?: number | null }) {
  const storeKey = `bt-fb:${topicId}:${contentVersion ?? 1}`;
  const previous = safeGet(storeKey);
  const [vote, setVote] = useState<Vote | null>(previous === "1" ? 1 : previous === "-1" ? -1 : null);
  const [stage, setStage] = useState<Stage>(previous ? "done" : "ask");
  const [reasons, setReasons] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(v: Vote, details?: { reasons: string[]; comment: string }) {
    setSending(true);
    setError(null);
    try {
      await apiRequest("POST", `/api/topics/${topicId}/feedback`, {
        vote: v,
        visitorId: visitorId(),
        ...(details?.reasons.length ? { reasons: details.reasons } : {}),
        ...(details?.comment.trim() ? { comment: details.comment.trim() } : {}),
      });
      safeSet(storeKey, String(v));
      return true;
    } catch {
      setError("Couldn't send that. Please try again.");
      return false;
    } finally {
      setSending(false);
    }
  }

  async function choose(v: Vote) {
    setVote(v);
    // Record the vote right away, so it counts even if the details are skipped.
    const ok = await send(v);
    if (ok) setStage(v === 1 ? "done" : "details");
  }

  async function submitDetails() {
    const ok = await send(-1, { reasons, comment });
    if (ok) setStage("done");
  }

  const toggleReason = (id: string) =>
    setReasons((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));

  return (
    <section className="border-t border-border" aria-labelledby="feedback-title" data-testid="lesson-feedback">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl rounded-2xl border border-border bg-card/60 p-6">
          {stage === "done" ? (
            <div className="flex items-start gap-3" role="status">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Check className="h-4 w-4" />
              </span>
              <div>
                <p id="feedback-title" className="font-semibold">Thanks for the feedback</p>
                <p className="text-sm text-muted-foreground">
                  {vote === -1
                    ? "We review lessons readers flag. If the problem holds up, this lesson gets rewritten and fact-checked."
                    : "Glad it helped. It tells us which lessons to build more of."}
                </p>
                {vote === 1 && (
                  <button type="button" onClick={() => setStage("ask")} className="mt-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    Change my answer
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 id="feedback-title" className="text-lg font-semibold">Was this lesson helpful?</h2>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={sending}
                    aria-pressed={vote === 1}
                    onClick={() => choose(1)}
                    className={cn("gap-2", vote === 1 && "border-primary text-primary")}
                    data-testid="button-feedback-up"
                  >
                    <ThumbsUp className="h-4 w-4" /> Yes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={sending}
                    aria-pressed={vote === -1}
                    onClick={() => choose(-1)}
                    className={cn("gap-2", vote === -1 && "border-brand-accent text-brand-accent")}
                    data-testid="button-feedback-down"
                  >
                    <ThumbsDown className="h-4 w-4" /> No
                  </Button>
                </div>
              </div>

              {stage === "details" && (
                <div className="mt-5 space-y-4">
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium">What was wrong? <span className="font-normal text-muted-foreground">(pick any)</span></legend>
                    <div className="flex flex-wrap gap-2">
                      {REASONS.map((r) => {
                        const on = reasons.includes(r.id);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleReason(r.id)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm transition-colors",
                              on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <div>
                    <label htmlFor="feedback-comment" className="mb-2 block text-sm font-medium">
                      Tell us more <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <Textarea
                      id="feedback-comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value.slice(0, 1000))}
                      placeholder="e.g. The launch date in principle 2 is wrong, or the analogy didn't make sense."
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button type="button" onClick={submitDetails} disabled={sending} data-testid="button-feedback-submit">
                      Send feedback
                    </Button>
                    <button type="button" onClick={() => setStage("done")} className="text-sm text-muted-foreground hover:text-foreground">
                      Skip
                    </button>
                  </div>
                </div>
              )}
              {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
