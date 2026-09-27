import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Capture the landing referrer before any client-side navigation.
import "./lib/attribution";
// Capture the server's pre-rendered page before React replaces it.
import "./lib/ssrSnapshot";

createRoot(document.getElementById("root")!).render(<App />);
