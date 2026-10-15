import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { restoreAndAutosave } from "./app/actions";
import { isDesktop } from "./ingest/load";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

void restoreAndAutosave();

// Offline support and "Install app" for the website; the desktop app ships its files with it.
if (import.meta.env.PROD && "serviceWorker" in navigator && !isDesktop()) {
  navigator.serviceWorker.register("./sw.js").catch(console.warn);
}
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
