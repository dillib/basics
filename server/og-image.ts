import type { Topic } from "@shared/schema";

// Lazily imported inside the render function (not a top-level import) so that
// if sharp's native binary fails to load on the host, it throws a normal
// runtime error the route can catch and fall back to the logo -- instead of
// crashing the whole server on boot. sharp is an optional nicety, not core.

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
      <stop offset="0%" stop-color="#0f766e" stop-opacity="0.6"/>
      <stop offset="45%" stop-color="#0f766e" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#0f766e" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="92%" cy="98%" r="70%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.26"/>
      <stop offset="60%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#14b8a6"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="#0b0d12"/>
  <rect width="1200" height="630" fill="url(#glowA)"/>
  <rect width="1200" height="630" fill="url(#glowB)"/>
  <rect x="0" y="0" width="1200" height="8" fill="url(#accent)"/>

  <!-- Brand mark + wordmark -->
  <!-- Capstone mark (client/src/components/Logo.tsx), 64-unit grid scaled to 44px. -->
  <g transform="translate(80 66) scale(0.6875)">
    <rect width="64" height="64" rx="16" fill="#15847c"/>
    <rect x="13" y="43" width="38" height="8" rx="3" fill="#ffffff"/>
    <rect x="18.5" y="33" width="27" height="8" rx="3" fill="#ffffff" fill-opacity="0.9"/>
    <rect x="24" y="23" width="16" height="8" rx="3" fill="#ffffff" fill-opacity="0.8"/>
    <circle cx="32" cy="14.5" r="4.6" fill="#f5a524"/>
  </g>
  <text x="138" y="100" font-family="Inter, Arial, Helvetica, DejaVu Sans, sans-serif" font-size="30" font-weight="700" fill="#f8fafc">Basics<tspan fill="#2dd4bf" font-weight="600">Tutor</tspan></text>

  <!-- Category / difficulty -->
  ${metaBits ? `<text x="80" y="185" font-family="sans-serif" font-size="24" font-weight="600" letter-spacing="1" fill="#5eead4">${metaBits}</text>` : ""}

  <!-- Title -->
  <text x="80" y="${titleStartY}" font-family="sans-serif" font-size="${fontSize}" font-weight="800" fill="#f8fafc">${titleTspans}</text>

  <!-- Tagline -->
  <text x="80" y="565" font-family="sans-serif" font-size="28" font-weight="500" fill="#94a3b8">Explained from first principles</text>
</svg>`;

  const sharp = (await import("sharp")).default;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
