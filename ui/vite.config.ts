import path from "node:path";
import fs from "node:fs";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const pkgPath = path.resolve(__dirname, "..", "package.json");
const pkgVersion = JSON.parse(fs.readFileSync(pkgPath, "utf8")).version as string;

/**
 * In dev, proxy /api/* to a running `skillex ui` backend so the Vite dev
 * server can talk to real catalog / install / sync endpoints. Set
 * `VITE_SKILLEX_BACKEND=http://127.0.0.1:<port>` before running
 * `npm run dev:ui` to enable. When unset, /api requests fail with the same
 * "404 Not Found" Vite uses for missing routes — the in-page dev overlay
 * (see ui/src/types.ts) explains how to wire this up.
 */
const backendUrl = process.env.VITE_SKILLEX_BACKEND;

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
    ...(backendUrl
      ? {
          proxy: {
            "/api": {
              target: backendUrl,
              changeOrigin: true,
              // Skillex serves over plain http on 127.0.0.1 only; no
              // websockets, no rewrites needed.
            },
          },
        }
      : {}),
  },
});
