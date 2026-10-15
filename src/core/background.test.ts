import { describe, expect, it } from "vitest";
import { backgroundStyle, DEFAULT_SETTINGS, gridColor, isHexColor, isLight, luminance } from "./background";

const view = { x: 10, y: 20, zoom: 1 };

describe("luminance", () => {
  it("spans black to white", () => {
    expect(luminance("#000000")).toBe(0);
    expect(luminance("#ffffff")).toBeCloseTo(1);
  });
  it("classifies light and dark boards", () => {
    expect(isLight("#1b1b1e")).toBe(false);
    expect(isLight("#f4f1ea")).toBe(true);
  });
});

describe("gridColor", () => {
  it("uses white on dark and black on light backgrounds", () => {
    expect(gridColor("#1b1b1e")).toMatch(/^rgb\(255 255 255/);
    expect(gridColor("#ffffff")).toMatch(/^rgb\(0 0 0/);
  });
});

describe("isHexColor", () => {
  it("accepts only #rrggbb", () => {
    expect(isHexColor("#a1B2c3")).toBe(true);
    expect(isHexColor("red")).toBe(false);
    expect(isHexColor("#fff")).toBe(false);
  });
});

describe("backgroundStyle", () => {
  it("draws dots by default and follows the pan offset", () => {
    const s = backgroundStyle(DEFAULT_SETTINGS, view);
    expect(s.backgroundColor).toBe("#1b1b1e");
    expect(s.backgroundImage).toContain("radial-gradient");
    expect(s.backgroundSize).toBe("24px 24px");
  });

  it("scales the grid with zoom", () => {
    expect(backgroundStyle({ ...DEFAULT_SETTINGS, grid: "lines" }, { ...view, zoom: 2 }).backgroundSize).toBe(
      "48px 48px",
    );
  });

  it("adds major lines for graph paper", () => {
    const s = backgroundStyle({ ...DEFAULT_SETTINGS, grid: "graph" }, view);
    expect(s.backgroundImage?.match(/linear-gradient/g)).toHaveLength(4);
    expect(s.backgroundSize).toContain("120px 120px");
  });

  it("draws nothing for no grid, or when zoomed out so far it would be noise", () => {
    expect(backgroundStyle({ ...DEFAULT_SETTINGS, grid: "none" }, view).backgroundImage).toBeUndefined();
    expect(backgroundStyle(DEFAULT_SETTINGS, { ...view, zoom: 0.1 }).backgroundImage).toBeUndefined();
  });
});
