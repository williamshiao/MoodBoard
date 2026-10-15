import { create } from "zustand";
import { applySide, diff, type HistoryState, record } from "../core/history";
import type { BoardItem, Items, View } from "../core/types";

interface BoardState {
  items: Items;
  view: View;
  selectedId: string | null;
  history: HistoryState;

  /** Adds an item on top of everything else (undoable). */
  add(item: Omit<BoardItem, "z">): void;
  /** Live update during a gesture; not recorded until `commit`. */
  preview(id: string, patch: Partial<BoardItem>): void;
  /** Records the change from `before` to the item's current state as one undo step. */
  commit(before: BoardItem): void;
  remove(id: string): void;
  clear(): void;
  select(id: string | null): void;
  setView(view: View): void;
  /** Replaces the whole board (restore or import); history starts fresh. */
  load(items: Items, view: View): void;
  undo(): void;
  redo(): void;
}

const topZ = (items: Items) => Object.values(items).reduce((m, i) => Math.max(m, i.z), 0);

export const useBoard = create<BoardState>()((set, get) => {
  /** Applies `updates` to the items and records them as one undo step. */
  const change = (updates: Record<string, BoardItem | null>) => {
    const { items, history } = get();
    const c = diff(items, updates);
    set({ items: applySide(items, c.after), history: record(history, c) });
  };

  return {
    items: {},
    view: { x: 0, y: 0, zoom: 1 },
    selectedId: null,
    history: { past: [], future: [] },

    add(item) {
      change({ [item.id]: { ...item, z: topZ(get().items) + 1 } });
      set({ selectedId: item.id });
    },

    preview(id, patch) {
      const item = get().items[id];
      if (item) set({ items: { ...get().items, [id]: { ...item, ...patch } } });
    },

    commit(before) {
      const { items, history } = get();
      const now = items[before.id];
      if (!now) return;
      set({ history: record(history, { before: { [before.id]: before }, after: { [before.id]: now } }) });
    },

    remove(id) {
      if (!get().items[id]) return;
      change({ [id]: null });
      if (get().selectedId === id) set({ selectedId: null });
    },

    clear() {
      const updates: Record<string, null> = {};
      for (const id of Object.keys(get().items)) updates[id] = null;
      change(updates);
      set({ selectedId: null });
    },

    select(id) {
      const { items } = get();
      const item = id ? items[id] : undefined;
      // Selecting raises the image to the top. This is not an undo step on its own.
      if (item && item.z !== topZ(items))
        set({ items: { ...items, [item.id]: { ...item, z: topZ(items) + 1 } } });
      set({ selectedId: id });
    },

    setView(view) {
      set({ view });
    },

    load(items, view) {
      set({ items, view, selectedId: null, history: { past: [], future: [] } });
    },

    undo() {
      const { items, history } = get();
      const c = history.past.at(-1);
      if (!c) return;
      set({
        items: applySide(items, c.before),
        history: { past: history.past.slice(0, -1), future: [...history.future, c] },
        selectedId: null,
      });
    },

    redo() {
      const { items, history } = get();
      const c = history.future.at(-1);
      if (!c) return;
      set({
        items: applySide(items, c.after),
        history: { past: [...history.past, c], future: history.future.slice(0, -1) },
        selectedId: null,
      });
    },
  };
});
