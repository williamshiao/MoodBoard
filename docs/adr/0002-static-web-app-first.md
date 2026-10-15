# 2. Ship as a static web app first, desktop later

Date: 2026-10-15 · Status: accepted

## Context

There is no server-side need: boards live on the user's machine. Browsers can display images dragged in
from other sites, but many sites block reading their bytes (CORS), so those images can only be stored as links.

## Decision

Build a static, installable web app with no backend, hosted on GitHub Pages. Images that can't be copied are
kept as links and marked "linked". A Tauri 2 desktop build comes later; its native fetch removes the CORS limit.

## Consequences

- No servers, containers or orchestration to run or pay for. Docker and Kubernetes are deliberately not used.
- All image loading goes through `src/ingest/load.ts`, the one place the desktop build will change.
