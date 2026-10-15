import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { restoreAndAutosave } from "./app/actions";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

void restoreAndAutosave();
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
