# Test Prep: design

Date: 2026-10-09 · Status: approved in conversation, pending spec review

## Why

Students get homework and tests as Google Docs, copy the questions and
options into ChatGPT, and copy the answers back. They finish the homework and
learn nothing, then meet the same ideas on the test unprepared.

Test Prep is the honest alternative: paste the same questions into
BasicsTutor and come out able to answer them yourself.

**Success:** a student pastes a set of questions (text and images) and within
seconds is working through it. They learn the concepts behind the questions,
answer their own questions with feedback, practise what they missed, and
finish knowing which concepts they are ready on. Answers are never handed over
before an attempt.

## Decisions

| Topic | Decision |
|---|---|
| Answers | Teach first; reveal an answer only after the student has attempted that question |
| Input | Paste anything: text, images copied with it from Google Docs, screenshots and photos |
| Accounts | None required. The set is saved on the device; sign-in is reconsidered later (COPPA: under-13 accounts need parental consent) |
| Experience | Two modes on one set: **Learn** (default: concepts → own questions → practice → readiness) and **Test me** (no help, optional timer, results by concept) |
| Pipeline | Staged and progressive (questions appear in seconds, then the rest fills in), with every answer key independently checked |

## Student experience

**Entry points**
- Home page: the main box gets two tabs, **Learn a topic** (today's search)
  and **Prep for a test** (a large paste area: "Paste your homework or test
  questions, images too").
- `/test-prep` page, indexable, for direct links and search.
- Pasting several questions into the normal search box offers "This looks like
  a set of questions. Prep for a test instead?"

**After pasting**
1. Within about 3–5 seconds the questions appear, numbered and with their
   images: "Found 14 questions on 4 topics". The student can fix or delete a
   question we read wrong before continuing.
2. The set fills in progressively (concept cards, hints, checked answer keys).
3. **Learn** (default): for each concept, a card (what you need to know, one
   worked example, a link to the full BasicsTutor lesson when one matches),
   then the student's own questions for that concept. Each attempt gets
   right/wrong plus *why*. Hints are on request (2 levels). Reveal is allowed
   only after an attempt. Each missed concept gets 2–3 new practice questions.
4. **Test me**: every question, no hints, optional timer. Then a score by
   concept with a "Learn this" link for each weak concept.
5. End screen: readiness by concept ("Ready: ratios ✓ · Review: percent
   change") and a printable one-page review sheet (reuses the existing
   printable sheet).

**Saving:** progress lives on the device (localStorage, read and written in
try/catch). "My test prep" lists that device's sets. Sets expire after 30 days.

**Tone:** writing level follows the detected grade (kid level for grades 1–5,
teen level for 6–12), under the same writing and safety rules as lessons.

## Architecture

New folder `server/test-prep/`, one job per file:

| File | Responsibility | Model |
|---|---|---|
| `parse.ts` | Text and images → questions `{id, n, stem, type, options[], image?}`, plus a guessed grade and subject. `type`: `mc`, `tf`, `numeric`, `short`, `open` | Gemini 2.5 Flash (multimodal, JSON schema) |
| `group.ts` | Questions → 3–5 concepts `{id, title, questionIds[]}`; each concept is matched to an existing lesson with `findExistingLesson` | Mercury via `llm.ts`, plus Jev |
| `prepare.ts` | Per concept: card (`whatToKnow`, `workedExample`), 2–3 practice questions with keys. Per question: key, explanation, 2 hints | Gemini 2.5 Flash (thinking on for math) |
| `verify.ts` | Independent check of every key. Math/numeric: solved again independently and must match | Mercury via `llm.ts`, Gemini fallback |
| `grade.ts` | Marks `short` answers right/wrong with a one-line reason; `mc`/`tf`/`numeric` are graded deterministically | Mercury via `llm.ts` |
| `store.ts` | Read/write sets, strip keys from client payloads, purge expired sets | — |
| `pipeline.ts` | Runs parse → group → prepare → verify, saving each stage | — |

Each file has a single function with typed input/output, so it can be tested
alone with a mocked model.

**Flow:** the client shrinks images (longest side ≤ 1600 px, JPEG) →
`POST /api/test-prep` → a set row is saved with a random unguessable id → the
pipeline runs in the background (same fire-and-forget pattern as
`server/generation.ts`) → the client polls `GET /api/test-prep/:id` every
1.5 s until `status = ready`. Questions are returned as soon as `parse`
finishes.

### Data

New table `test_prep_sets` (idempotent migration in `server/migrate.ts`):

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | 128-bit random, URL-safe |
| `status` | text | `parsing`, `grouping`, `preparing`, `verifying`, `ready`, `failed` |
| `level` | text | `kid` / `teen` / `adult`, from detected grade |
| `subject` | text | detected |
| `input_text` | text | the paste, ≤ 20,000 chars |
| `images` | jsonb | shrunk images (data URLs), ≤ 10 |
| `data` | jsonb | questions, concepts, cards, practice, keys, explanations, hints, verification |
| `attempted` | jsonb | question ids with at least one attempt (unlocks reveal) |
| `created_at` | timestamp | |

Expired sets (older than 30 days) are deleted at boot and daily.

### API

| Endpoint | Returns |
|---|---|
| `POST /api/test-prep` `{text, images[]}` | `{id}`; 422 with a message when over limits or blocked by the safety gate |
| `GET /api/test-prep/:id` | status, questions, concepts, cards, practice — **never keys, explanations or hints** |
| `PATCH /api/test-prep/:id/questions/:qid` `{stem, options}` | the corrected question; that question is re-prepared and re-verified |
| `POST /api/test-prep/:id/attempt` `{qid, answer}` | `{correct, explanation}` (`correct` is null for `open`); records the attempt |
| `POST /api/test-prep/:id/hint` `{qid, level}` | hint text |
| `POST /api/test-prep/:id/reveal` `{qid}` | the key, or **409** if the question has no attempt yet |

Practice questions use the same attempt, hint and reveal endpoints.

## Answer integrity

- Keys stay on the server; the client receives them only through `reveal`
  after an attempt. This is a nudge rather than airtight security, but it
  blocks the effortless copy-and-paste.
- `open` questions (explain, describe, essay) never get a single "right
  answer": the student gets feedback on what a strong answer covers.
- A key that fails `verify` (or math answers that disagree) is shown as
  "Check this one with your teacher" rather than presented as fact.

## Safety, limits and cost

- The paste goes through `checkRequest` (word lists + Jev). All generated text
  follows the kid/teen writing rules and passes the `lint` word lists. Image
  reading uses Gemini's strict safety settings.
- Per set: ≤ 30 questions, ≤ 10 images, ≤ 20,000 characters. Rate limit: 10
  new sets per visitor per hour (keyed by `clientIp`), plus the existing
  Cloudflare rule (add `/api/test-prep` to its expression).
- Spend is recorded under `test_prep_parse`, `test_prep_group`,
  `test_prep_prepare`, `test_prep_verify` and `test_prep_grade`. Estimated
  2–4 cents per set. Like lessons, test prep is reader-facing and is never cut
  off by the budget (alerts still apply).
- Pasted content is used only to build the set and is deleted after 30 days.
  Nothing is used to train models or shared.

## Errors

- **Unreadable image or question:** "Couldn't read this one, type it in" with
  an edit box (uses `PATCH`).
- **Failed verification:** "Check this one with your teacher".
- **A stage fails:** the rest of the set still works; a stage that never
  completes marks the affected items unavailable instead of failing the set.
- **Nothing recognisable as questions:** "We couldn't find questions in that.
  Want to learn a topic instead?" (pre-fills the topic search).

## Testing

- `parse`: fixture pastes against a mocked model, checking question
  splitting: Google Docs option styles (`a)`, `A.`, `(a)`), math with
  fractions, an attached diagram, mixed types, numbering gaps.
- `verify`: a wrong key is flagged; disagreeing math is never shown as fact.
- API: reveal returns 409 before an attempt and the key after; `GET` never
  contains keys; limits and safety gate return 422.
- Live run before launch: 10 real worksheets (8th grade math, science, social
  studies) on the live site, results reviewed; then a hands-on test by the
  founder and an 8th grader before announcing.

## Measuring

In Admin → Traffic: sets created and questions per set; the share of questions
attempted before reveal (does the nudge work); end-of-set readiness (% of
concepts Ready); cost per set from the spend ledger.

## Not in v1

Accounts and parent dashboards (reconsidered later); Google Docs/Drive links;
detection of a live test; spaced review reminders for test-prep sets;
teacher and class features.
