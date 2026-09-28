/**
 * Nightly self-heal: rewrites lessons ONLY when reader feedback points at a
 * real, fixable problem. Runs as a Render Cron Job (see render.yaml); safe to
 * run manually any time.
 *
 * For each lesson whose feedback on its current version crosses the
 * thresholds in ./self-heal (enough distinct people saying "not helpful", or
 * repeated inaccurate/outdated reports), highest priority first:
 *   1. fresh web research (Perplexity, if PERPLEXITY_API_KEY is set),
 *   2. AI triage of the complaints vs the lesson + research: "regenerate" only
 *      if they hold up -- opinion, spam, and vague complaints are ignored,
 *   3. rewrite with the confirmed problems as revision notes, fact-check it,
 *      and keep it only if it scores at least as well as the old version,
 *   4. snapshot the old version first (one-click restore in Admin > Feedback).
 * Then emails REPORT_EMAIL what changed and why.
 *
 * Bounded spend: at most HEAL_MAX_TRIAGE triages (default 10, ~1-3 cents
 * each) and HEAL_MAX_REWRITES rewrites (default 5) per run.
 *
 * Usage:
 *   DATABASE_URL="..." GOOGLE_API_KEY="..." npm run heal:topics
 *   HEAL_DRY_RUN=true npm run heal:topics   # triage + report only, change nothing
 */
import { storage } from "./storage";
import { generateTopicContent, validateTopicContent, triageTopicFeedback, type FeedbackTriage } from "./ai";
import { researchTopic } from "./research";
import { overBudget } from "./ai-spend";
import { withModeration } from "./moderation";
import { applyTopicContent } from "./topic-content";
import { reviewLesson } from "./safety";
import { selectHealCandidates, acceptRewrite, type HealCandidate } from "./self-heal";
import { sendEmail } from "./email";
import { pool } from "./db";
import type { Level } from "@shared/levels";

const MAX_TRIAGE = Math.max(0, parseInt(process.env.HEAL_MAX_TRIAGE || "10", 10));
const MAX_REWRITES = Math.max(0, parseInt(process.env.HEAL_MAX_REWRITES || "5", 10));
const DRY_RUN = process.env.HEAL_DRY_RUN === "true";
const SITE = (process.env.PUBLIC_URL || "https://www.basicstutor.com").replace(/\/$/, "");

type Outcome =
  | { kind: "rewritten"; triage: FeedbackTriage; oldScore: number | null; newScore: number }
  | { kind: "kept-old"; triage: FeedbackTriage; oldScore: number | null; newScore: number }
  | { kind: "ignored"; triage: FeedbackTriage }
  | { kind: "would-rewrite"; triage: FeedbackTriage }
  | { kind: "skipped-limit" }
  | { kind: "failed"; error: string };

