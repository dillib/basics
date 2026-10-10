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

export function forgetSet(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadSavedSets().filter((x) => x.id !== id)));
  } catch {}
}
