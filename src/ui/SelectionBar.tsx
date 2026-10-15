import { flipX, flipY, resetTransform, rotateBy, useBoard } from "../store/board";

/** Actions for the selected images, shown while anything is selected. */
export function SelectionBar() {
  const count = useBoard((s) => s.selectedIds.length);
  if (!count) return null;
  const run = (fn: Parameters<ReturnType<typeof useBoard.getState>["update"]>[1]) => {
    const s = useBoard.getState();
    s.update(s.selectedIds, fn);
  };

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
      <button type="button" title="Undo rotation and mirroring" onClick={() => run(resetTransform)}>
        Reset
      </button>
      <span className="sep" />
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
