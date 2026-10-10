/** "My test prep": the study sets made on this device (no account needed). */

export interface SavedSet {
  id: string;
  title: string;
  createdAt: string;
}

const KEY = "testprep:sets";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // sets expire on the server after 30 days

export function loadSavedSets(): SavedSet[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]") as SavedSet[];
    return Array.isArray(raw) ? raw.filter((s) => s?.id && Date.now() - Date.parse(s.createdAt) < TTL_MS) : [];
  } catch {
    return [];
  }
}

export function saveSet(s: SavedSet): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([s, ...loadSavedSets().filter((x) => x.id !== s.id)].slice(0, 20)));
  } catch {}
}

/** Create a study set from a paste and remember it on this device. Throws with a message the student can read. */
export async function startStudySet(input: { text: string; images: string[]; imageUrls: string[] }): Promise<string> {
  const res = await fetch("/api/test-prep", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || "Something went wrong. Please try again.");
  const firstLine = input.text.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "Study set from images";
  saveSet({ id: body.id, title: firstLine.slice(0, 80), createdAt: new Date().toISOString() });
  return body.id as string;
}

export function forgetSet(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadSavedSets().filter((x) => x.id !== id)));
  } catch {}
}
