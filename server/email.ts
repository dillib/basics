import { Resend } from "resend";

let client: Resend | null = null;

function getResendClient(): Resend {
  if (!client) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

/**
 * Sends a single email via Resend. Uses Resend's shared sandbox sender
 * (onboarding@resend.dev) by default, which works immediately with no DNS
 * setup -- override RESEND_FROM_EMAIL once you've verified a sending domain.
 */
export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL || "BasicsTutor <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });

  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`);
  }
}
