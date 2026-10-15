import { isOneGroup } from "../core/groups";
import type { LayerMove } from "../core/layers";
import { flipX, flipY, resetEdits, rotateBy, useBoard } from "../store/board";

type Update = Parameters<ReturnType<typeof useBoard.getState>["update"]>[1];

const run = (fn: Update) => {
  const s = useBoard.getState();
  s.update(s.selectedIds, fn);
};
const restack = (move: LayerMove) => useBoard.getState().restack(move);

/** Actions for the selected images, shown while anything is selected. */
export function SelectionBar() {
  const count = useBoard((s) => s.selectedIds.length);
  const inverted = useBoard(
    (s) => s.selectedIds.length > 0 && s.selectedIds.every((id) => s.items[id]?.invert),
  );
  const desaturated = useBoard(
    (s) => s.selectedIds.length > 0 && s.selectedIds.every((id) => s.items[id]?.grayscale),
  );
  const grouped = useBoard((s) => isOneGroup(s.items, s.selectedIds));
  const anyGrouped = useBoard((s) => s.selectedIds.some((id) => s.items[id]?.group));
  if (!count) return null;

  return (
    <div className="selection-bar" role="toolbar" aria-label="Selected images">
      <span className="count">{count === 1 ? "1 image" : `${count} images`}</span>
      <span className="sep" />
      <button type="button" title="Mirror left to right (H)" onClick={() => run(flipX)}>
        Flip ↔
      </button>
      <button type="button" title="Mirror top to bottom (V)" onClick={() => run(flipY)}>
        Flip ↕
      </button>
      <button
        type="button"
        title="Rotate 90° clockwise (R, Shift+R for counter-clockwise)"
        onClick={() => run(rotateBy(90))}
      >
        Rotate 90°
      </button>
      <span className="sep" />
      <button
        type="button"
        title="Invert colours (I)"
        aria-pressed={inverted}
        onClick={() => useBoard.getState().toggleFilter("invert")}
      >
        Invert
      </button>
      <button
        type="button"
        title="Black and white (D)"
        aria-pressed={desaturated}
        onClick={() => useBoard.getState().toggleFilter("grayscale")}
      >
        Desaturate
      </button>
      <button
        type="button"
        title="Undo rotation, mirroring and colour changes"
        onClick={() => run(resetEdits)}
      >
        Reset
      </button>
      <span className="sep" />
      <button type="button" title="Bring to front (Ctrl+Shift+])" onClick={() => restack("front")}>
        To front
      </button>
      <button type="button" title="Bring forward (Ctrl+])" onClick={() => restack("forward")}>
        Forward
      </button>
      <button type="button" title="Send backward (Ctrl+[)" onClick={() => restack("backward")}>
        Backward
      </button>
      <button type="button" title="Send to back (Ctrl+Shift+[)" onClick={() => restack("back")}>
        To back
      </button>
      <span className="sep" />
      {count > 1 && !grouped && (
        <button
          type="button"
          title="Group so they select and move together (Ctrl+G)"
          onClick={() => useBoard.getState().group()}
        >
          Group
        </button>
      )}
      {anyGrouped && (
        <button type="button" title="Ungroup (Ctrl+Shift+G)" onClick={() => useBoard.getState().ungroup()}>
          Ungroup
        </button>
      )}
      <button
        type="button"
        className="danger"
        title="Remove (Del)"
        onClick={() => {
          const s = useBoard.getState();
          s.remove(s.selectedIds);
        }}
      >
        Delete
      </button>
    </div>
  );
}
