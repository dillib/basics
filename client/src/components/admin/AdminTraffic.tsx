import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Admin > Traffic: where lesson reads come from. The point is to find the one
// distribution channel that works and double down on it.

type Source = "search" | "ai" | "social" | "classroom" | "email" | "referral" | "direct" | "internal";

interface TrafficSummary {
  days: number;
  since: string;
  total: number;
  bySource: Record<Source, number>;
  topSites: { host: string; source: Source; views: number }[];
  topLessons: { topicId: string; title: string; slug: string; total: number; bySource: Record<Source, number> }[];
  /** Search intake outcomes (server/intake.ts, Jev). */
  intake?: Record<string, number>;
  /** AI spend ledger (server/ai-spend.ts). */
  spend?: { rows: { task: string; provider: string; model: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }[]; totalUsd: number; todayUsd: number; budgetUsd: number };
}

const TASK_LABELS: Record<string, string> = {
  lesson_write: "Writing lessons", fact_check: "Fact-checking", research: "Web research", quick_preview: "Search previews",
  clarify: "Follow-up questions", tutor: "AI tutor", quiz: "Quizzes", visual_scene: "Concept animations",
  heal_triage: "Self-heal review", trending_filter: "Trending picks", jev_intake: "Search decisions (Jev)", jev_verify: "Match checks (Jev)",
  jev_suggest: "Typing suggestions (Jev)", jev_dedupe: "Duplicate guard (Jev)", jev_safety: "Safety checks (Jev)", jev_review: "Lesson reviews (Jev)",
};
const usd = (n: number) => (n >= 1 ? `$${n.toFixed(2)}` : n >= 0.01 ? `$${n.toFixed(3)}` : n > 0 ? "<$0.01" : "$0");

const INTAKE_LABELS: [string, string][] = [
  ["open_lesson", "Sent straight to an existing lesson"],
  ["suggest_lesson", "Suggested an existing lesson"],
  ["dedupe_redirect", "Duplicate lesson prevented"],
  ["clarify", "Asked a follow-up question"],
  ["create_jev", "New lesson (Jev checked it)"],
  ["create_fallback", "New lesson (Jev off or failed)"],
  ["site_help", "Pointed to the Help Center"],
  ["reject", "Nothing to teach (gibberish / unsafe)"],
];

const SOURCES: { id: Source; label: string; hint: string; color: string }[] = [
  { id: "search", label: "Search", hint: "Google, Bing, DuckDuckGo…", color: "bg-primary" },
  { id: "ai", label: "AI assistants", hint: "ChatGPT, Perplexity, Gemini, Claude…", color: "bg-violet-500" },
  { id: "social", label: "Social", hint: "Reddit, X, YouTube, LinkedIn…", color: "bg-sky-500" },
  { id: "classroom", label: "Classroom", hint: "Google Classroom, Canvas, Schoology…", color: "bg-emerald-500" },
  { id: "email", label: "Email", hint: "Webmail and newsletter links", color: "bg-rose-500" },
  { id: "referral", label: "Other sites", hint: "Links from any other website", color: "bg-brand-accent" },
  { id: "direct", label: "Direct", hint: "Typed, bookmarked, or app with no referrer", color: "bg-muted-foreground" },
  { id: "internal", label: "From another lesson", hint: "Clicked through inside BasicsTutor", color: "bg-foreground/30" },
];
const LABEL = Object.fromEntries(SOURCES.map((s) => [s.id, s.label])) as Record<Source, string>;

export default function AdminTraffic() {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useQuery<TrafficSummary>({ queryKey: [`/api/admin/traffic?days=${days}`] });

  const external = data ? data.total - data.bySource.internal : 0;
  const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {[1, 7, 30, 90].map((d) => (
          <Button key={d} size="sm" variant={d === days ? "default" : "outline"} onClick={() => setDays(d)}>
            {d === 1 ? "Today" : `${d} days`}
          </Button>
        ))}
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Where readers come from</CardTitle>
              <CardDescription>
                {data.total.toLocaleString()} lesson reads · {external.toLocaleString()} arrived from outside the site.
                Percentages are of those outside arrivals; lesson-to-lesson clicks are shown separately.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.total === 0 && <p className="text-sm text-muted-foreground">No reads recorded in this period yet.</p>}
              {SOURCES.map((s) => {
                const n = data.bySource[s.id] ?? 0;
                const share = s.id === "internal" ? pct(n, data.total) : pct(n, external);
                return (
                  <div key={s.id} className="grid grid-cols-[10rem_1fr_5rem] items-center gap-3 text-sm">
                    <div>
                      <div className="font-medium">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.hint}</div>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted">
                      <div className={cn("h-2.5 rounded-full", s.color)} style={{ width: `${share}%` }} />
                    </div>
                    <div className="text-right tabular-nums">
                      {n.toLocaleString()} <span className="text-muted-foreground">({share}%{s.id === "internal" ? " of all" : ""})</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI spend</CardTitle>
              <CardDescription>
                {data.spend ? <>Estimated from each call's token usage: <strong>{usd(data.spend.totalUsd)}</strong> this period, <strong>{usd(data.spend.todayUsd)}</strong> today of a {usd(data.spend.budgetUsd)} daily budget (past it, only optional concept animations pause).</> : "No AI calls recorded yet."}
              </CardDescription>
            </CardHeader>
            {!!data.spend?.rows.length && (
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>What</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead className="text-right">Calls</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.spend.rows.map((r) => (
                      <TableRow key={`${r.task}-${r.provider}-${r.model}`}>
                        <TableCell>{TASK_LABELS[r.task] ?? r.task}</TableCell>
                        <TableCell className="text-muted-foreground">{r.provider} · {r.model}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.calls.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums">{usd(r.costUsd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search outcomes</CardTitle>
              <CardDescription>What happened after someone pressed Enter in the search box. "Jev off" means TYPESAFE_API_KEY isn't set or the call failed.</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.values(data.intake ?? {}).every((n) => !n) ? (
                <p className="text-sm text-muted-foreground">No searches recorded in this period yet.</p>
              ) : (
                <Table>
                  <TableBody>
                    {INTAKE_LABELS.filter(([k]) => data.intake?.[k]).map(([k, label]) => (
                      <TableRow key={k}>
                        <TableCell>{label}</TableCell>
                        <TableCell className="text-right tabular-nums">{data.intake![k]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top referring sites</CardTitle>
                <CardDescription>Domains only.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.topSites.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None yet.</p>
                ) : (
                  <Table>
                    <TableBody>
                      {data.topSites.map((s) => (
                        <TableRow key={`${s.host}-${s.source}`}>
                          <TableCell className="font-medium">{s.host}</TableCell>
                          <TableCell className="text-muted-foreground">{LABEL[s.source] ?? s.source}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.views.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top lessons</CardTitle>
                <CardDescription>Reads, and how many came from search and AI assistants.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.topLessons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lesson</TableHead>
                        <TableHead className="text-right">Reads</TableHead>
                        <TableHead className="text-right">Search</TableHead>
                        <TableHead className="text-right">AI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topLessons.map((l) => (
                        <TableRow key={l.topicId}>
                          <TableCell>
                            <a href={`/topic/${l.slug}`} target="_blank" rel="noreferrer" className="font-medium hover:underline">{l.title}</a>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{l.total}</TableCell>
                          <TableCell className="text-right tabular-nums">{l.bySource.search}</TableCell>
                          <TableCell className="text-right tabular-nums">{l.bySource.ai}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
