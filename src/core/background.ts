import type { View } from "./types";

export const GRID_PATTERNS = ["dots", "lines", "graph", "none"] as const;
export type GridPattern = (typeof GRID_PATTERNS)[number];

export interface BoardSettings {
  /** Board background as a #rrggbb hex color. */
  background: string;
  grid: GridPattern;
}

export const DEFAULT_SETTINGS: BoardSettings = { background: "#1b1b1e", grid: "dots" };

/** Preset backgrounds offered as one-click swatches. */
export const BACKGROUND_PRESETS = [
  "#1b1b1e",
  "#2b2d42",
  "#3a3f3a",
  "#5a5a5a",
  "#d9d6cf",
  "#f4f1ea",
  "#ffffff",
];

/** Grid spacing in world units; "graph" adds a heavier line every GRAPH_MAJOR cells. */
export const GRID_SIZE = 24;
export const GRAPH_MAJOR = 5;

const HEX = /^#([0-9a-f]{6})$/i;

export const isHexColor = (c: string) => HEX.test(c);

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(HEX.exec(hex)?.[1] ?? "000000", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const isLight = (hex: string) => luminance(hex) > 0.35;

/** A subtle grid color that reads on the background: white on dark boards, black on light ones. */
export function gridColor(hex: string, strength = 1): string {
  const alpha = (isLight(hex) ? 0.13 : 0.09) * strength;
  return isLight(hex) ? `rgb(0 0 0 / ${alpha.toFixed(3)})` : `rgb(255 255 255 / ${alpha.toFixed(3)})`;
}

export interface BackgroundStyle {
  backgroundColor: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
}

/**
 * CSS background properties that draw `settings.grid` on `settings.background`,
 * scaled and offset so the grid moves with the board as it pans and zooms.
 */
export function backgroundStyle(settings: BoardSettings, view: View): BackgroundStyle {
  const size = GRID_SIZE * view.zoom;
  const base = { backgroundColor: settings.background };
  const minor = gridColor(settings.background);
  // Below this on-screen spacing a grid turns to noise, so fade it out.
  if (settings.grid === "none" || size < 6) return base;

  const position = `${view.x}px ${view.y}px`;
  const dot = Math.max(1, Math.min(2, view.zoom));
  switch (settings.grid) {
    case "dots":
      return {
        ...base,
        backgroundImage: `radial-gradient(circle, ${gridColor(settings.background, 1.6)} ${dot}px, transparent ${dot}px)`,
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: `${view.x - size / 2}px ${view.y - size / 2}px`,
      };
    case "lines":
      return {
        ...base,
        backgroundImage: `linear-gradient(${minor} 1px, transparent 1px), linear-gradient(90deg, ${minor} 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: position,
      };
    case "graph": {
      const major = gridColor(settings.background, 2.2);
      const big = size * GRAPH_MAJOR;
      return {
        ...base,
        backgroundImage: [
          `linear-gradient(${major} 1px, transparent 1px)`,
          `linear-gradient(90deg, ${major} 1px, transparent 1px)`,
          `linear-gradient(${minor} 1px, transparent 1px)`,
          `linear-gradient(90deg, ${minor} 1px, transparent 1px)`,
        ].join(", "),
        backgroundSize: `${big}px ${big}px, ${big}px ${big}px, ${size}px ${size}px, ${size}px ${size}px`,
        backgroundPosition: position,
      };
    }
  }
}
