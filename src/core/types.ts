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
}

/** The transform fields, which boards saved before they existed are missing. */
export const TRANSFORM_DEFAULTS = { rotation: 0, flipX: false, flipY: false } as const;

/** Fills in transform fields for items saved by older versions. */
export function withTransformDefaults(
  item: Omit<BoardItem, keyof typeof TRANSFORM_DEFAULTS> & {
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
  },
): BoardItem {
  return {
    ...item,
    rotation: item.rotation ?? TRANSFORM_DEFAULTS.rotation,
    flipX: item.flipX ?? TRANSFORM_DEFAULTS.flipX,
    flipY: item.flipY ?? TRANSFORM_DEFAULTS.flipY,
  };
}

export type Items = Readonly<Record<string, BoardItem>>;
