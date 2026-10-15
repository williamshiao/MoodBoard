export interface Point {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

export interface Rect extends Point, Size {}

/** Pan offset (screen px) and zoom factor: screen = world * zoom + (x, y). */
export interface View extends Point {
  zoom: number;
}

/**
 * Where an image's pixels live. "blob" images are stored locally and work offline;
 * "url" images could not be copied (the site blocked it) and are shown by link.
 */
export type ImageSource = { kind: "blob" } | { kind: "url"; url: string };

export interface BoardItem extends Rect {
  id: string;
  source: ImageSource;
  /** Stacking order; higher draws on top. */
  z: number;
  /** Clockwise rotation in degrees around the image's centre, 0 to 360. */
  rotation: number;
  /** Mirrored left-to-right / top-to-bottom. */
  flipX: boolean;
  flipY: boolean;
  /** Colour filters, applied on top of the original pixels (which are never changed). */
  invert: boolean;
  grayscale: boolean;
}

/** Defaults for the edit fields, which boards saved by older versions may be missing. */
export const ITEM_DEFAULTS = {
  rotation: 0,
  flipX: false,
  flipY: false,
  invert: false,
  grayscale: false,
} as const;

type EditFields = keyof typeof ITEM_DEFAULTS;

/** Fills in edit fields for items saved by older versions. */
export function withItemDefaults(
  item: Omit<BoardItem, EditFields> & { [K in EditFields]?: BoardItem[K] | undefined },
): BoardItem {
  return {
    ...item,
    rotation: item.rotation ?? ITEM_DEFAULTS.rotation,
    flipX: item.flipX ?? ITEM_DEFAULTS.flipX,
    flipY: item.flipY ?? ITEM_DEFAULTS.flipY,
    invert: item.invert ?? ITEM_DEFAULTS.invert,
    grayscale: item.grayscale ?? ITEM_DEFAULTS.grayscale,
  };
}

export type Items = Readonly<Record<string, BoardItem>>;
