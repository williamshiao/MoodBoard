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
}

export type Items = Readonly<Record<string, BoardItem>>;
