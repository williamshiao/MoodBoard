import { type PointerEvent, useEffect, useRef, useState, type WheelEvent } from "react";
import { backgroundStyle } from "../core/background";
import { resizeFromCorner, zoomAt } from "../core/geometry";
import type { BoardItem, View } from "../core/types";
import { useBoard } from "../store/board";
import { ItemView } from "./ItemView";

type Gesture =
  | { kind: "pan"; start: { x: number; y: number }; view: View }
  | { kind: "move" | "resize"; start: { x: number; y: number }; item: BoardItem };

export function Board() {
  const view = useBoard((s) => s.view);
  const settings = useBoard((s) => s.settings);
  // Only the id list matters here; ItemView subscribes to each item's details.
  const ids = useBoard((s) => Object.keys(s.items).join(","));
  const gesture = useRef<Gesture | null>(null);
  const [panning, setPanning] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  // React's onWheel is passive, so zoom needs a native listener to stop the page scrolling.
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const onWheel = (e: globalThis.WheelEvent) => e.preventDefault();
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onWheel(e: WheelEvent) {
    // Trackpad pinch arrives as ctrl+wheel with small deltas, so it gets a stronger factor.
    const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
    const s = useBoard.getState();
    s.setView(zoomAt(s.view, { x: e.clientX, y: e.clientY }, factor));
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button === 2) return;
    const s = useBoard.getState();
    const target = e.target as HTMLElement;
    const itemEl = target.closest<HTMLElement>(".item");
    const item = itemEl?.dataset.id ? s.items[itemEl.dataset.id] : undefined;
    const start = { x: e.clientX, y: e.clientY };

    if (item && target.dataset.role === "delete") {
      s.remove(item.id);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    if (item && e.button === 0) {
      s.select(item.id);
      // Read back after select() so the snapshot includes the raised z-order.
      const fresh = useBoard.getState().items[item.id] ?? item;
      gesture.current = { kind: target.dataset.role === "resize" ? "resize" : "move", start, item: fresh };
    } else {
      s.select(null);
      gesture.current = { kind: "pan", start, view: s.view };
      setPanning(true);
    }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g) return;
    const s = useBoard.getState();
    const dx = e.clientX - g.start.x;
    const dy = e.clientY - g.start.y;
    if (g.kind === "pan") {
      s.setView({ ...g.view, x: g.view.x + dx, y: g.view.y + dy });
    } else if (g.kind === "move") {
      s.preview(g.item.id, { x: g.item.x + dx / s.view.zoom, y: g.item.y + dy / s.view.zoom });
    } else {
      s.preview(g.item.id, resizeFromCorner(g.item, dx / s.view.zoom, dy / s.view.zoom, e.shiftKey));
    }
  }

  function endGesture() {
    const g = gesture.current;
    gesture.current = null;
    setPanning(false);
    if (g && g.kind !== "pan") useBoard.getState().commit(g.item);
  }

  return (
    <div
      ref={boardRef}
      className={`board${panning ? " panning" : ""}`}
      data-testid="board"
      style={backgroundStyle(settings, view)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onWheel={onWheel}
    >
      <div
        className="world"
        style={
          {
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
            "--inv": 1 / view.zoom,
          } as React.CSSProperties
        }
      >
        {ids ? ids.split(",").map((id) => <ItemView key={id} id={id} />) : null}
      </div>
    </div>
  );
}
