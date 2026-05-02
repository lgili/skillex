import path from "node:path";
import fs from "node:fs";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const pkgPath = path.resolve(__dirname, "..", "package.json");
const pkgVersion = JSON.parse(fs.readFileSync(pkgPath, "utf8")).version as string;

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  define: {
    "import.meta.env.VITE_SKILLEX_VERSION": JSON.stringify(pkgVersion),
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
