import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Filtruje noise z Chrome extensions (typicky password manageři / translátory /
// dev tools rozšíření používající `chrome.runtime.onMessage` s `return true` pro
// asynchronní response). Jejich neodchycené promise rejekce by jinak triggrovaly
// Vite runtime-error-overlay i přesto, že nejsou z naší aplikace.
window.addEventListener("unhandledrejection", (event) => {
  const message = String(event.reason?.message ?? event.reason ?? "");
  if (
    message.includes("message channel closed before a response was received") ||
    message.includes("Extension context invalidated")
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
