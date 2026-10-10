import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import LearnMode from "./LearnMode";
import TestMeMode from "./TestMeMode";
import Readiness from "./Readiness";
import type { ClientSet } from "@shared/test-prep";
import { loadProgress, saveProgress, type Progress } from "@/lib/testPrepProgress";
import { forgetSet } from "@/lib/testPrepSets";

const EXPIRED = "This set has expired or doesn't exist";
const STAGE: Record<string, string> = {
  parsing: "Reading your questions…",
  grouping: "Finding the topics they test…",
  preparing: "Writing explanations, hints and practice…",
  verifying: "Double-checking every answer…",
};

class NotFound extends Error {}

/** /test-prep/:id: the study set, filled in as each stage finishes. */
export default function StudySet() {
  const { id = "" } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"learn" | "test">("learn");
  const [progress, setProgress] = useState<Progress>({});
  useEffect(() => setProgress(loadProgress(id)), [id]);

  const { data: set, error } = useQuery<ClientSet>({
    queryKey: ["/api/test-prep", id],
    queryFn: async () => {
      const res = await fetch(`/api/test-prep/${id}`);
      if (res.status === 404) throw new NotFound(EXPIRED);
      if (!res.ok) throw new Error("Couldn't load this set. Please refresh.");
      return res.json();
    },
    retry: (n, e) => !(e instanceof NotFound) && n < 3,
    refetchInterval: (q) => (q.state.data && (q.state.data.status === "ready" || q.state.data.status === "failed") ? false : 1500),
  });

  useEffect(() => { if (error instanceof NotFound) forgetSet(id); }, [error, id]);

  const update = (qid: string, next: Progress[string]) => {
    setProgress((p) => {
      const out = { ...p, [qid]: next };
      saveProgress(id, out);
      return out;
    });
  };
  const fix = async (qid: string, stem: string) => {
    const res = await fetch(`/api/test-prep/${id}/questions/${qid}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stem }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Couldn't save that.");
    await qc.invalidateQueries({ queryKey: ["/api/test-prep", id] });
  };

  let body: React.ReactNode;
  if (error) {
    body = (
      <div className="space-y-4 py-16 text-center">
        <p className="text-lg">{(error as Error).message}</p>
        <Button asChild><Link href="/test-prep">Paste your questions</Link></Button>
      </div>
    );
  } else if (!set) {
    body = <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  } else if (set.status === "failed") {
    body = (
      <div className="space-y-4 py-16 text-center">
        <p className="text-lg">{set.error === "no_questions" ? "We couldn't find questions in that. Want to learn a topic instead?" : "Something went wrong building this set."}</p>
        <div className="flex justify-center gap-3">
          <Button asChild variant="outline"><Link href="/test-prep">Try another paste</Link></Button>
          <Button asChild><Link href="/">Learn a topic</Link></Button>
        </div>
      </div>
    );
  } else {
    const own = set.questions.filter((q) => !q.practice);
    body = (
      <div className="space-y-8">
        <div className="space-y-8 print:hidden">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold">
            {set.concepts.length ? `Found ${own.length} questions on ${set.concepts.length} topics` : `Found ${own.length} questions`}
          </h1>
          {set.status !== "ready" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin" /> {STAGE[set.status]}
            </p>
          )}
        </div>
        {own.length > 0 && (
          <Tabs value={mode} onValueChange={(v) => setMode(v as "learn" | "test")}>
            <TabsList>
              <TabsTrigger value="learn">Learn</TabsTrigger>
              <TabsTrigger value="test" disabled={set.status !== "ready"}>Test me</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        {mode === "learn" ? (
          <LearnMode set={set} progress={progress} onUpdate={update} onFix={fix} />
        ) : (
          <TestMeMode
            set={set} progress={progress} onUpdate={update}
            onLearn={(cid) => { setMode("learn"); setTimeout(() => document.getElementById(`concept-${cid}`)?.scrollIntoView({ behavior: "smooth" }), 50); }}
          />
        )}
        </div>
        {set.status === "ready" && <Readiness set={set} progress={progress} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto max-w-3xl px-4 py-10 print:py-0">{body}</main>
      <div className="print:hidden"><Footer /></div>
    </div>
  );
}
