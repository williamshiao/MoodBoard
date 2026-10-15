import { afterEach, describe, expect, it, vi } from "vitest";

const nativeFetch = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/plugin-http", () => ({ fetch: nativeFetch }));

import { loadSource } from "./load";

const png = () => new Response(new Uint8Array([1]), { headers: { "content-type": "image/png" } });
const url = "https://blocked.test/a.png";

afterEach(() => {
  vi.unstubAllGlobals();
  nativeFetch.mockReset();
  delete (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
});

describe("loadSource", () => {
  it("keeps an image as a link when the site blocks the browser from reading it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("CORS")));
    expect(await loadSource({ type: "url", url })).toEqual({ kind: "url", url });
    expect(nativeFetch).not.toHaveBeenCalled();
  });

  it("downloads through the desktop app instead, which sites can't block", async () => {
    (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("CORS")));
    nativeFetch.mockResolvedValue(png());
    const loaded = await loadSource({ type: "url", url });
    expect(nativeFetch).toHaveBeenCalledWith(url);
    expect(loaded.kind).toBe("blob");
  });

  it("reads data: URLs in the page, even on desktop", async () => {
    (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(png()));
    expect((await loadSource({ type: "url", url: "data:image/png;base64,AQ==" })).kind).toBe("blob");
    expect(nativeFetch).not.toHaveBeenCalled();
  });
});
