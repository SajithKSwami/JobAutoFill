import { defineConfig } from 'vite';
import { resolve } from 'path';

// Separate build for the content script.
//
// Chrome loads content scripts as *classic* scripts (no import/export allowed).
// The main vite.config.ts produces ES modules with code-split chunks, which
// would cause a SyntaxError when Chrome tries to run content.js. This config
// builds content-script.ts as a self-contained IIFE — Rollup inlines every
// import so the output file has zero top-level import statements.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false, // keep the output from the main build
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      input: resolve(__dirname, 'src/content/content-script.ts'),
      output: {
        format: 'iife',
        name: 'AutoFillContent',
        entryFileNames: 'assets/content.js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
  },
});
