import type { Level } from "@shared/levels";

// All-ages system: the B never changes; the Point takes the learner's age
// colour (Kids coral, Teens sky, Adults gold). Full class names so Tailwind
// keeps them.
export const LEVEL_POINT: Record<Level, string> = {
  kid: "bg-level-kid",
  teen: "bg-level-teen",
  adult: "bg-level-adult",
};
