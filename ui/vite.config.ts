import path from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "..", "dist-ui"),
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
    port: 4174,
  },
});
