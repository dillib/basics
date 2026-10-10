import type { QType } from "@shared/test-prep";

/**
 * Is the student's answer the same as the key? Deterministic for mc, tf and
 * numeric; exact (normalised) for short answers, where grade.ts asks a model
 * about anything else; never for open questions.
 */

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s.-]/gu, " ").replace(/\s+/g, " ").trim().replace(/\.$/, "");

/** "3/4", ".75", "x = 4", "4 cm", "1,200", "50%" -> number; NaN when it isn't one. */
export function toNumber(raw: string): number {
  let s = raw.trim().replace(/^[a-z]\w*\s*=\s*/i, "").replace(/,/g, "").replace(/\s*%$/, "");
  s = s.replace(/^(-?[\d.]+(?:\s*\/\s*-?[\d.]+)?)\s*[a-z°]*\.?$/i, "$1");
  const frac = /^(-?[\d.]+)\s*\/\s*(-?[\d.]+)$/.exec(s);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? Number(s) : NaN;
}

/** "b", "B)", "(b)", "b." -> 1. */
function letterIndex(s: string): number {
  const m = /^\(?([a-h])[).:]?$/i.exec(s.trim());
  return m ? m[1].toLowerCase().charCodeAt(0) - 97 : -1;
}

function optionIndex(s: string, options: string[]): number {
  const byText = options.findIndex((o) => norm(o) === norm(s));
  if (byText >= 0) return byText;
  const byLetter = letterIndex(s);
  return byLetter >= 0 && byLetter < options.length ? byLetter : -1;
}

const TRUE = new Set(["t", "true", "yes", "y"]);
const FALSE = new Set(["f", "false", "no", "n"]);

export function sameAnswer(type: QType, given: string, expected: string, options: string[] = []): boolean {
  if (!given.trim()) return false;
  switch (type) {
    case "mc": {
      if (!options.length) return norm(given) === norm(expected);
      const g = optionIndex(given, options);
      return g >= 0 && g === optionIndex(expected, options);
    }
    case "tf": {
      const g = norm(given), e = norm(expected);
      return (TRUE.has(g) && TRUE.has(e)) || (FALSE.has(g) && FALSE.has(e));
    }
    case "numeric": {
      const g = toNumber(given), e = toNumber(expected);
      if (Number.isNaN(g) || Number.isNaN(e)) return false;
      return Math.abs(g - e) <= 1e-6 * Math.max(1, Math.abs(e));
    }
    case "short":
      return norm(given) === norm(expected);
    case "open":
      return false;
  }
}
