import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
// @ts-expect-error type error without @types/node package
import process from "node:process";
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // Inline ALL JS/CSS/fonts into a single index.html for every production
    // build. The macOS WKWebView (tauri:// protocol) fails to apply external
    // stylesheets reliably; a self-contained HTML sidesteps that entirely.
    // `--mode dev-preview` skips inlining for the served multi-file preview.
    ...(mode === "dev-preview" ? [] : [viteSingleFile()]),
  ],

  // Relative base lets the built dist/ run from any static path
  // (required for previewing without a server; fine for Tauri too).
  base: "./",

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
