import { type PointerEvent, useEffect, useRef, useState, type WheelEvent } from "react";
import { backgroundStyle } from "../core/background";
import { screenToWorld, zoomAt } from "../core/geometry";
import {
  centerOf,
  HANDLES,
  type Handle,
  rectsIntersect,
  resizeWithHandle,
  rotatedBounds,
  rotationToward,
} from "../core/transform";
import type { BoardItem, Point, Rect, View } from "../core/types";
import { useBoard } from "../store/board";
import { ItemView } from "./ItemView";

type Gesture =
  | { kind: "pan"; start: Point; view: View }
  | { kind: "move"; start: Point; before: BoardItem[] }
  | { kind: "resize"; start: Point; before: BoardItem; handle: Handle }
  | { kind: "rotate"; before: BoardItem }
  | { kind: "marquee"; origin: Point; base: readonly string[] };

const normalizeRect = (a: Point, b: Point): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(a.x - b.x),
  h: Math.abs(a.y - b.y),
});

export function Board() {
  const view = useBoard((s) => s.view);
  const settings = useBoard((s) => s.settings);
  // Only the id list matters here; ItemView subscribes to each item's details.
  const ids = useBoard((s) => Object.keys(s.items).join(","));
  const gesture = useRef<Gesture | null>(null);
  const [panning, setPanning] = useState(false);
  const [marquee, setMarquee] = useState<Rect | null>(null);
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
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;

    if (item && target.dataset.role === "delete") {
      s.remove(s.selectedIds.includes(item.id) ? s.selectedIds : [item.id]);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);

    // Middle button pans from anywhere; left button on empty space pans, or draws a selection box with Shift.
    if (!item || e.button === 1) {
      if (e.button === 0 && e.shiftKey) {
        gesture.current = { kind: "marquee", origin: screenToWorld(s.view, start), base: s.selectedIds };
        return;
      }
      s.selectOnly([]);
      gesture.current = { kind: "pan", start, view: s.view };
      setPanning(true);
      return;
    }

    const handle = target.dataset.handle ? HANDLES[target.dataset.handle] : undefined;
    if (handle) {
      gesture.current = { kind: "resize", start, before: item, handle };
      return;
    }
    if (target.dataset.role === "rotate") {
      gesture.current = { kind: "rotate", before: item };
      return;
    }
    if (additive) {
      s.select(item.id, true);
      return;
    }
    // Clicking an image outside the selection selects just it; inside, it drags the whole selection.
    if (!s.selectedIds.includes(item.id)) s.select(item.id);
    const { items, selectedIds } = useBoard.getState();
    const before = selectedIds.flatMap((id) => (items[id] ? [items[id]] : []));
    gesture.current = { kind: "move", start, before };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g) return;
    const s = useBoard.getState();
    const pointer = { x: e.clientX, y: e.clientY };

    switch (g.kind) {
      case "pan":
        s.setView({ ...g.view, x: g.view.x + pointer.x - g.start.x, y: g.view.y + pointer.y - g.start.y });
        break;
      case "move": {
        const dx = (pointer.x - g.start.x) / s.view.zoom;
        const dy = (pointer.y - g.start.y) / s.view.zoom;
        s.preview(Object.fromEntries(g.before.map((i) => [i.id, { x: i.x + dx, y: i.y + dy }])));
        break;
      }
      case "resize": {
        const delta = { x: (pointer.x - g.start.x) / s.view.zoom, y: (pointer.y - g.start.y) / s.view.zoom };
        s.preview({ [g.before.id]: resizeWithHandle(g.before, g.handle, delta, e.shiftKey) });
        break;
      }
      case "rotate": {
        const rotation = rotationToward(centerOf(g.before), screenToWorld(s.view, pointer), e.shiftKey);
        s.preview({ [g.before.id]: { rotation } });
        break;
      }
      case "marquee": {
        const rect = normalizeRect(g.origin, screenToWorld(s.view, pointer));
        setMarquee(rect);
        const hits = Object.values(s.items)
          .filter((i) => rectsIntersect(rect, rotatedBounds(i)))
          .map((i) => i.id);
        s.selectOnly([...new Set([...g.base, ...hits])]);
        break;
      }
    }
  }

  function endGesture() {
    const g = gesture.current;
    gesture.current = null;
    setPanning(false);
    setMarquee(null);
    if (!g) return;
    const { commit } = useBoard.getState();
    if (g.kind === "move") commit(g.before);
    else if (g.kind === "resize" || g.kind === "rotate") commit([g.before]);
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
        {marquee && (
          <div
            className="marquee"
            data-testid="marquee"
            style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
          />
        )}
      </div>
    </div>
  );
}
