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
  // Keep the title clear of the large mark on the right (~760px of room):
  // shrink by the longest line (~0.6em per character: the server renders in
  // DejaVu Sans, which is wider than Jost).
  const longest = Math.max(...lines.map((l) => l.length));
  const fontSize = Math.min(lines.length === 1 ? 78 : lines.length === 2 ? 68 : 58, Math.floor(740 / (longest * 0.6)));
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

  // Brand identity: Ink ground, Paper type, one gold Point. The B mark uses
  // the exact geometry from client/src/components/Logo.tsx. Jost is named
  // first; the server falls back to its installed sans (DejaVu) if absent.
  const sans = "Jost, DejaVu Sans, Arial, sans-serif";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0F1E33"/>

  <!-- The mark, large and quiet on the right: the Point is the only colour. -->
  <g transform="translate(868 95) scale(1.50322) translate(15.451 15.451)"><g fill="none" stroke="#F6F2EA" stroke-width="30.902" opacity="0.1"><path d="M0 0H50A50 50 0 0 1 50 100H0Z"/><path d="M0 100H80.902A80.902 80.902 0 0 1 80.902 261.803H0Z"/></g><circle cx="50" cy="50" r="14.59" fill="#C8A24A"/></g>

  <!-- Lockup: mark height 52, wordmark 52/φ ≈ 32, gap 52/φ² ≈ 20. -->
  <g transform="translate(80 62) scale(0.17765) translate(15.451 15.451)" opacity="1"><g fill="none" stroke="#F6F2EA" stroke-width="30.902"><path d="M0 0H50A50 50 0 0 1 50 100H0Z"/><path d="M0 100H80.902A80.902 80.902 0 0 1 80.902 261.803H0Z"/></g><circle cx="50" cy="50" r="14.59" fill="#C8A24A"/></g>
  <text x="134" y="99" font-family="${sans}" font-size="32" letter-spacing="-0.6" fill="#F6F2EA"><tspan font-weight="600">Basics</tspan><tspan font-weight="400">Tutor</tspan></text>

  <!-- Category / difficulty -->
  ${metaBits ? `<text x="80" y="190" font-family="${sans}" font-size="22" font-weight="500" letter-spacing="4" fill="#C9CED6">${metaBits}</text>` : ""}

  <!-- Title -->
  <text x="80" y="${titleStartY}" font-family="${sans}" font-size="${fontSize}" font-weight="500" letter-spacing="-1" fill="#F6F2EA">${titleTspans}</text>

  <!-- Gold rule + tagline -->
  <rect x="80" y="523" width="96" height="3" fill="#C8A24A"/>
  <text x="80" y="570" font-family="${sans}" font-size="28" font-weight="400" fill="#C9CED6">Explained from first principles</text>
</svg>`;

  const sharp = (await import("sharp")).default;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
