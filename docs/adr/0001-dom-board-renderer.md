# 1. Render the board with DOM elements and CSS transforms

Date: 2026-10-15 · Status: accepted

## Context

The board must pan, zoom and move images smoothly, and planned features include rotate, mirror, stretch,
invert, desaturate, layering and groups. Options were DOM + CSS transforms, Canvas 2D (Konva/Fabric),
WebGL (PixiJS) or a whiteboard SDK (tldraw/Excalidraw).

## Decision

Each image is an `<img>` inside one "world" element that carries a single `translate + scale` transform.

## Consequences

- Rotate/mirror/stretch are CSS `transform`; invert/desaturate are CSS `filter`. They are GPU-composited,
  non-destructive and need no code to rasterise.
- The browser handles image decoding (every format it supports), animated GIFs, hit-testing and accessibility.
- Expected to stay smooth into the hundreds of images. If boards reach thousands, the renderer in
  `src/board/` can be swapped for PixiJS without touching `src/core/`, the store, ingest or storage.
