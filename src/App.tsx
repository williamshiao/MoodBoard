import { useEffect, useState } from "react";
import { addFromTransfer, fitAll } from "./app/actions";
import { Board } from "./board/Board";
import { isLight } from "./core/background";
import { zoomAt } from "./core/geometry";
import { flipX, flipY, rotateBy, useBoard } from "./store/board";
import { Hint } from "./ui/Hint";
import { SelectionBar } from "./ui/SelectionBar";
import { Shortcuts, toggleShortcutSheet, useShortcutSheet } from "./ui/Shortcuts";
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
      <SelectionBar />
      {dragging && <div className="drop-outline" />}
      <Shortcuts />
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
      if (e.key === "?") {
        toggleShortcutSheet();
        return;
      }
      // While the sheet is open it owns the keyboard (Esc closes it).
      if (useShortcutSheet.getState().open) return;
      const s = useBoard.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const selection = s.selectedIds;
      if ((e.key === "Delete" || e.key === "Backspace") && selection.length) {
        e.preventDefault();
        s.remove(selection);
      } else if (mod && key === "a") {
        e.preventDefault();
        s.selectOnly(Object.keys(s.items));
      } else if (!mod && selection.length && key === "h") {
        s.update(selection, flipX);
      } else if (!mod && selection.length && key === "v") {
        s.update(selection, flipY);
      } else if (!mod && selection.length && key === "r") {
        s.update(selection, rotateBy(e.shiftKey ? -90 : 90));
      } else if (!mod && selection.length && key === "i") {
        s.toggleFilter("invert");
      } else if (!mod && selection.length && key === "d") {
        s.toggleFilter("grayscale");
      } else if (mod && selection.length && (e.code === "BracketRight" || e.code === "BracketLeft")) {
        // e.code, not e.key: Shift turns "]" into "}" on most layouts.
        e.preventDefault();
        const up = e.code === "BracketRight";
        s.restack(e.shiftKey ? (up ? "front" : "back") : up ? "forward" : "backward");
      } else if (mod && key === "g") {
        e.preventDefault();
        if (e.shiftKey) s.ungroup();
        else s.group();
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
        s.selectOnly([]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
