import { useEffect } from "react";

/**
 * Sets document.title while the component is mounted and restores the previous
 * title on unmount. Used to keep tab titles correct during client-side (wouter)
 * navigation — the initial server-rendered title covers the first load.
 */
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
