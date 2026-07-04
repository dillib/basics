/**
 * Sends a daily traction summary email -- new users, new topics (with
 * titles), and waitlist growth over the last 24 hours. Scheduled via the
 * "daily-report" Render Cron Job (see render.yaml); safe to run manually
 * any time too.
 *
 * Usage:
 *   DATABASE_URL="..." RESEND_API_KEY="..." REPORT_EMAIL="you@example.com" npm run report:daily
 */
import { storage } from "./storage";
import { sendEmail } from "./email";
import { pool } from "./db";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function main() {
  const recipient = process.env.REPORT_EMAIL;
  if (!recipient) {
    console.error("[Report] REPORT_EMAIL is not set. Nothing to send.");
    process.exitCode = 1;
    return;
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [newUsers, newTopics, waitlistTotal, totalUsers, totalTopics] = await Promise.all([
    storage.getUserCount(since),
    storage.getTopicCount(since),
    storage.getWaitlistCount(),
    storage.getUserCount(),
    storage.getTopicCount(),
  ]);

  const recentTopics = await storage.getAllTopics(20, 0, since);

  const topicListHtml = recentTopics.length
    ? `<ul style="padding-left:20px;margin:8px 0;">${recentTopics
        .map((t) => `<li style="margin-bottom:4px;">${escapeHtml(t.title)} <span style="color:#888;">(${escapeHtml(t.category || "Uncategorized")})</span></li>`)
        .join("")}</ul>`
    : `<p style="color:#888;margin:8px 0;">None in the last 24 hours.</p>`;

  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
      <h2 style="margin-bottom:4px;">BasicsTutor — Daily Report</h2>
      <p style="color:#666;margin-top:0;">${dateLabel}</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr>
          <td style="padding:16px;background:#f5f3ff;border-radius:8px 0 0 8px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#6d28d9;">${newUsers}</div>
            <div style="font-size:13px;color:#666;">New Users (24h)</div>
          </td>
          <td style="padding:16px;background:#f5f3ff;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#6d28d9;">${newTopics}</div>
            <div style="font-size:13px;color:#666;">New Topics (24h)</div>
          </td>
          <td style="padding:16px;background:#f5f3ff;border-radius:0 8px 8px 0;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#6d28d9;">${waitlistTotal}</div>
            <div style="font-size:13px;color:#666;">Waitlist (total)</div>
          </td>
        </tr>
      </table>

      <h3 style="margin-bottom:4px;">Topics generated in the last 24 hours</h3>
      ${topicListHtml}

      <p style="color:#888;font-size:13px;margin-top:24px;border-top:1px solid #eee;padding-top:12px;">
        All-time: ${totalUsers} users · ${totalTopics} topics
      </p>
    </div>
  `;

  await sendEmail({
    to: recipient,
    subject: `BasicsTutor: ${newUsers} new users, ${newTopics} new topics today`,
    html,
  });

  console.log(`[Report] Sent daily report to ${recipient}.`);
}

main()
  .catch((err) => {
    console.error("[Report] Fatal error:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
