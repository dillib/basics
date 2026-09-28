/**
 * Lessons a reader might act on for their own health or money ("your money
 * or your life" topics). They get a visible not-advice note on the page and
 * are refreshed first (web research + sources). Matched on whole slug words,
 * so "how-the-heart-works" is health but "how-photosynthesis-works" isn't.
 */
export type AdviceKind = "health" | "money";

const HEALTH = ["heart", "lungs", "liver", "kidneys", "blood", "hormones", "vitamins", "weight", "fasting", "diet", "nutrition", "caffeine", "alcohol", "antibiotics", "vaccines", "anesthesia", "pain", "immune", "metabolism", "muscles", "digestion", "sleep", "anxiety", "depression", "medicine", "medicines", "disease", "diseases", "cancer", "diabetes", "drugs", "supplements", "cholesterol"];
const MONEY = ["debt", "budgeting", "budget", "retirement", "credit", "etfs", "bond", "bonds", "options", "index", "stock", "stocks", "dividends", "interest", "insurance", "mortgages", "mortgage", "taxes", "tax", "personal", "pegy", "cryptocurrency", "bitcoin", "inflation", "saving", "savings", "investing", "loans", "pension", "pensions"];
// "personal" and "index" only count with their partner word.
const PAIRS: [string, string][] = [["personal", "finance"], ["index", "funds"]];

export function adviceKind(slug: string | null | undefined): AdviceKind | null {
  if (!slug) return null;
  const words = slug.toLowerCase().split("-");
  const has = (w: string) => {
    const pair = PAIRS.find(([a]) => a === w);
    return pair ? words.includes(pair[0]) && words.includes(pair[1]) : words.includes(w);
  };
  if (HEALTH.some(has)) return "health";
  if (MONEY.some(has)) return "money";
  return null;
}

export const ADVICE_NOTE: Record<AdviceKind, string> = {
  health: "This lesson explains how the body works. It isn't medical advice: for your own health, talk to a doctor or pharmacist.",
  money: "This lesson explains how money works. It isn't financial advice: for your own situation, talk to a qualified financial adviser.",
};
