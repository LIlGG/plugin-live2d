import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      babel: {
        parserOpts: {
          plugins: ["decorators-legacy"],
        },
      },
    }),
  ],

  build: {
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
      strict: false
    }
  }
});
