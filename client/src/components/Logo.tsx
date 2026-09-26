import { useId } from "react";

/**
 * BasicsTutor brand mark + wordmark. Pure SVG, themed through CSS variables
 * (--primary for the tile, --brand-accent for the "spark"), so it stays
 * crisp at favicon size and follows light/dark and future palette changes.
 *
 * The mark: understanding is built up from fundamentals. Three stacked
 * blocks (the basics) topped by a glowing point (the moment it clicks).
 * Static exports of the same geometry live in client/public (favicon.svg,
 * PNG icons) and server/og-image.ts -- keep them in sync if this changes.
 */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  // Unique gradient ids per instance: duplicate ids break when the first
  // copy is inside a hidden element (e.g. a collapsed mobile menu).
  const id = useId().replace(/:/g, "");
  const tile = `bt-tile-${id}`, spark = `bt-spark-${id}`;
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="BasicsTutor">
      <defs>
        <linearGradient id={tile} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "hsl(var(--primary))" }} />
          <stop offset="1" style={{ stopColor: "hsl(var(--primary) / 0.72)" }} />
        </linearGradient>
        <radialGradient id={spark}>
          <stop offset="0" style={{ stopColor: "hsl(var(--brand-accent))", stopOpacity: 0.55 }} />
          <stop offset="1" style={{ stopColor: "hsl(var(--brand-accent))", stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${tile})`} />
      <rect x="13" y="43" width="38" height="8" rx="3" fill="white" />
      <rect x="18.5" y="33" width="27" height="8" rx="3" fill="white" fillOpacity="0.9" />
      <rect x="24" y="23" width="16" height="8" rx="3" fill="white" fillOpacity="0.8" />
      <circle cx="32" cy="14.5" r="9" fill={`url(#${spark})`} />
      <circle cx="32" cy="14.5" r="4.6" style={{ fill: "hsl(var(--brand-accent))" }} />
    </svg>
  );
}

export default function Logo({ markClassName = "h-9 w-9" }: { markClassName?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className={markClassName} />
      <span className="text-lg tracking-tight">
        <span className="font-bold text-foreground">Basics</span>
        <span className="font-semibold text-primary">Tutor</span>
      </span>
    </span>
  );
}
