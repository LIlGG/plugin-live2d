import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    emptyOutDir: false,
    outDir: "dist",
    rollupOptions: {
      input: resolve(__dirname, "src/halo.ts"),
      output: {
        entryFileNames: "live2d.js",
        chunkFileNames: "chunks/[name]-[hash].js",
      },
    },
  },
});
