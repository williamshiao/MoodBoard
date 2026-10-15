import { useRef } from "react";
import { exportToFile, fitAll, importFromFile } from "../app/actions";
import { useBoard } from "../store/board";

export function Toolbar() {
  const zoom = useBoard((s) => s.view.zoom);
  const canUndo = useBoard((s) => s.history.past.length > 0);
  const canRedo = useBoard((s) => s.history.future.length > 0);
  const empty = useBoard((s) => Object.keys(s.items).length === 0);
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="toolbar" role="toolbar" aria-label="Board">
      <button type="button" title="Fit all (F)" onClick={fitAll}>
        Fit
      </button>
      <span className="zoom" title="Zoom level">
        {Math.round(zoom * 100)}%
      </span>
      <span className="sep" />
      <button
        type="button"
        title="Undo (Ctrl+Z)"
        disabled={!canUndo}
        onClick={() => useBoard.getState().undo()}
      >
        Undo
      </button>
      <button
        type="button"
        title="Redo (Ctrl+Shift+Z)"
        disabled={!canRedo}
        onClick={() => useBoard.getState().redo()}
      >
        Redo
      </button>
      <span className="sep" />
      <button type="button" title="Save the board to a .moodboard file" onClick={exportToFile}>
        Export
      </button>
      <button type="button" title="Open a .moodboard file" onClick={() => fileInput.current?.click()}>
        Import
      </button>
      <button
        type="button"
        title="Remove every image (undoable)"
        disabled={empty}
        onClick={() => useBoard.getState().clear()}
      >
        Clear
      </button>
      <input
        ref={fileInput}
        type="file"
        accept=".moodboard"
        hidden
        data-testid="import-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void importFromFile(file);
        }}
      />
    </div>
  );
}
