/**
 * Emails each user who has principles due for review: "you've got N ready to
 * review." The retention nudge that pulls people back without them opening the
 * app. Scheduled via the review-reminders Render Cron Job (see render.yaml).
 *
 * SAFETY: does nothing unless REVIEW_REMINDERS_ENABLED=true. Leave it off until
 * you've verified a real sending domain in Resend (set RESEND_FROM_EMAIL) --
 * blasting user email from the shared onboarding@resend.dev sandbox sender will
 * land in spam and can get that shared sender throttled. Every email includes a
 * one-click unsubscribe link.
 *
 * Usage (once you're ready):
 *   REVIEW_REMINDERS_ENABLED=true DATABASE_URL="..." RESEND_API_KEY="..." \
 *     RESEND_FROM_EMAIL="BasicsTutor <hi@basicstutor.com>" \
 *     PUBLIC_URL="https://basicstutor.com" npm run remind:reviews
 */
import { storage } from "./storage";
import { sendEmail } from "./email";
import { unsubscribeUrl } from "./email-unsubscribe";
import { pool } from "./db";

const SITE_URL = (process.env.PUBLIC_URL || "https://basicstutor.com").replace(/\/$/, "");

function reminderHtml(firstName: string | null, dueCount: number, unsubUrl: string): string {
  const name = firstName ? `, ${firstName}` : "";
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      <h2 style="margin-bottom:4px;">You've got ${dueCount} principle${dueCount > 1 ? "s" : ""} to review</h2>
      <p style="color:#555;line-height:1.6;margin-top:0;">
        Hey${name} — a few of the ideas you learned on BasicsTutor are ready for a quick review.
        Spaced practice is what turns "I read that once" into "I actually get it." Five minutes now
        and it sticks.
      </p>
      <a href="${SITE_URL}/dashboard"
         style="display:inline-block;margin:16px 0;background:#6d28d9;color:#fff;text-decoration:none;
                padding:12px 22px;border-radius:8px;font-weight:600;">
        Review ${dueCount} now →
      </a>
      <p style="color:#999;font-size:12px;margin-top:28px;border-top:1px solid #eee;padding-top:12px;">
        You're getting this because you're learning on BasicsTutor.
        <a href="${unsubUrl}" style="color:#999;">Unsubscribe from review reminders</a>.
      </p>
    </div>
  `;
}

async function main() {
  if (process.env.REVIEW_REMINDERS_ENABLED !== "true") {
    console.log("[Reminders] REVIEW_REMINDERS_ENABLED is not 'true'. Skipping (see file header).");
    return;
  }

  const users = await storage.getUsersWithDueReviews();
  console.log(`[Reminders] ${users.length} user(s) have reviews due.`);

  let sent = 0;
  let failed = 0;
  for (const user of users) {
    try {
      await sendEmail({
        to: user.email,
        subject: `${user.dueCount} principle${user.dueCount > 1 ? "s" : ""} ready to review on BasicsTutor`,
        html: reminderHtml(user.firstName, user.dueCount, unsubscribeUrl(SITE_URL, user.id)),
      });
      sent++;
    } catch (err) {
      failed++;
      console.error(`[Reminders] Failed for ${user.email}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`[Reminders] Done. Sent ${sent}, failed ${failed}.`);
}

main()
  .catch((err) => {
    console.error("[Reminders] Fatal error:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
