import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// assets/ stays the single committed source of truth for the static banner/GIF
// assets (README.md links to them directly via git-relative paths, and the
// update-project-cards skill writes to them directly) — Vite copies its
// contents into outDir verbatim on build via publicDir, rather than us
// duplicating those files into this app.
const assetsDir = resolve(__dirname, '../assets');

// Deliberately NOT setting COOP/COEP headers here (unlike zerog-tools' vite
// config): this page hotlinks several cross-origin images (avatar, project
// icons/screenshots) that don't send CORP/CORS headers, so
// Cross-Origin-Embedder-Policy: require-corp would block them under COEP.
// GitHub Pages can't set custom response headers anyway, so these headers
// would never apply in production — the chat feature is designed to use
// WebGPU first and single-threaded WASM as a fallback specifically so it
// doesn't depend on cross-origin isolation for multi-threaded WASM.
export default defineConfig({
  // This is a GitHub Pages *project* page, served at
  // https://tianhaoz95.github.io/tianhaoz95/ (a subpath), not the domain
  // root. Vite's default base ("/") emits root-absolute asset URLs
  // (/assets/...), which 404 under a subpath deploy — use a relative base
  // so built references resolve correctly regardless of where the site is
  // actually mounted.
  base: './',
  publicDir: assetsDir,
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  worker: {
    format: 'es',
  },
});
