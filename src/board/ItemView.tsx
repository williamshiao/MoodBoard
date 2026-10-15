import { memo } from "react";
import { HANDLES } from "../core/transform";
import { srcFor } from "../storage/images";
import { useBoard } from "../store/board";

const RESIZE_CURSORS = ["ns-resize", "nesw-resize", "ew-resize", "nwse-resize"];
/** Direction each handle points, in degrees clockwise from up. */
const HANDLE_ANGLES: Record<string, number> = {
  n: 0,
  ne: 45,
  e: 90,
  se: 135,
  s: 180,
  sw: 225,
  w: 270,
  nw: 315,
};

/** The resize cursor that matches a handle's direction once the image is rotated. */
const cursorFor = (name: string, rotation: number) =>
  RESIZE_CURSORS[Math.round(((HANDLE_ANGLES[name] ?? 0) + rotation) / 45) % 4];

/** CSS filter for an image's colour edits; the original pixels are never changed. */
const filterFor = (item: { invert: boolean; grayscale: boolean }) =>
  [item.invert && "invert(1)", item.grayscale && "grayscale(1)"].filter(Boolean).join(" ") || undefined;

/** One image on the board. Subscribes only to its own item, so dragging one image re-renders one image. */
export const ItemView = memo(function ItemView({ id }: { id: string }) {
  const item = useBoard((s) => s.items[id]);
  const selected = useBoard((s) => s.selectedIds.includes(id));
  // Handles only make sense for a single image; groups of images just move together.
  const editing = useBoard((s) => s.selectedIds.length === 1 && s.selectedIds[0] === id);
  if (!item) return null;
  const linked = item.source.kind === "url";

  return (
    <div
      className={`item${selected ? " selected" : ""}`}
      data-id={id}
      data-testid="board-item"
      title={linked ? "Linked image: the site blocked copying, so it needs the internet" : undefined}
      style={
        {
          left: item.x,
          top: item.y,
          width: item.w,
          height: item.h,
          zIndex: item.z,
          transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
          ...(item.rotation ? { "--unrotate": `${-item.rotation}deg` } : {}),
        } as React.CSSProperties
      }
    >
      <img
        src={srcFor(item)}
        alt=""
        draggable={false}
        decoding="async"
        style={{
          transform:
            item.flipX || item.flipY ? `scale(${item.flipX ? -1 : 1}, ${item.flipY ? -1 : 1})` : undefined,
          filter: filterFor(item),
        }}
      />
      {linked && <span className="linked">linked</span>}
      <button type="button" className="del" data-role="delete" aria-label="Remove image" title="Remove (Del)">
        ×
      </button>
      {editing && (
        <>
          <div className="rotate-handle" data-role="rotate" title="Rotate (Shift snaps to 15°)" />
          {Object.entries(HANDLES).map(([name, h]) => (
            <div
              key={name}
              className="handle"
              data-handle={name}
              title={name.length === 2 ? "Resize (Shift to stretch freely)" : "Stretch"}
              style={{
                left: `${((h.hx + 1) / 2) * 100}%`,
                top: `${((h.hy + 1) / 2) * 100}%`,
                cursor: cursorFor(name, item.rotation),
              }}
            />
          ))}
        </>
      )}
    </div>
  );
});
