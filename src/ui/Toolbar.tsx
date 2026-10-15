import { useCallback, useRef, useState } from "react";
import { exportToFile, exportToPng, fitAll, importFromFile } from "../app/actions";
import { useBoard } from "../store/board";
import { SettingsPanel } from "./SettingsPanel";
import { toggleShortcutSheet } from "./Shortcuts";

export function Toolbar() {
  const zoom = useBoard((s) => s.view.zoom);
  const canUndo = useBoard((s) => s.history.past.length > 0);
  const canRedo = useBoard((s) => s.history.future.length > 0);
  const empty = useBoard((s) => Object.keys(s.items).length === 0);
  const snap = useBoard((s) => s.settings.snap);
  const fileInput = useRef<HTMLInputElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  return (
    <>
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
        <button type="button" title="Save the board as a PNG picture" disabled={empty} onClick={exportToPng}>
          PNG
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
        <span className="sep" />
        <button
          type="button"
          title="Snap images to each other's edges and centres while dragging (hold Alt to skip once)"
          aria-pressed={snap}
          onClick={() => useBoard.getState().setSettings({ snap: !snap })}
        >
          Snap
        </button>
        <button
          type="button"
          title="Background and grid"
          data-settings-toggle
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((o) => !o)}
        >
          Board
        </button>
        <button
          type="button"
          title="Keyboard shortcuts (?)"
          aria-label="Shortcuts"
          onClick={toggleShortcutSheet}
        >
          ?
        </button>
      </div>
      {settingsOpen && <SettingsPanel onClose={closeSettings} />}
    </>
  );
}
