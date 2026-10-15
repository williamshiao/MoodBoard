# MoodBoard

A fast, lightweight mood board for artists. Drop images from anywhere (files, Google Images, any web page,
the clipboard) and arrange them on an infinite canvas.

![CI](../../actions/workflows/ci.yml/badge.svg)

## Features

- Drag and drop image files or images from any web page, or paste with Ctrl+V
- Move, resize from 8 handles (corners keep proportions, sides stretch), rotate (Shift snaps to 15°), mirror (H / V), delete
- Invert colours (I) and desaturate (D) without changing the original image
- Layering: bring to front or forward, send backward or to back (Ctrl+] / Ctrl+[, add Shift for front/back)
- Select several images with Shift+click, Shift+drag or Ctrl+A, then move, mirror, rotate or delete them together
- Group images (Ctrl+G) so they select and move as one; double-click picks one out, Ctrl+Shift+G ungroups
- Snapping: dragged images line up with the edges and centres of others, with guide lines (toggle with Snap,
  or hold Alt to skip it for one drag)
- Pan by dragging empty space, zoom toward the cursor with the wheel or a pinch, press F to fit everything
- Undo/redo for every change (Ctrl+Z / Ctrl+Shift+Z)
- Board settings: any background color, and a dots, lines, graph-paper or blank grid
- Autosaves in the browser. Export/Import a portable `.moodboard` file (zip of board.json + original images)

## Stack

| | |
|---|---|
| Language | TypeScript (strict) |
| UI | React 19 for the toolbar; the board is plain DOM + CSS transforms ([ADR 1](docs/adr/0001-dom-board-renderer.md)) |
| State | Zustand, with undo/redo as item diffs ([ADR 3](docs/adr/0003-undo-as-item-diffs.md)) |
| Storage | IndexedDB (`idb`); `.moodboard` files via `fflate` + `zod/mini` |
| Tooling | Vite, pnpm, Biome, Vitest, Playwright, size-limit |
| Delivery | Static site on GitHub Pages, no backend ([ADR 2](docs/adr/0002-static-web-app-first.md)) |

## Architecture

```
src/
  core/      pure TypeScript: types, geometry, undo history. No DOM or React.
  store/     Zustand board store (items, view, selection, history)
  ingest/    drop/paste → image sources → bytes or links
  storage/   IndexedDB and in-memory image cache
  io/        .moodboard file format
  board/     the canvas: pan, zoom, move, resize
  ui/        toolbar, hint, toast
  app/       actions wiring the pieces together
```

## Development

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm check        # Biome lint + format
pnpm typecheck
pnpm test         # unit tests
pnpm test:e2e     # browser tests (run `pnpm exec playwright install` once)
pnpm build && pnpm size
```

## Pipeline

- **CI** (every PR and push to `main`): lint, typecheck, unit tests, production build, bundle-size budget,
  and Playwright tests in Chromium and Firefox.
- **Deploy** (push to `main`): builds and publishes to GitHub Pages. Enable it once under
  Settings → Pages → Source: GitHub Actions.
- **Dependabot** keeps dependencies and actions current.

## Roadmap

1. ~~Foundation: project, prototype port, undo/redo, CI and deploy~~
2. ~~Board settings: background color and grid patterns~~
3. ~~Transform tools: multi-select, 8-handle resize/stretch, rotate, mirror~~
4. ~~Look tools: invert, desaturate, layering~~
5. ~~Organizing: snapping guides (toggle) and groups~~
6. Desktop: Tauri 2 build with native image download
7. Polish: offline install (PWA), export as PNG, shortcut sheet, performance pass
