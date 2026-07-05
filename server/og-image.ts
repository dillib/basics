import sharp from "sharp";
import type { Topic } from "@shared/schema";

/**
 * Renders a 1200x630 branded social-share card (Open Graph image) for a topic,
 * as a PNG buffer. Built as an SVG (dark brand background + the topic title)
 * and rasterized with sharp -- which uses the container's fontconfig/DejaVu
 * fonts, verified to render text on both dev and Render's Linux runtime.
 *
 * Why per-topic instead of one static logo: a shared link showing
 * "Quantum Computing, explained from first principles" on a real 1200x630
 * card gets dramatically more clicks in a feed than a tiny square logo.
 */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Greedy word-wrap to at most `maxLines` lines of ~`maxChars` chars each. */
function wrapTitle(title: string, maxChars: number, maxLines: number): string[] {
  const words = title.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    } else {
      current = candidate;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);

  // If anything didn't fit, ellipsize the last line.
  const consumed = lines.join(" ").split(/\s+/).length;
  if (consumed < words.length && lines.length) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/\.*$/, "") + "…";
  }
  return lines;
}

export async function renderTopicOgImage(topic: Topic): Promise<Buffer> {
  const lines = wrapTitle(topic.title, 22, 3);
  // Bigger font when the title is short, smaller when it wraps to 3 lines.
  const fontSize = lines.length === 1 ? 84 : lines.length === 2 ? 72 : 60;
  const lineHeight = Math.round(fontSize * 1.18);
  const titleBlockHeight = lines.length * lineHeight;
  const titleStartY = 300 - titleBlockHeight / 2 + fontSize; // vertically centered-ish

  const titleTspans = lines
    .map((line, i) => `<tspan x="80" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");

  const metaBits = [topic.category, topic.difficulty]
    .filter(Boolean)
    .map((b) => escapeXml(String(b)).toUpperCase())
    .join("  ·  ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glowA" cx="12%" cy="8%" r="85%">
      <stop offset="0%" stop-color="#6d28d9" stop-opacity="0.55"/>
      <stop offset="45%" stop-color="#6d28d9" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#6d28d9" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="92%" cy="98%" r="70%">
      <stop offset="0%" stop-color="#ec4899" stop-opacity="0.30"/>
      <stop offset="60%" stop-color="#ec4899" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="50%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="#0b0d12"/>
  <rect width="1200" height="630" fill="url(#glowA)"/>
  <rect width="1200" height="630" fill="url(#glowB)"/>
  <rect x="0" y="0" width="1200" height="8" fill="url(#accent)"/>

  <!-- Brand mark + wordmark -->
  <rect x="80" y="70" width="40" height="40" rx="10" fill="url(#accent)"/>
  <text x="136" y="100" font-family="sans-serif" font-size="30" font-weight="700" fill="#f8fafc">BasicsTutor.com</text>

  <!-- Category / difficulty -->
  ${metaBits ? `<text x="80" y="185" font-family="sans-serif" font-size="24" font-weight="600" letter-spacing="1" fill="#a78bfa">${metaBits}</text>` : ""}

  <!-- Title -->
  <text x="80" y="${titleStartY}" font-family="sans-serif" font-size="${fontSize}" font-weight="800" fill="#f8fafc">${titleTspans}</text>

  <!-- Tagline -->
  <text x="80" y="565" font-family="sans-serif" font-size="28" font-weight="500" fill="#94a3b8">Explained from first principles</text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
