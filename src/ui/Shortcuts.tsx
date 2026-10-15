import { useEffect } from "react";
import { create } from "zustand";

/** Whether the shortcut sheet is open; toggled by the ? key and the toolbar button. */
export const useShortcutSheet = create<{ open: boolean }>()(() => ({ open: false }));
export const toggleShortcutSheet = () => useShortcutSheet.setState((s) => ({ open: !s.open }));
const close = () => useShortcutSheet.setState({ open: false });

const SECTIONS: [title: string, rows: [keys: string, action: string][]][] = [
  [
    "Images",
    [
      ["Drop or Ctrl+V", "Add images"],
      ["Del", "Remove"],
      ["H / V", "Mirror left-right / top-bottom"],
      ["R / Shift+R", "Rotate 90° clockwise / counter-clockwise"],
      ["I / D", "Invert / desaturate"],
      ["Ctrl+] / Ctrl+[", "Bring forward / send backward"],
      ["Ctrl+Shift+] / [", "Bring to front / send to back"],
      ["Ctrl+G / Ctrl+Shift+G", "Group / ungroup"],
      ["Double-click", "Pick one image out of a group"],
    ],
  ],
  [
    "Selecting",
    [
      ["Shift+click", "Add to or remove from the selection"],
      ["Shift+drag", "Select with a box"],
      ["Ctrl+A", "Select everything"],
      ["Esc", "Deselect"],
    ],
  ],
  [
    "While dragging",
    [
      ["Shift on a corner", "Stretch freely"],
      ["Shift on the rotate handle", "Snap to 15°"],
      ["Alt", "Don't snap to other images"],
    ],
  ],
  [
    "Board",
    [
      ["Drag empty space", "Pan (or drag with the middle button)"],
      ["Wheel or pinch", "Zoom"],
      ["F / Ctrl+0", "Fit everything / zoom to 100%"],
      ["Ctrl+Z / Ctrl+Shift+Z", "Undo / redo"],
      ["?", "Show this sheet"],
    ],
  ],
];

/** Every keyboard and mouse shortcut on one sheet. */
export function Shortcuts() {
  const open = useShortcutSheet((s) => s.open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: clicking the backdrop is a mouse convenience; Esc and the Close button cover the keyboard.
    // biome-ignore lint/a11y/useKeyWithClickEvents: as above.
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
        <header>
          <h2>Shortcuts</h2>
          <button type="button" onClick={close}>
            Close
          </button>
        </header>
        <div className="sheet-columns">
          {SECTIONS.map(([title, rows]) => (
            <section key={title}>
              <h3>{title}</h3>
              <dl>
                {rows.map(([keys, action]) => (
                  <div key={keys}>
                    <dt>{keys}</dt>
                    <dd>{action}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
