# 4. Desktop app as a thin Tauri shell around the web build

Date: 2026-10-15 · Status: accepted

## Context

The web app stores images that a site blocks it from reading (CORS) as links, so they need the internet and
can break. Artists also want an app in their dock or Start menu that works offline. Electron would ship a
whole browser (~100 MB per install); Tauri 2 uses the system webview and installers are a few MB.

## Decision

Package the same Vite build with Tauri 2 (`src-tauri/`). The only behavioural difference lives in
`src/ingest/load.ts`: inside the desktop app, http(s) images are downloaded through Rust with
`tauri-plugin-http`, which no site can block, so dragged-in images are always stored locally. The plugin is
imported dynamically, so the web bundle doesn't carry it. The webview's own file drop handling is turned off
(`dragDropEnabled: false`) so the page receives normal HTML drag-and-drop, exactly as in a browser.

## Consequences

- One codebase and one test suite for web and desktop; the desktop app gets every web feature for free.
- CI lints the Rust crate (rustfmt, clippy) on every PR. Publishing a GitHub Release builds Windows, macOS
  (universal) and Linux installers and attaches them to the release (`.github/workflows/desktop.yml`).
- Installers are unsigned for now, so Windows SmartScreen and macOS Gatekeeper warn on first launch. Signing
  needs paid certificates and can be added to the release workflow later without code changes.
