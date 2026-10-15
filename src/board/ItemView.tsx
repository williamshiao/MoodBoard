import { memo } from "react";
import { srcFor } from "../storage/images";
import { useBoard } from "../store/board";

/** One image on the board. Subscribes only to its own item, so dragging one image re-renders one image. */
export const ItemView = memo(function ItemView({ id }: { id: string }) {
  const item = useBoard((s) => s.items[id]);
  const selected = useBoard((s) => s.selectedId === id);
  if (!item) return null;
  const linked = item.source.kind === "url";

  return (
    <div
      className={`item${selected ? " selected" : ""}`}
      data-id={id}
      data-testid="board-item"
      title={linked ? "Linked image: the site blocked copying, so it needs the internet" : undefined}
      style={{ left: item.x, top: item.y, width: item.w, height: item.h, zIndex: item.z }}
    >
      <img src={srcFor(item)} alt="" draggable={false} decoding="async" />
      {linked && <span className="linked">linked</span>}
      <button type="button" className="del" data-role="delete" aria-label="Remove image" title="Remove (Del)">
        ×
      </button>
      <div className="grip" data-role="resize" />
    </div>
  );
});
