import { create } from "zustand";
import { type BoardSettings, DEFAULT_SETTINGS, withSettingsDefaults } from "../core/background";
import { withGroups } from "../core/groups";
import { applySide, diff, type HistoryState, record } from "../core/history";
import { newId } from "../core/id";
import { type LayerMove, restack } from "../core/layers";
import { normalizeDegrees } from "../core/transform";
import { type BoardItem, ITEM_DEFAULTS, type Items, type View } from "../core/types";

type NewItem = Omit<BoardItem, "z" | "group" | keyof typeof ITEM_DEFAULTS>;

interface BoardState {
  items: Items;
  view: View;
  settings: BoardSettings;
  /** Selected item ids; the last one is the most recently selected. */
  selectedIds: readonly string[];
  history: HistoryState;

  /** Adds an item on top of everything else and selects it (undoable). */
  add(item: NewItem): void;
  /** Live update during a gesture; not recorded until `commit`. */
  preview(patches: Record<string, Partial<BoardItem>>): void;
  /** Records the change from `before` to the items' current state as one undo step. */
  commit(before: readonly BoardItem[]): void;
  /** Applies `fn` to each listed item as one undo step. */
  update(ids: readonly string[], fn: (item: BoardItem) => Partial<BoardItem>): void;
  /** Turns a colour filter on for every selected image, or off if they all have it (undoable). */
  toggleFilter(field: "invert" | "grayscale"): void;
  /** Moves the selected images up or down the stack (undoable). */
  restack(move: LayerMove): void;
  /** Joins the selected images (and any groups they belong to) into one group (undoable). */
  group(): void;
  /** Splits every group the selection touches back into single images (undoable). */
  ungroup(): void;
  remove(ids: readonly string[]): void;
  clear(): void;
  /** Selects one item and the rest of its group, or toggles them in or out when `toggle` is set. */
  select(id: string, toggle?: boolean): void;
  /** Selects one image on its own, even if it is grouped, so it can be edited alone. */
  selectSingle(id: string): void;
  selectOnly(ids: readonly string[]): void;
  setView(view: View): void;
  /** Background color and grid pattern. Saved with the board; not an undo step. */
  setSettings(patch: Partial<BoardSettings>): void;
  /** Replaces the whole board (restore or import); history starts fresh. */
  load(items: Items, view: View, settings?: BoardSettings): void;
  undo(): void;
  redo(): void;
}

const topZ = (items: Items) => Object.values(items).reduce((m, i) => Math.max(m, i.z), 0);

/** Transform actions shared by the toolbar and keyboard shortcuts. */
export const flipX = (i: BoardItem) => ({ flipX: !i.flipX });
export const flipY = (i: BoardItem) => ({ flipY: !i.flipY });
export const rotateBy = (deg: number) => (i: BoardItem) => ({ rotation: normalizeDegrees(i.rotation + deg) });
export const resetEdits = () => ({ ...ITEM_DEFAULTS });

export const useBoard = create<BoardState>()((set, get) => {
  /** Applies `updates` to the items and records them as one undo step. */
  const change = (updates: Record<string, BoardItem | null>) => {
    const { items, history } = get();
    const c = diff(items, updates);
    set({ items: applySide(items, c.after), history: record(history, c) });
  };
  /** Drops selected ids whose items no longer exist (after undo, redo or remove). */
  const pruneSelection = () => {
    const { items, selectedIds } = get();
    const kept = selectedIds.filter((id) => items[id]);
    if (kept.length !== selectedIds.length) set({ selectedIds: kept });
  };

  return {
    items: {},
    view: { x: 0, y: 0, zoom: 1 },
    settings: DEFAULT_SETTINGS,
    selectedIds: [],
    history: { past: [], future: [] },

    add(item) {
      change({ [item.id]: { ...ITEM_DEFAULTS, ...item, group: null, z: topZ(get().items) + 1 } });
      set({ selectedIds: [item.id] });
    },

    preview(patches) {
      const next = { ...get().items };
      for (const [id, patch] of Object.entries(patches)) {
        const item = next[id];
        if (item) next[id] = { ...item, ...patch };
      }
      set({ items: next });
    },

    commit(before) {
      const { items, history } = get();
      const c = {
        before: {} as Record<string, BoardItem | null>,
        after: {} as Record<string, BoardItem | null>,
      };
      for (const b of before) {
        const now = items[b.id];
        if (!now) continue;
        c.before[b.id] = b;
        c.after[b.id] = now;
      }
      set({ history: record(history, c) });
    },

    update(ids, fn) {
      const { items } = get();
      const updates: Record<string, BoardItem> = {};
      for (const id of ids) {
        const item = items[id];
        if (item) updates[id] = { ...item, ...fn(item) };
      }
      if (Object.keys(updates).length) change(updates);
    },

    toggleFilter(field) {
      const { items, selectedIds } = get();
      const allOn = selectedIds.every((id) => items[id]?.[field]);
      get().update(selectedIds, () => ({ [field]: !allOn }));
    },

    restack(move) {
      const { items, selectedIds } = get();
      const z = restack(items, selectedIds, move);
      get().update(Object.keys(z), (i) => ({ z: z[i.id] ?? i.z }));
    },

    group() {
      const { items, selectedIds } = get();
      const ids = withGroups(items, selectedIds);
      if (ids.length < 2) return;
      const group = newId();
      get().update(ids, () => ({ group }));
      set({ selectedIds: ids });
    },

    ungroup() {
      const { items, selectedIds } = get();
      const ids = withGroups(items, selectedIds).filter((id) => items[id]?.group);
      get().update(ids, () => ({ group: null }));
    },

    remove(ids) {
      const updates: Record<string, null> = {};
      for (const id of ids) if (get().items[id]) updates[id] = null;
      if (!Object.keys(updates).length) return;
      change(updates);
      pruneSelection();
    },

    clear() {
      get().remove(Object.keys(get().items));
    },

    select(id, toggle = false) {
      const { items, selectedIds } = get();
      if (!items[id]) return;
      const ids = withGroups(items, [id]);
      if (toggle && selectedIds.includes(id)) {
        set({ selectedIds: selectedIds.filter((s) => !ids.includes(s)) });
        return;
      }
      set({ selectedIds: toggle ? [...new Set([...selectedIds, ...ids])] : ids });
    },

    selectSingle(id) {
      if (get().items[id]) set({ selectedIds: [id] });
    },

    selectOnly(ids) {
      set({ selectedIds: ids.filter((id) => get().items[id]) });
    },

    setView(view) {
      set({ view });
    },

    setSettings(patch) {
      set({ settings: { ...get().settings, ...patch } });
    },

    load(items, view, settings) {
      set({
        items,
        view,
        settings: withSettingsDefaults(settings),
        selectedIds: [],
        history: { past: [], future: [] },
      });
    },

    undo() {
      const { items, history } = get();
      const c = history.past.at(-1);
      if (!c) return;
      set({
        items: applySide(items, c.before),
        history: { past: history.past.slice(0, -1), future: [...history.future, c] },
      });
      pruneSelection();
    },

    redo() {
      const { items, history } = get();
      const c = history.future.at(-1);
      if (!c) return;
      set({
        items: applySide(items, c.after),
        history: { past: [...history.past, c], future: history.future.slice(0, -1) },
      });
      pruneSelection();
    },
  };
});
