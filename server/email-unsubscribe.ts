import crypto from "crypto";

/**
 * One-click unsubscribe links for product emails. A link carries the user id
 * plus an HMAC signature (keyed on SESSION_SECRET) so it can't be forged to
 * unsubscribe someone else -- no DB token table needed. Verification is
 * timing-safe.
 */

function sign(userId: string): string {
  return crypto
    .createHmac("sha256", process.env.SESSION_SECRET || "")
    .update(`unsubscribe:${userId}`)
    .digest("hex");
}

export function unsubscribeUrl(baseUrl: string, userId: string): string {
  const sig = sign(userId);
  return `${baseUrl}/api/unsubscribe?u=${encodeURIComponent(userId)}&sig=${sig}`;
}

export function verifyUnsubscribe(userId: string, sig: string): boolean {
  if (!userId || !sig) return false;
  const expected = sign(userId);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
