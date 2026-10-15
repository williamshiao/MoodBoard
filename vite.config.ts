/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the build works on GitHub Pages under /<repo>/ and anywhere else.
  base: "./",
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    setupFiles: ["fake-indexeddb/auto"],
  },
});
