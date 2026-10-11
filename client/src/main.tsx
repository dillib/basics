import { createRoot } from "react-dom/client";
import App from "./App";
// Brand fonts, self-hosted (not Google's servers: visitors' IPs stay with us, GDPR).
import "@fontsource-variable/fraunces/standard.css";
import "@fontsource-variable/fraunces/standard-italic.css";
import "@fontsource-variable/jost";
import "@fontsource-variable/jetbrains-mono";
import "./index.css";
// Capture the landing referrer before any client-side navigation.
import "./lib/attribution";
// Capture the server's pre-rendered page before React replaces it.
import "./lib/ssrSnapshot";

createRoot(document.getElementById("root")!).render(<App />);
