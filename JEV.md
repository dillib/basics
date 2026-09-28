# Jev: the decision layer

BasicsTutor uses two kinds of model:

| | Writes text? | Speed / cost | Used for |
|---|---|---|---|
| **Gemini** (generative LLM) | yes | seconds, cents | lessons, quizzes, the tutor, follow-up wording |
| **Jev** (TypeSafe System One) | **no** — typed decisions only | 70–500 ms, ~$0.04 per million input tokens | routing, matching, gates, scoring |

Jev answers three kinds of question, each with calibrated probabilities and a
`confidence` (how decisive the distribution is):

- **choice** — pick one label from a fixed set (≤ 255)
- **score** — place something on an ordered rubric (2–10 levels)
- **noul** — probability (0–1) that a statement is true

Rule of thumb: **Jev decides, Gemini writes, code stays in control.**
Everything Jev does is optional: without `TYPESAFE_API_KEY`, or on any error or
timeout, each call returns `null` and the caller uses the pre-Jev behaviour.

## Flow: search box (live)

```
reader types ─► /api/topics/search  (250 ms debounce)
                 ├─ title word match (DB, instant)
                 └─ Jev choice: which lesson matches by meaning?   ─► merged suggestions
reader presses Enter ─► POST /api/topics/intake
                 └─ ONE Jev call, six questions (fan-out)
                      intent · clarity · ambiguity · level · framing · match
                    ├─ harmful / gibberish (conf ≥ 0.5) ──► friendly "nothing to teach"
                    ├─ site question (conf ≥ 0.8) ────────► Help Center
                    ├─ match ≠ none ─► Jev noul "same subject?" (verify)
                    │     ≥ 0.8 ─► "We already have this lesson"   (open_lesson)
                    │     ≥ 0.5 ─► "Is this what you're looking for?" (suggest_lesson)
                    ├─ unclear & not yet clarified ─► Gemini writes 3–4 options ─► follow-up chips
                    └─ otherwise ─► create: Gemini quick preview → full lesson
                                     (level preselected if Jev is sure; "how_to" framing passed to the writer)
POST /api/topics/generate ─► duplicate guard: Jev choice + noul ≥ 0.85, same level ─► existing lesson
```

Code: `server/jev.ts` (client, thresholds, cache, fallback), `server/intake.ts`
(questions + decisions), `client/src/components/ProgressiveSearch.tsx` (UI).

## Confidence tiers

| Tier | Confidence | Code does | UI does |
|---|---|---|---|
| high | ≥ 0.8 | act | assertive: "We already have this lesson", level preselected |
| medium | 0.5–0.8 | act only with the reader's confirmation | soft: "Is this what you're looking for?" with "No, create …" |
| low | < 0.5 | don't act on it | ask a follow-up, or fall back to the normal flow |

TypeSafe suggests < 0.5 don't act, 0.5–0.9 act carefully, > 0.9 act
automatically. Our search decisions are low-stakes and reversible, so "high"
starts at 0.8. Creating a page is less reversible, so the duplicate guard
requires 0.85. Tune with `npm run jev:eval` (below), not by feel.

## Questions (as implemented)

State is structured, never a long prompt:
`{ site: "BasicsTutor: free lessons…", query }`. Jev's accuracy falls as the
state grows with irrelevant content, so each call carries only what that
decision needs.

| Key | Type | Options / rubric | Drives |
|---|---|---|---|
| `intent` | choice | learn_topic · site_help · specific_problem · gibberish · harmful | redirects, rejections, "which idea behind it?" |
| `clarity` | score (4) | unclear · too broad · mostly clear · clear | whether to ask a follow-up |
| `ambiguity` | choice | clear · ambiguous_name · too_broad · unclear_goal | what kind of follow-up |
| `level` | choice | kid · teen · adult · unspecified (explicit cues only) | preselect Kids/Teens/Adults |
| `framing` | choice | why_it_works · how_to · both | practical emphasis in the lesson |
| `match` | choice | every public lesson slug (≤ 254) + none | "we already have this" |
| `same` (2nd call) | noul | "the lesson teaches the same subject, not just a related one" | verifies `match` before acting |

Why the second call: choice probabilities always sum to 1, so *something*
always wins even when nothing fits. The noul answers the separate question
"does it actually answer this?" (TypeSafe's semantic-find pattern).

Follow-up questions: Jev decides **that** to ask (and which kind); Gemini
writes the question and 3–4 options (`suggestClarifications` in
`server/ai.ts`). We ask at most once per search: picking an option, or
"None of these, continue", sends `clarified: true` and intake won't ask again.

## Measuring it

- **Admin → Traffic → Search outcomes**: per day, how searches ended
  (existing lesson / suggested / follow-up / new lesson / duplicate prevented /
  rejected / fallback). The before/after number for Jev.
- **`npm run jev:eval`**: 25 real queries with the right outcome (e.g. "how do
  planes fly" → *How Airplanes Fly*; "mercury" → follow-up). Run after setting
  the key, before trusting the thresholds.
- Logs: `[Jev] intake: 312ms, 2841 input tokens` per call.

Cost: the `match` question lists every lesson (~2,500 tokens at 207 lessons),
so a search costs about $0.0001. Past 254 lessons, `matchCriteria` keeps
word-overlap lessons first; the next step is a two-pass search (choose the
field, then the lesson).

## Next phases (designed, not built)

Same tiers, one fan-out call per moment.

**Quiz (adaptive).** State: `{ question, reference_answer, student_answer, principle }`.
- `correct` — score: *wrong · partly right, key idea missing · right idea, imprecise · fully right* → instant feedback; medium confidence shows "Close — here's the key idea" instead of a hard verdict.
- `misconception` — choice over the principle's listed misconceptions + none → targeted hint (Gemini writes it only when this fires).
- `next` — choice: next_principle · review_this · easier_example · challenge.

**Is the reader stuck?** State: `{ time_on_principle, scrolls_back, quiz_attempts, tutor_messages }`.
- `stuck` — noul "the reader is stuck on this principle" → ≥ 0.8 offer the tutor / a simpler analogy; 0.5–0.8 a quiet "Need another angle?" link.

**Explanation style.** State: reader's recent votes, tutor questions, time spent per section.
- `style` — choice: analogy_heavy · formal · visual → which variant renders first (the others stay one tap away).

**First-principles quality gate (generation).** State: `{ topic, principle }`.
- `foundational` — noul "this is a foundational truth the topic rests on, not a tip or a step" → regenerate that principle below 0.5.
- `derived` — score: *asserted · partly justified · derived from something more basic* → flags weak principles for the nightly self-heal.

**UI selection.** A choice over the component set the page can render
(`worked_example` · `diagram` · `analogy_card` · `quiz_check` · `summary`)
for "what should this reader see next", with low confidence falling back to
the default lesson order.

## Limits to respect (Jev 1.13)

Literal reading; weak at multi-step reasoning, arithmetic and dates; doesn't
treat input as hostile. So: user text only ever *chooses among our own
options* (it never triggers actions), fact-checking stays with Gemini + web
research, and Gemini's safety settings remain the real safety net.
Docs: https://docs.typesafe.ai · known limits: https://docs.typesafe.ai/model-jaggedness/jev-1.13.md
