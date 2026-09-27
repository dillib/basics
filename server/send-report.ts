/**
 * Sends a traction summary email -- new users, new topics (with titles),
 * and waitlist growth over a given period. Scheduled three ways via Render
 * Cron Jobs (see render.yaml): daily, weekly, monthly. Safe to run manually
 * any time too.
 *
 * Usage:
 *   DATABASE_URL="..." RESEND_API_KEY="..." REPORT_EMAIL="you@example.com" \
 *     npm run report:daily   # or report:weekly / report:monthly
 */
import { storage } from "./storage";
import { sendEmail } from "./email";
import type { TrafficSummary } from "./storage";
import type { TrafficSource } from "@shared/schema";
import { pool } from "./db";

type Period = "daily" | "weekly" | "monthly";

const PERIOD_CONFIG: Record<Period, { days: number; label: string; windowLabel: string }> = {
  daily: { days: 1, label: "Daily", windowLabel: "24h" },
  weekly: { days: 7, label: "Weekly", windowLabel: "7d" },
  monthly: { days: 30, label: "Monthly", windowLabel: "30d" },
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const SOURCE_LABELS: Record<TrafficSource, string> = {
  search: "Search", ai: "AI assistants", social: "Social", classroom: "Classroom",
  email: "Email", referral: "Other sites", direct: "Direct", internal: "From another lesson",
};

/** Lesson reads by source -- the distribution scoreboard. */
function trafficHtml(t: TrafficSummary): string {
  if (!t.total) return `<p style="color:#888;margin:8px 0;">No lesson reads recorded in this period yet.</p>`;
  const rows = (Object.keys(SOURCE_LABELS) as TrafficSource[])
    .filter((s) => t.bySource[s] > 0)
    .sort((a, b) => t.bySource[b] - t.bySource[a])
    .map((s) => `<tr><td style="padding:3px 12px 3px 0;">${SOURCE_LABELS[s]}</td><td style="padding:3px 0;text-align:right;font-weight:600;">${t.bySource[s]}</td></tr>`)
    .join("");
  const sites = t.topSites.slice(0, 5).map((s) => `${escapeHtml(s.host)} (${s.views})`).join(", ");
  return `<p style="margin:8px 0;">${t.total} lesson reads</p>
      <table style="border-collapse:collapse;font-size:14px;">${rows}</table>
      ${sites ? `<p style="color:#666;font-size:13px;margin:8px 0;">Top referring sites: ${sites}</p>` : ""}`;
}

async function main() {
  const periodArg = process.argv[2] as Period | undefined;
  const period = periodArg && PERIOD_CONFIG[periodArg] ? periodArg : "daily";
  const { days, label, windowLabel } = PERIOD_CONFIG[period];

  const recipient = process.env.REPORT_EMAIL;
  if (!recipient) {
    console.error("[Report] REPORT_EMAIL is not set. Nothing to send.");
    process.exitCode = 1;
    return;
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [newUsers, newTopics, waitlistTotal, totalUsers, totalTopics] = await Promise.all([
    storage.getUserCount(since),
    storage.getTopicCount(since),
    storage.getWaitlistCount(),
    storage.getUserCount(),
    storage.getTopicCount(),
  ]);

  const recentTopics = await storage.getAllTopics(50, 0, since);
  const traffic = await storage.getTrafficSummary(days);

  const topicListHtml = recentTopics.length
    ? `<ul style="padding-left:20px;margin:8px 0;">${recentTopics
        .map((t) => `<li style="margin-bottom:4px;">${escapeHtml(t.title)} <span style="color:#888;">(${escapeHtml(t.category || "Uncategorized")})</span></li>`)
        .join("")}</ul>`
    : `<p style="color:#888;margin:8px 0;">None in this period.</p>`;

  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
      <h2 style="margin-bottom:4px;">BasicsTutor — ${label} Report</h2>
      <p style="color:#666;margin-top:0;">${dateLabel}</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr>
          <td style="padding:16px;background:#F6F2EA;border-radius:8px 0 0 8px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#0F1E33;">${newUsers}</div>
            <div style="font-size:13px;color:#666;">New Users (${windowLabel})</div>
          </td>
          <td style="padding:16px;background:#F6F2EA;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#0F1E33;">${newTopics}</div>
            <div style="font-size:13px;color:#666;">New Topics (${windowLabel})</div>
          </td>
          <td style="padding:16px;background:#F6F2EA;border-radius:0 8px 8px 0;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#0F1E33;">${waitlistTotal}</div>
            <div style="font-size:13px;color:#666;">Waitlist (total)</div>
          </td>
        </tr>
      </table>

      <h3 style="margin-bottom:4px;">Where readers came from</h3>
      ${trafficHtml(traffic)}

      <h3 style="margin-bottom:4px;">Topics generated in this period</h3>
      ${topicListHtml}

      <p style="color:#888;font-size:13px;margin-top:24px;border-top:1px solid #eee;padding-top:12px;">
        All-time: ${totalUsers} users · ${totalTopics} topics
      </p>
    </div>
  `;

  await sendEmail({
    to: recipient,
    subject: `BasicsTutor ${label} Report: ${newUsers} new users, ${newTopics} new topics`,
    html,
  });

  console.log(`[Report] Sent ${period} report to ${recipient}.`);
}

main()
  .catch((err) => {
    console.error("[Report] Fatal error:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
