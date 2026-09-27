/**
 * The BasicsTutor mark: a B derived from one golden rectangle (1 : φ). Each
 * bowl is the circle inscribed in one square of the golden division; the
 * lower bowl is larger by φ (the foundation), the stroke is the upper
 * radius ÷ φ, and the gold Point (a first principle) has radius = upper
 * diameter ÷ φ⁴. Geometry is measured on the stroke centreline, exactly as
 * on the brand's construction sheet -- don't redraw it by eye.
 *
 * The B takes the current text colour (Ink on Paper, Paper on Ink); the
 * Point is always Principle Gold unless a caller passes an age colour.
 * Static copies of this geometry: client/public/favicon.svg + icons, and
 * server/og-image.ts. Keep them in sync.
 */

export const PHI = 1.618033988749895;

/** SVG viewBox for the mark: the golden rectangle plus half a stroke of bleed. */
export const MARK_VIEWBOX = "-15.451 -15.451 192.705 292.705";
const MARK_ASPECT = 192.705 / 292.705; // width / height

export function LogoMark({
  height = 34,
  point = "hsl(var(--gold))",
  className = "",
  title,
}: {
  /** Rendered height in px; width follows the golden proportion. */
  height?: number;
  /** Colour of the Point (gold by default; an age colour inside a profile). */
  point?: string;
  className?: string;
  /** Accessible name; omit when a visible wordmark sits beside it. */
  title?: string;
}) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      width={Math.round(height * MARK_ASPECT * 100) / 100}
      height={height}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth={30.902}>
        <path d="M0 0H50A50 50 0 0 1 50 100H0Z" />
        <path d="M0 100H80.902A80.902 80.902 0 0 1 80.902 261.803H0Z" />
      </g>
      <circle cx={50} cy={50} r={14.59} style={{ fill: point }} />
    </svg>
  );
}

/**
 * Horizontal lockup. Proportions from the construction sheet: wordmark size
 * = mark height ÷ φ, gap = mark height ÷ φ². "Basics" Semibold, "Tutor"
 * Regular, both Jost, tracked -0.02em.
 */
export default function Logo({ height = 34, className = "" }: { height?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center text-foreground ${className}`} style={{ gap: height / (PHI * PHI) }}>
      <LogoMark height={height} />
      <span className="font-sans leading-none" style={{ fontSize: height / PHI, letterSpacing: "-0.02em" }}>
        <span className="font-semibold">Basics</span>
        <span className="font-normal">Tutor</span>
      </span>
    </span>
  );
}
