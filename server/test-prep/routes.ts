import express, { type Express, type Request, type Response } from "express";
import { checkRequest, lint } from "../safety";
import { testPrepEditLimiter, testPrepLimiter } from "../security";
import { createSet, getSet, markRevealed, recordAttempt, setKey, toClient, updateSet } from "./store";
import { ensureRunning, runPipeline } from "./pipeline";
import { gradeAttempt } from "./grade";
import { prepareConcept } from "./prepare";
import { verifyKeys } from "./verify";
import { fetchImageAsDataUrl, isAllowedImageUrl } from "./images";
import { TEST_PREP_LIMITS, type PrepQuestion } from "@shared/test-prep";

const EXPIRED = "This set has expired or doesn't exist";
const IMAGE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/**
 * Pasted or edited text a child could end up reading: the word lists over the
 * whole text, then the model check (Jev) on its start. A message when blocked.
 */
async function unsafe(text: string): Promise<string | null> {
  const found = lint(text);
  if (found.explicit.length || found.profanity.length) return "BasicsTutor can't help with that. Paste school questions you'd like to understand.";
  const verdict = await checkRequest(text.slice(0, 4000), { kind: "topic" });
  return verdict.allowed ? null : verdict.message;
}

async function loadQuestion(req: Request, res: Response, opts: { images?: boolean } = {}) {
  const s = await getSet(req.params.id, opts);
  if (!s) { res.status(404).json({ message: EXPIRED }); return null; }
  const qid = str(req.body?.qid ?? req.params.qid, 40);
  const q = s.data.questions.find((x) => x.id === qid);
  if (!q) { res.status(404).json({ message: "That question isn't in this set." }); return null; }
  return { s, q, key: s.data.keys[q.id] };
}

