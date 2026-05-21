import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
  plugins: [
    react({
      babel: {
        parserOpts: {
          plugins: ["decorators-legacy"],
        },
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },

  build: {
    outDir: "dist/lib",
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "Live2d",
      fileName: "live2d",
    },
    rollupOptions: {
      external: ["react", "react-dom"],
    },
  },

  server: {
    fs: {
      strict: false,
    },
  },
});