async function healOne(c: HealCandidate, rewritesLeft: () => number): Promise<Outcome> {
  const topic = await storage.getTopic(c.stats.topicId);
  if (!topic) return { kind: "failed", error: "topic disappeared" };
  const version = topic.contentVersion ?? 1;

  const [principles, feedback, research] = await Promise.all([
    storage.getPrinciplesByTopic(topic.id),
    storage.getFeedbackComments(topic.id, version),
    researchTopic(topic.title),
  ]);

  const triage = await triageTopicFeedback({
    title: topic.title,
    level: topic.level || "adult",
    description: topic.description,
    principles: principles.map((p) => ({ title: p.title, explanation: p.explanation })),
    practicalSteps: Array.isArray(topic.practicalSteps) ? (topic.practicalSteps as string[]) : [],
    votes: { up: c.stats.up, down: c.stats.down },
    reasons: c.stats.reasons,
    comments: feedback.map((f) => f.comment ?? "").filter((s) => s.trim()),
    research,
  });
  console.log(`[Heal] "${topic.title}": triage=${triage.decision} -- ${triage.reason}`);

  if (triage.decision === "ignore") return { kind: "ignored", triage };
  if (DRY_RUN) return { kind: "would-rewrite", triage };
  if (rewritesLeft() <= 0) return { kind: "skipped-limit" };

  const level = ((topic.level as Level | null) || "adult") as Level;
  const content = await generateTopicContent(topic.title, level, { revisionNotes: triage.fixNotes, research });
  const validation = await validateTopicContent(topic.title, content);
  const oldScore = topic.confidenceScore ?? null;
  const newScore = validation.overallConfidence;

  if (!acceptRewrite(oldScore, newScore)) {
    console.log(`[Heal] "${topic.title}": rewrite scored ${newScore} vs old ${oldScore ?? "n/a"} -- kept the old version.`);
    return { kind: "kept-old", triage, oldScore, newScore };
  }
  // A rewrite must pass the same publish gate as a new lesson, or the
  // current version stays.
  const review = await reviewLesson({ title: topic.title, level, description: content.description, shortAnswer: content.shortAnswer, principles: content.principles, practicalSteps: content.practicalSteps, confidenceScore: newScore, research: content.research });
  if (!review.publish) {
    console.warn(`[Heal] "${topic.title}": rewrite failed the publish gate (${review.reasons.join("; ")}) -- kept the old version.`);
    return { kind: "kept-old", triage, oldScore, newScore };
  }

  await applyTopicContent(topic, content, {
    reason: `self-heal: ${triage.reason}`.slice(0, 1000),
    confidenceScore: newScore,
    validationData: withModeration(validation, review),
  });
  return { kind: "rewritten", triage, oldScore, newScore };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function reportHtml(rows: { c: HealCandidate; o: Outcome }[]): string {
  const label: Record<Outcome["kind"], string> = {
    rewritten: "✅ Rewritten",
    "kept-old": "↩️ Rewrite rejected (scored lower) — old version kept",
    ignored: "⏸️ No change — complaints didn't hold up",
    "would-rewrite": "🧪 Would rewrite (dry run)",
    "skipped-limit": "⏭️ Deferred — nightly rewrite limit reached",
    failed: "⚠️ Failed",
  };
  const items = rows.map(({ c, o }) => {
    const detail =
      "triage" in o ? `<div style="color:#444;margin-top:4px;">${esc(o.triage.reason)}</div>` : o.kind === "failed" ? `<div style="color:#b91c1c;">${esc(o.error)}</div>` : "";
    const score = "newScore" in o ? `<div style="color:#666;font-size:13px;">Confidence ${o.oldScore ?? "n/a"} → ${o.newScore}</div>` : "";
    const fixes = o.kind === "rewritten" && o.triage.fixNotes ? `<pre style="white-space:pre-wrap;font:13px/1.4 inherit;color:#555;margin:6px 0 0;">${esc(o.triage.fixNotes)}</pre>` : "";
    return `<li style="margin-bottom:14px;">
      <a href="${SITE}/topic/${encodeURIComponent(c.stats.slug)}" style="font-weight:600;">${esc(c.stats.title)}</a>
      <div>${label[o.kind]} <span style="color:#888;">(${esc(c.trigger)})</span></div>
      ${detail}${score}${fixes}
    </li>`;
  });
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;">
    <h2 style="margin-bottom:4px;">BasicsTutor — Self-heal report</h2>
    <p style="color:#666;margin-top:0;">${new Date().toDateString()}${DRY_RUN ? " · dry run, nothing changed" : ""}</p>
    <ul style="padding-left:20px;">${items.join("")}</ul>
    <p style="color:#888;font-size:13px;border-top:1px solid #eee;padding-top:12px;">
      Every rewrite keeps the previous version. To undo one: <a href="${SITE}/admin">Admin</a> → Feedback → Restore.
    </p>
  </div>`;
}

async function main() {
  const candidates = selectHealCandidates(await storage.getFeedbackStats());
  console.log(`[Heal] ${candidates.length} lesson(s) over the feedback thresholds${DRY_RUN ? " (dry run)" : ""}; research=${process.env.PERPLEXITY_API_KEY ? "on" : "off"}.`);
  if (!candidates.length) return;

  let rewrites = 0;
  const rows: { c: HealCandidate; o: Outcome }[] = [];
  for (const c of candidates.slice(0, MAX_TRIAGE)) {
    // Background job: stop once today's AI budget is spent (server/ai-spend.ts).
    if (await overBudget()) {
      console.warn("[Heal] Daily AI budget reached; the rest waits for tomorrow's run.");
      break;
    }
    let o: Outcome;
    try {
      o = await healOne(c, () => MAX_REWRITES - rewrites);
    } catch (err) {
      o = { kind: "failed", error: err instanceof Error ? err.message : String(err) };
    }
    if (o.kind === "rewritten") rewrites++;
    console.log(`[Heal] "${c.stats.title}": ${o.kind}`);
    rows.push({ c, o });
  }

  const recipient = process.env.REPORT_EMAIL;
  if (!recipient) {
    console.log("[Heal] REPORT_EMAIL not set; skipping the email.");
    return;
  }
  await sendEmail({
    to: recipient,
    subject: `BasicsTutor self-heal: ${rewrites} rewritten, ${rows.length - rewrites} reviewed`,
    html: reportHtml(rows),
  });
  console.log(`[Heal] Report sent to ${recipient}.`);
}

main()
  .catch((err) => {
    console.error("[Heal] Fatal error:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
