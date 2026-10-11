/**
 * Footer for marketing email (CAN-SPAM): why they're getting it, a working
 * unsubscribe link, and the sender's physical postal address. A PO box or a
 * registered virtual mailbox is fine; set it as MAILING_ADDRESS in Render.
 *
 * Internal emails (reports, budget alerts to the founder) don't need this.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Why marketing email can't be sent yet, or null when it can. */
export function marketingEmailBlocker(): string | null {
  return process.env.MAILING_ADDRESS?.trim()
    ? null
    : "MAILING_ADDRESS is not set: marketing email must include a postal address (CAN-SPAM). Add it in Render, e.g. \"BasicsTutor, PO Box 123, City, ST 00000, USA\".";
}

export function emailFooter(opts: { unsubscribeUrl: string; reason: string; unsubscribeLabel: string }): string {
  const address = esc(process.env.MAILING_ADDRESS?.trim() ?? "");
  return `
      <p style="color:#999;font-size:12px;line-height:1.6;margin-top:28px;border-top:1px solid #eee;padding-top:12px;">
        You're getting this because you're ${esc(opts.reason)}.
        <a href="${esc(opts.unsubscribeUrl)}" style="color:#999;">${esc(opts.unsubscribeLabel)}</a>.<br />
        ${address}
      </p>`;
}
