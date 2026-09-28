// Apply the saved (or system) theme before the first paint, so dark-mode
// visitors don't see a light page until the app's JavaScript loads. Mirrors
// ThemeProvider; a separate file because the CSP disallows inline scripts.
try {
  var t = localStorage.getItem("theme");
  if (t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.classList.add("dark");
  }
} catch (e) {}