export function registerTestPrepRoutes(app: Express): void {
  // Pasted images make this the one large request (≤ 10 shrunk images).
  app.post("/api/test-prep", express.json({ limit: "12mb" }), testPrepLimiter, async (req, res) => {
    const text = typeof req.body?.text === "string" ? req.body.text : "";
    const images: unknown[] = Array.isArray(req.body?.images) ? req.body.images : [];
    const imageUrls: unknown[] = Array.isArray(req.body?.imageUrls) ? req.body.imageUrls : [];
    if (text.length > TEST_PREP_LIMITS.chars) return res.status(422).json({ message: `That's too long. Paste up to ${TEST_PREP_LIMITS.chars.toLocaleString("en-US")} characters at a time.` });
    if (images.length + imageUrls.length > TEST_PREP_LIMITS.images) return res.status(422).json({ message: `Add up to ${TEST_PREP_LIMITS.images} images at a time.` });
    if (!images.every((i) => typeof i === "string" && IMAGE.test(i))) return res.status(422).json({ message: "One of the images couldn't be read. Try a PNG or JPG." });
    if (!imageUrls.every((u) => typeof u === "string" && isAllowedImageUrl(u))) return res.status(422).json({ message: "One of the images couldn't be read. Try copying it as a screenshot." });
    if (!text.trim() && !images.length && !imageUrls.length) return res.status(422).json({ message: "Paste some questions first." });
    if (text.trim()) {
      const blocked = await unsafe(text);
      if (blocked) return res.status(422).json({ message: blocked });
    }
    // Google Docs image links (server-side fetch; unreachable ones are skipped).
    const fetched = (await Promise.all((imageUrls as string[]).map(fetchImageAsDataUrl))).filter((x): x is string => !!x);
    const id = await createSet({ text, images: [...(images as string[]), ...fetched] });
    void runPipeline(id);
    res.json({ id });
  });

  // Images load once by URL (cacheable), never in the 1.5 s poll.
  app.get("/api/test-prep/:id/images/:n", async (req, res) => {
    const s = await getSet(req.params.id, { images: true });
    const m = /^data:([^;]+);base64,(.+)$/.exec(s?.images[Number(req.params.n)] ?? "");
    if (!s || !m) return res.status(404).json({ message: "Image not found" });
    res.set("Cache-Control", "private, max-age=86400").type(m[1]).send(Buffer.from(m[2], "base64"));
  });

  app.get("/api/test-prep/:id", async (req, res) => {
    const s = await getSet(req.params.id);
    if (!s) return res.status(404).json({ message: EXPIRED });
    ensureRunning(s);
    res.json(toClient(s));
  });

  // Fix a question we read wrong; re-prepare and re-check it.
  app.patch("/api/test-prep/:id/questions/:qid", testPrepEditLimiter, async (req, res) => {
    const found = await loadQuestion(req, res, { images: true });
    if (!found) return;
    const { s, q } = found;
    // Mid-build, the next stage would overwrite the edit.
    if (s.status !== "ready") return res.status(409).json({ message: "Still building your set. You can edit questions in a moment." });
    if (q.practice) return res.status(422).json({ message: "Only your own questions can be edited." });
    const stem = str(req.body?.stem, 2000).trim();
    if (!stem) return res.status(422).json({ message: "Type the question first." });
    const blocked = await unsafe(stem);
    if (blocked) return res.status(422).json({ message: blocked });
    const options = q.type === "mc" && Array.isArray(req.body?.options) ? (req.body.options as unknown[]).map((o) => str(o, 300)).filter(Boolean).slice(0, 8) : q.options;
    const data = structuredClone(s.data);
    const updated: PrepQuestion = { ...q, stem, options, unreadable: undefined, editedAt: Date.now() };
    data.questions = data.questions.map((x) => (x.id === q.id ? updated : x));
    let concept = data.concepts.find((c) => c.id === updated.conceptId);
    if (!concept) {
      concept = data.concepts[0] ?? { id: "c1", title: data.subject || "Your questions", questionIds: [], practiceIds: [] };
      if (!data.concepts.includes(concept)) data.concepts.push(concept);
      if (!concept.questionIds.includes(q.id)) concept.questionIds.push(q.id);
      updated.conceptId = concept.id;
    }
    delete data.keys[q.id];
    await updateSet(s.id, { data });
    res.json(updated);

    // Background: new key for this question, checked like the rest. setKey
    // drops it if the student has edited the question again since.
    const own = data.questions.filter((x) => concept!.questionIds.includes(x.id) && !x.practice);
    const r = await prepareConcept(concept, own, s.level, s.images).catch(() => null);
    if (!r?.keys[q.id]) return;
    const checked = await verifyKeys([updated], { [q.id]: r.keys[q.id] }, s.images).catch(() => null);
    if (checked?.[q.id]) await setKey(s.id, q.id, checked[q.id], stem).catch(() => {});
  });

  // Remove a question the student doesn't want (misread, or not on their test).
  app.delete("/api/test-prep/:id/questions/:qid", async (req, res) => {
    const found = await loadQuestion(req, res);
    if (!found) return;
    const { s, q } = found;
    if (s.status !== "ready") return res.status(409).json({ message: "Still building your set. You can remove questions in a moment." });
    if (q.practice) return res.status(422).json({ message: "Only your own questions can be removed." });
    const data = structuredClone(s.data);
    data.questions = data.questions.filter((x) => x.id !== q.id);
    for (const c of data.concepts) c.questionIds = c.questionIds.filter((id) => id !== q.id);
    const emptied = new Set(data.concepts.filter((c) => !c.questionIds.length).map((c) => c.id));
    data.concepts = data.concepts.filter((c) => !emptied.has(c.id));
    data.questions = data.questions.filter((x) => !(x.practice && x.conceptId && emptied.has(x.conceptId)));
    delete data.keys[q.id];
    await updateSet(s.id, { data });
    res.json({ ok: true });
  });

  app.post("/api/test-prep/:id/attempt", async (req, res) => {
    const found = await loadQuestion(req, res);
    if (!found) return;
    const { s, q, key } = found;
    if (!key) return res.status(409).json({ message: "Still preparing this one. Try again in a moment." });
    const answer = str(req.body?.answer, 2000);
    if (!answer.trim()) return res.status(422).json({ message: "Type an answer first." });
    const result = await gradeAttempt(q, key, answer);
    await recordAttempt(s.id, q.id, result.correct);
    res.json(result);
  });

  app.post("/api/test-prep/:id/hint", async (req, res) => {
    const found = await loadQuestion(req, res);
    if (!found) return;
    if (!found.key) return res.status(409).json({ message: "Still preparing this one. Try again in a moment." });
    res.json({ hint: found.key.hints[req.body?.level === 2 ? 1 : 0] });
  });

  app.post("/api/test-prep/:id/reveal", async (req, res) => {
    const found = await loadQuestion(req, res);
    if (!found) return;
    const { s, q, key } = found;
    if (!key) return res.status(409).json({ message: "Still preparing this one. Try again in a moment." });
    if (!(s.attempts[q.id]?.tries > 0)) return res.status(409).json({ message: "Try it first, then you can see the answer." });
    await markRevealed(s.id, q.id);
    res.json({ answer: key.answer, explanation: key.explanation, verified: key.verified });
  });
}
