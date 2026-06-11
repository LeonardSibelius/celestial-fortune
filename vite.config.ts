import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Single-file build: ALL js/css/sprites inlined into dist/index.html, so the
// bundle runs straight from file:// — no server. This is what the Leonard
// Sibelius in-game cabinet loads (UE Chromium widget; ES module scripts are
// CORS-blocked under file://, inline scripts are not). base './' kept for any
// non-inlined stragglers; harmless for normal http hosting/deploys.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
});
