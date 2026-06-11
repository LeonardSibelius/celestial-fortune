import { defineConfig } from 'vite';

// base './' makes the built bundle loadable from file:// — required for the
// Leonard Sibelius in-game cabinet, which embeds dist/index.html via UE's
// Chromium (Web Browser) widget. Harmless for normal http hosting.
export default defineConfig({
  base: './',
});
