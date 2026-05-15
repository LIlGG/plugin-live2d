import { resolve } from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "./",
  plugins: [tsconfigPaths()],
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
