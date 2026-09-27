import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Capture the landing referrer before any client-side navigation.
import "./lib/attribution";

createRoot(document.getElementById("root")!).render(<App />);
