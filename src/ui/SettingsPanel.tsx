import { useEffect, useRef } from "react";
import { BACKGROUND_PRESETS, GRID_PATTERNS, type GridPattern, isHexColor } from "../core/background";
import { useBoard } from "../store/board";

const PATTERN_LABELS: Record<GridPattern, string> = {
  dots: "Dots",
  lines: "Lines",
  graph: "Graph",
  none: "None",
};

/** Background color and grid pattern for the current board. */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useBoard((s) => s.settings);
  const setSettings = useBoard((s) => s.setSettings);
  const ref = useRef<HTMLDivElement>(null);
  const custom = !BACKGROUND_PRESETS.includes(settings.background);

  // Close on Escape or a click anywhere outside the panel and its toolbar button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element;
      if (!ref.current?.contains(t) && !t.closest("[data-settings-toggle]")) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [onClose]);

  return (
    <div className="settings" ref={ref} role="dialog" aria-label="Board settings">
      <section>
        <h2>Background</h2>
        <div className="swatches">
          {BACKGROUND_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              className="swatch"
              style={{ background: color }}
              aria-label={`Background ${color}`}
              aria-pressed={settings.background === color}
              onClick={() => setSettings({ background: color })}
            />
          ))}
          <label
            className="custom-color"
            title="Pick any color"
            style={custom ? { background: settings.background, borderStyle: "solid" } : undefined}
          >
            {custom ? "" : "+"}
            <input
              type="color"
              aria-label="Custom background color"
              value={settings.background}
              onChange={(e) => isHexColor(e.target.value) && setSettings({ background: e.target.value })}
            />
          </label>
        </div>
      </section>
      <section>
        <h2>Grid</h2>
        <div className="patterns">
          {GRID_PATTERNS.map((grid) => (
            <button
              key={grid}
              type="button"
              aria-pressed={settings.grid === grid}
              onClick={() => setSettings({ grid })}
            >
              {PATTERN_LABELS[grid]}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
