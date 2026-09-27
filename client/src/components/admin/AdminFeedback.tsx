import { Fragment, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ThumbsUp, ThumbsDown, RotateCcw, MessageSquare, Eye } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

// Admin > Feedback: what readers think of each lesson (current version only),
// which lessons tonight's self-heal will review, and every content
// replacement with a one-click restore.

interface FeedbackRow {
  topicId: string;
  title: string;
  slug: string;
  contentVersion: number;
  up: number;
  down: number;
  downPeople: number;
  reasons: Record<string, number>;
  comments: number;
  views7d: number;
  flagged: boolean;
  lastFeedbackAt: string | null;
}

interface VersionRow {
  id: string;
  topicId: string;
  title: string;
  slug: string;
  contentVersion: number;
  reason: string | null;
  restoredAt: string | null;
  createdAt: string;
}

interface CommentRow {
  vote: number;
  reasons: string[] | null;
  comment: string | null;
  createdAt: string;
}

const REASON_LABELS: Record<string, string> = {
  inaccurate: "inaccurate",
  outdated: "outdated",
  confusing: "confusing",
  too_basic: "too basic",
  too_advanced: "too advanced",
};

function Comments({ topicId }: { topicId: string }) {
  const { data, isLoading } = useQuery<CommentRow[]>({ queryKey: [`/api/admin/topics/${topicId}/feedback`] });
  if (isLoading) return <Skeleton className="h-10 w-full" />;
  if (!data?.length) return <p className="text-sm text-muted-foreground">No details left.</p>;
  return (
    <ul className="space-y-2">
      {data.map((c, i) => (
        <li key={i} className="text-sm">
          <span className="text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
          {c.reasons?.length ? <span className="ml-2">{c.reasons.map((r) => REASON_LABELS[r] ?? r).join(", ")}</span> : null}
          {c.comment ? <p className="mt-0.5 whitespace-pre-wrap">{c.comment}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export default function AdminFeedback() {
  const { toast } = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading } = useQuery<{ topics: FeedbackRow[]; versions: VersionRow[] }>({
    queryKey: ["/api/admin/feedback"],
  });

  const restore = useMutation({
    mutationFn: async (versionId: string) => (await apiRequest("POST", `/api/admin/topic-versions/${versionId}/restore`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
      toast({ title: "Previous version restored" });
    },
    onError: () => toast({ title: "Restore failed", variant: "destructive" }),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  const topics = data?.topics ?? [];
  const versions = data?.versions ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reader feedback</CardTitle>
          <CardDescription>
            Votes on each lesson's current version. <Badge variant="outline" className="mx-1">Review tonight</Badge>
            means it crossed the thresholds; the nightly self-heal checks the complaints and rewrites only if they hold up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lesson</TableHead>
                  <TableHead className="text-right">Helpful</TableHead>
                  <TableHead className="text-right">Not helpful</TableHead>
                  <TableHead>Reasons</TableHead>
                  <TableHead className="text-right">Reads (7d)</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {topics.map((t) => {
                  const reasons = Object.entries(t.reasons).filter(([, n]) => n > 0);
                  return (
                    <Fragment key={t.topicId}>
                      <TableRow>
                        <TableCell>
                          <a href={`/topic/${t.slug}`} target="_blank" rel="noreferrer" className="font-medium hover:underline">{t.title}</a>
                          {t.flagged && <Badge variant="outline" className="ml-2 border-brand-accent text-brand-accent">Review tonight</Badge>}
                          <div className="text-xs text-muted-foreground">v{t.contentVersion}{t.lastFeedbackAt ? ` · last ${formatDistanceToNow(new Date(t.lastFeedbackAt), { addSuffix: true })}` : ""}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums"><ThumbsUp className="mr-1 inline h-3.5 w-3.5 text-primary" />{t.up}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <ThumbsDown className="mr-1 inline h-3.5 w-3.5 text-brand-accent" />{t.down}
                          {t.downPeople !== t.down && <span className="text-xs text-muted-foreground"> ({t.downPeople} people)</span>}
                        </TableCell>
                        <TableCell className="text-sm">{reasons.map(([r, n]) => `${REASON_LABELS[r] ?? r} ${n}`).join(" · ") || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums"><Eye className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />{t.views7d}</TableCell>
                        <TableCell className="text-right">
                          {(t.down > 0) && (
                            <Button variant="ghost" size="sm" onClick={() => setOpen(open === t.topicId ? null : t.topicId)}>
                              <MessageSquare className="mr-1 h-3.5 w-3.5" />{t.comments}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {open === t.topicId && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/40"><Comments topicId={t.topicId} /></TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content changes</CardTitle>
          <CardDescription>
            Every self-heal, regeneration and restore keeps the version it replaced. Restore puts that version back (and keeps the current one, so it can be undone too).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No content changes yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Lesson</TableHead>
                  <TableHead>Why</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}</TableCell>
                    <TableCell><a href={`/topic/${v.slug}`} target="_blank" rel="noreferrer" className="font-medium hover:underline">{v.title}</a></TableCell>
                    <TableCell className="max-w-md text-sm">{v.reason}</TableCell>
                    <TableCell className="text-right">
                      {v.restoredAt ? (
                        <span className="text-sm text-muted-foreground">Restored</span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={restore.isPending}
                          onClick={() => {
                            if (window.confirm(`Restore the version of "${v.title}" from before this change?`)) restore.mutate(v.id);
                          }}
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restore v{v.contentVersion}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
