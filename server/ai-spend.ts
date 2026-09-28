import { sql } from "drizzle-orm";

// Loaded lazily: scripts and tests that never touch the database (or have
// none configured) can import modules that record spend.
const getDb = async () => (await import("./db")).db;

/**
 * AI spend ledger: tokens and estimated cost per day, task and provider, so
 * Admin -> Traffic shows where the money goes.
 *
 * Budgets never make the site worse for a reader:
 *   - AI_DAILY_BUDGET_USD (default $5): an email alert at 80% and 100%, and
 *     background jobs (weekly refresh, self-heal) stop early. Readers see
 *     no change.
 *   - AI_HARD_LIMIT_USD (default 4x the budget): a runaway guard that only
 *     abuse or a bug should reach. Concept animations switch from Claude to
 *     Gemini (still animated; upgraded back to Claude after the day resets).
 *     Search, lessons and the tutor are never limited.
 *
 * Fire-and-forget: recording never slows or fails the call it measures.
 */

export function recordSpend(task: string, provider: string, model: string, inputTokens: number, outputTokens: number, costUsd: number): void {
  if (!process.env.DATABASE_URL) return;
  const day = new Date().toISOString().slice(0, 10);
  const micros = Math.round(costUsd * 1_000_000);
  getDb().then((db) => db.execute(sql`
    INSERT INTO ai_spend_daily (day, task, provider, model, calls, input_tokens, output_tokens, cost_micros)
    VALUES (${day}, ${task.slice(0, 40)}, ${provider.slice(0, 20)}, ${model.slice(0, 60)}, 1, ${inputTokens}, ${outputTokens}, ${micros})
    ON CONFLICT (day, task, provider, model) DO UPDATE SET
      calls = ai_spend_daily.calls + 1,
      input_tokens = ai_spend_daily.input_tokens + EXCLUDED.input_tokens,
      output_tokens = ai_spend_daily.output_tokens + EXCLUDED.output_tokens,
      cost_micros = ai_spend_daily.cost_micros + EXCLUDED.cost_micros
  `)).then(() => {
    if (spentCache) spentCache.usd += costUsd;
    return checkAlerts();
  }).catch((err) => console.warn("[Spend] record failed:", err?.message));
}

/** Daily AI budget (USD): alerts + background jobs. Default $5. */
export const DAILY_BUDGET_USD = Number(process.env.AI_DAILY_BUDGET_USD) > 0 ? Number(process.env.AI_DAILY_BUDGET_USD) : 5;
/** Runaway guard (USD per day): past it, animations use the cheaper model. Default 4x the budget. */
export const HARD_LIMIT_USD = Number(process.env.AI_HARD_LIMIT_USD) > 0 ? Number(process.env.AI_HARD_LIMIT_USD) : DAILY_BUDGET_USD * 4;

// One email per threshold per day (per server instance).
const alerted = new Set<string>();
async function checkAlerts(): Promise<void> {
  const to = process.env.REPORT_EMAIL || process.env.ADMIN_EMAILS?.split(",")[0]?.trim();
  if (!to || !process.env.RESEND_API_KEY) return;
  const usd = await spentTodayUsd();
  const day = new Date().toISOString().slice(0, 10);
  const level = usd >= HARD_LIMIT_USD ? "hard" : usd >= DAILY_BUDGET_USD ? "100" : usd >= DAILY_BUDGET_USD * 0.8 ? "80" : null;
  if (!level || alerted.has(`${day}:${level}`)) return;
  alerted.add(`${day}:${level}`);
  const what = level === "hard"
    ? `passed the $${HARD_LIMIT_USD.toFixed(2)} hard limit. Concept animations now use Gemini instead of Claude until tomorrow (UTC); everything else is unchanged. This usually means abuse or a bug: check Admin > Traffic > AI spend.`
    : level === "100"
      ? `reached the $${DAILY_BUDGET_USD.toFixed(2)} daily budget. Readers see no change; background jobs pause until tomorrow (UTC).`
      : `is at 80% of the $${DAILY_BUDGET_USD.toFixed(2)} daily budget.`;
  const { sendEmail } = await import("./email");
  await sendEmail({
    to,
    subject: `BasicsTutor AI spend: $${usd.toFixed(2)} today`,
    html: `<p>Today's estimated AI spend ($${usd.toFixed(2)}) ${what}</p><p>Change the limits with AI_DAILY_BUDGET_USD / AI_HARD_LIMIT_USD in Render.</p>`,
  }).catch((err) => console.warn("[Spend] alert email failed:", err?.message));
}

let spentCache: { day: string; at: number; usd: number } | null = null;

export async function spentTodayUsd(): Promise<number> {
  const day = new Date().toISOString().slice(0, 10);
  if (spentCache && spentCache.day === day && Date.now() - spentCache.at < 60_000) return spentCache.usd;
  const db = await getDb();
  const r = await db.execute(sql`SELECT COALESCE(SUM(cost_micros), 0)::bigint AS m FROM ai_spend_daily WHERE day = ${day}`);
  const usd = Number((r.rows[0] as { m: string | number }).m) / 1_000_000;
  spentCache = { day, at: Date.now(), usd };
  return usd;
}

/** Today's spend vs the limits. "ok" on a ledger hiccup: never degrade on a guess. */
export async function spendLevel(): Promise<"ok" | "over_budget" | "hard_limit"> {
  try {
    const usd = await spentTodayUsd();
    return usd >= HARD_LIMIT_USD ? "hard_limit" : usd >= DAILY_BUDGET_USD ? "over_budget" : "ok";
  } catch {
    return "ok";
  }
}

/** Background jobs: stop early once today's budget is spent (readers are unaffected). */
export async function overBudget(): Promise<boolean> {
  return (await spendLevel()) !== "ok";
}

export interface SpendRow { task: string; provider: string; model: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }

export async function spendSummary(days: number): Promise<{ since: string; rows: SpendRow[]; totalUsd: number; todayUsd: number; budgetUsd: number; hardLimitUsd: number }> {
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const db = await getDb();
  const r = await db.execute(sql`
    SELECT task, provider, model, SUM(calls)::int AS calls, SUM(input_tokens)::bigint AS inp, SUM(output_tokens)::bigint AS outp, SUM(cost_micros)::bigint AS m
    FROM ai_spend_daily WHERE day >= ${since}
    GROUP BY task, provider, model ORDER BY SUM(cost_micros) DESC`);
  const rows = (r.rows as any[]).map((x) => ({
    task: x.task, provider: x.provider, model: x.model, calls: x.calls,
    inputTokens: Number(x.inp), outputTokens: Number(x.outp), costUsd: Number(x.m) / 1_000_000,
  }));
  return { since, rows, totalUsd: rows.reduce((a, b) => a + b.costUsd, 0), todayUsd: await spentTodayUsd(), budgetUsd: DAILY_BUDGET_USD, hardLimitUsd: HARD_LIMIT_USD };
}
