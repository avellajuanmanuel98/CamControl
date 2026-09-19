import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// COOP/COEP make the page "cross-origin isolated", which is what lets the
// browser expose SharedArrayBuffer — required by EZUIKit's modern
// worker+WASM decoder path (playCtrl3). Without it, EZUIKit silently
// degrades to an older no-worker decoder (playCtrl1) that fails to
// initialize ("print log failed, res0"), leaving the video stuck black
// with no visible error. Our own API calls already go through explicit
// CORS (see backend/src/app.ts), which stays compatible with COEP.
const crossOriginIsolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    headers: crossOriginIsolationHeaders,
  },
  preview: {
    headers: crossOriginIsolationHeaders,
  },
});
