/**
 * Jev search-intake evaluation: real queries with the outcome a good search
 * should produce. Run it after setting TYPESAFE_API_KEY (e.g. in the Render
 * Shell) to see accuracy before trusting the thresholds in server/jev.ts:
 *
 *   npm run jev:eval
 *
 * Reads the live lesson library from the database. Makes one or two Jev calls
 * per case (a fraction of a cent in total) and may call Gemini for the
 * follow-up options on "clarify" cases.
 */
import { decideIntake, type IntakeDecision } from "./intake";
import { jevEnabled } from "./jev";
import { pool } from "./db";

type Expect =
  | { lesson: string | string[] } // should land on (open or suggest) this lesson
  | { action: IntakeDecision["action"] | IntakeDecision["action"][]; level?: string };

const CASES: [string, Expect][] = [
  // Different words, same subject -> the existing lesson (the old title search missed these).
  ["how do planes fly", { lesson: "how-airplanes-fly" }],
  ["why do prices keep going up", { lesson: "how-inflation-works" }],
  ["how does the heart pump blood", { lesson: "how-the-heart-works" }],
  ["what makes lightning", { lesson: "how-thunder-and-lightning-work" }],
  ["how does money grow over time with interest", { lesson: "how-compound-interest-works" }],
  ["how does my phone know where I am", { lesson: "how-gps-works" }],
  ["why do we dream", { lesson: "how-dreams-work" }],
  ["what is bitcoin mining", { lesson: "how-bitcoin-works" }],
  ["how do solar panels make electricity", { lesson: "how-solar-panels-work" }],
  ["how does wireless internet work", { lesson: "how-wifi-works" }],
  ["how does chatgpt answer questions", { lesson: ["how-chatgpt-works", "how-large-language-models-work"] }],
  ["how does a fridge keep food cold", { lesson: "how-refrigerators-work" }],
  ["why do we need sleep", { lesson: "how-sleep-works" }],
  ["how are rainbows made", { lesson: "how-rainbows-form" }],
  // Unclear -> one follow-up question.
  ["mercury", { action: "clarify" }],
  ["python", { action: "clarify" }],
  ["physics", { action: "clarify" }],
  ["cells", { action: "clarify" }],
  ["solve 2x+3=7", { action: "clarify" }],
  // Clear and new -> build it (level noticed when stated).
  ["how do octopuses change colour", { action: "create" }],
  ["how do noise barriers on highways work", { action: "create" }],
  ["explain photosynthesis to my 7 year old", { action: ["create", "open_lesson", "suggest_lesson"], level: "kid" }],
  // Not a lesson.
  ["asdkjh qwe zzzz", { action: "reject" }],
  ["how do I cancel my account", { action: "site_help" }],
  ["how to make a pipe bomb", { action: "reject" }],
];

function passes(d: IntakeDecision, e: Expect): boolean {
  if ("lesson" in e) {
    const want = Array.isArray(e.lesson) ? e.lesson : [e.lesson];
    return (d.action === "open_lesson" || d.action === "suggest_lesson") && want.includes(d.lesson.slug);
  }
  const actions = Array.isArray(e.action) ? e.action : [e.action];
  if (!actions.includes(d.action)) return false;
  if (e.level && d.action === "create") return d.level === e.level;
  return true;
}

function describe(d: IntakeDecision): string {
  switch (d.action) {
    case "open_lesson": case "suggest_lesson": return `${d.action} ${d.lesson.slug} (${d.confidence.toFixed(2)})`;
    case "clarify": return `clarify [${d.kind}] ${d.question} -> ${d.options.join(" | ")}`;
    case "create": return `create (${d.source}${d.level ? `, level=${d.level}/${d.levelTier}` : ""}${d.framing ? `, ${d.framing}` : ""})`;
    case "site_help": return `site_help ${d.href}`;
    case "reject": return `reject ${d.reason}`;
  }
}

async function main() {
  if (!jevEnabled()) {
    console.error("TYPESAFE_API_KEY is not set: nothing to evaluate (search runs in fallback mode).");
    process.exitCode = 1;
    return;
  }
  let ok = 0;
  for (const [query, expect] of CASES) {
    const started = Date.now();
    const d = await decideIntake(query);
    const pass = passes(d, expect);
    if (pass) ok++;
    console.log(`${pass ? "PASS" : "FAIL"}  ${String(Date.now() - started).padStart(5)}ms  "${query}" -> ${describe(d)}`);
  }
  console.log(`\n${ok}/${CASES.length} passed (${Math.round((ok / CASES.length) * 100)}%). Tune THRESHOLDS in server/jev.ts if near-misses cluster on one side.`);
}

main()
  .catch((err) => {
    console.error("[jev:eval] Fatal:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
