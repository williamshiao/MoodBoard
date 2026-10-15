import { useEffect, useState } from "react";
import { addFromTransfer, fitAll } from "./app/actions";
import { Board } from "./board/Board";
import { isLight } from "./core/background";
import { zoomAt } from "./core/geometry";
import { useBoard } from "./store/board";
import { Hint } from "./ui/Hint";
import { Toast } from "./ui/Toast";
import { Toolbar } from "./ui/Toolbar";

// Paste events can target the window itself, which has no closest().
const isTyping = (e: Event) =>
  e.target instanceof Element && e.target.closest("input, textarea, [contenteditable]") !== null;

export function App() {
  const empty = useBoard((s) => Object.keys(s.items).length === 0);
  const lightBoard = useBoard((s) => isLight(s.settings.background));
  const dragging = useDropAndPaste();
  useShortcuts();

  return (
    <div className={lightBoard ? "light-board" : undefined}>
      <Board />
      {empty && <Hint />}
      <Toolbar />
      {dragging && <div className="drop-outline" />}
      <Toast />
    </div>
  );
}

/** Drops anywhere in the window and pastes go to the board. Returns whether a drag is hovering. */
function useDropAndPaste() {
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    let depth = 0;
    const enter = (e: DragEvent) => {
      e.preventDefault();
      depth++;
      setDragging(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const over = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const drop = (e: DragEvent) => {
      e.preventDefault();
      depth = 0;
      setDragging(false);
      if (e.dataTransfer) void addFromTransfer(e.dataTransfer, { x: e.clientX, y: e.clientY });
    };
    const paste = (e: ClipboardEvent) => {
      if (isTyping(e) || !e.clipboardData) return;
      e.preventDefault();
      void addFromTransfer(e.clipboardData, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    window.addEventListener("paste", paste);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
      window.removeEventListener("paste", paste);
    };
  }, []);
  return dragging;
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const s = useBoard.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if ((e.key === "Delete" || e.key === "Backspace") && s.selectedId) {
        e.preventDefault();
        s.remove(s.selectedId);
      } else if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
      } else if (mod && key === "y") {
        e.preventDefault();
        s.redo();
      } else if (mod && key === "0") {
        e.preventDefault();
        s.setView(zoomAt(s.view, { x: window.innerWidth / 2, y: window.innerHeight / 2 }, 1 / s.view.zoom));
      } else if (!mod && key === "f") {
        fitAll();
      } else if (e.key === "Escape") {
        s.select(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
