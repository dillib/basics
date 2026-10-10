import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ClipboardList } from "lucide-react";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import PasteBox, { type PasteInput } from "@/components/test-prep/PasteBox";
import { loadSavedSets, saveSet, type SavedSet } from "@/lib/testPrepSets";

/** /test-prep: paste homework or test questions and turn them into a study set. */
export default function TestPrepPage() {
  const [, setLocation] = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefill, setPrefill] = useState("");
  const [saved, setSaved] = useState<SavedSet[]>([]);

  useEffect(() => {
    setSaved(loadSavedSets());
    try {
      const p = sessionStorage.getItem("testprep:prefill");
      if (p) { setPrefill(p); sessionStorage.removeItem("testprep:prefill"); }
    } catch {}
  }, []);

  async function start(input: PasteInput) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/test-prep", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Something went wrong. Please try again.");
      const firstLine = input.text.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "Study set from images";
      saveSet({ id: body.id, title: firstLine.slice(0, 80), createdAt: new Date().toISOString() });
      setLocation(`/test-prep/${body.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow="Test Prep"
        title={<>Paste your questions.<br /><span className="text-brand-emphasis">Learn what they're testing.</span></>}
        subtitle="Copy your homework or practice test (images too) and paste it here. You'll learn the ideas behind each question, try them yourself with hints, and see the answers after you've had a go."
      />
      <main className="container mx-auto max-w-3xl px-4 pb-16">
        <PasteBox onSubmit={start} busy={busy} initialText={prefill} />
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}

        {saved.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-3 text-lg font-semibold">My test prep</h2>
            <ul className="divide-y rounded-xl border bg-card">
              {saved.map((s) => (
                <li key={s.id}>
                  <Link href={`/test-prep/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    <span className="flex-1 truncate">{s.title}</span>
                    <span className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">Saved on this device. Study sets are deleted after 30 days.</p>
          </section>
        )}

        <section className="mt-12 grid gap-4 sm:grid-cols-3 text-sm">
          {[
            ["Learn the ideas", "Your questions are grouped by the concepts they test, each with a short explanation and a worked example."],
            ["Try it yourself", "Answer each question, get hints when you're stuck, and see the answer after you've had a go."],
            ["Know you're ready", "Practice what you missed, take it as a test, and see which topics you've got."],
          ].map(([t, b]) => (
            <div key={t} className="rounded-xl border bg-card p-4">
              <h3 className="mb-1 font-semibold">{t}</h3>
              <p className="text-muted-foreground">{b}</p>
            </div>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}
