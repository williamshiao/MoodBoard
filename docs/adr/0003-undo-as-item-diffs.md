# 3. Undo/redo as before/after item diffs

Date: 2026-10-15 · Status: accepted

## Decision

Every undoable action is stored as `{ before, after }` maps of the items it touched (`null` = absent),
in `src/core/history.ts`. Gestures update items live with `preview()` and record one step on release with
`commit()`, so a drag is one undo step, not hundreds.

## Consequences

Adds, removes, moves, resizes and future edits (rotate, filters, grouping) share one mechanism with no
per-command undo code. Removed images keep their bytes until the next launch so undo can restore them.
