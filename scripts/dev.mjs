#!/usr/bin/env node
// Skillex one-command dev orchestrator.
//
// What it does:
//   1. Spawns the Skillex backend (`node ./bin/skillex.js ui --no-open --port 4174`).
//   2. Parses the first "Skillex Web UI running at <url>" line to get the token.
//   3. Spawns the Vite dev server with VITE_SKILLEX_BACKEND pointing at the
//      backend, on a separate port (default 4175).
//   4. Once Vite is ready, opens the browser at the Vite URL with the token
//      as a query parameter so the in-page bootstrap is set automatically.
//   5. Forwards SIGINT / SIGTERM to both processes for a clean Ctrl+C.
//
// Usage:
//   npm run dev                      # default: backend on 4174, vite on 4175
//   SKILLEX_DEV_BACKEND_PORT=5000 \
//     SKILLEX_DEV_VITE_PORT=5001 \
//     SKILLEX_DEV_NO_OPEN=1 npm run dev

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BACKEND_PORT = Number(process.env.SKILLEX_DEV_BACKEND_PORT || 4174);
const VITE_PORT = Number(process.env.SKILLEX_DEV_VITE_PORT || 4175);
const SKIP_OPEN = process.env.SKILLEX_DEV_NO_OPEN === "1";

if (!Number.isFinite(BACKEND_PORT) || !Number.isFinite(VITE_PORT)) {
  console.error("[skillex/dev] Invalid ports configured.");
  process.exit(1);
}

let backendProc = null;
let viteProc = null;
let exiting = false;

function log(label, message) {
  process.stdout.write(`\x1b[2m[${label}]\x1b[0m ${message}\n`);
}

function logError(label, message) {
  process.stderr.write(`\x1b[31m[${label}]\x1b[0m ${message}\n`);
}

function shutdown(code = 0) {
  if (exiting) return;
  exiting = true;
  for (const proc of [viteProc, backendProc]) {
    if (proc && !proc.killed) {
      try {
        proc.kill("SIGTERM");
      } catch {
        // ignore
      }
    }
  }
  // Give children a beat to flush, then exit.
  setTimeout(() => process.exit(code), 200);
}

process.on("SIGINT", () => {
  log("dev", "SIGINT - shutting down");
  shutdown(0);
});
process.on("SIGTERM", () => shutdown(0));

// Spawn the backend and capture its URL/token from stdout.
log("dev", `Starting backend on port ${BACKEND_PORT}...`);
backendProc = spawn(
  process.execPath,
  [join(ROOT, "bin", "skillex.js"), "ui", "--no-open", "--port", String(BACKEND_PORT)],
  { cwd: ROOT, env: process.env, stdio: ["ignore", "pipe", "pipe"] },
);

let backendUrl = null;
let tokenFromBackend = null;
let viteStarted = false;

backendProc.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  // Forward backend output (dimmed).
  process.stdout.write(
    text
      .split("\n")
      .map((line) => (line ? `\x1b[2m[backend]\x1b[0m ${line}` : ""))
      .join("\n"),
  );

  if (!backendUrl) {
    const match = text.match(/Skillex Web UI running at (https?:\/\/\S+)/);
    if (match) {
      backendUrl = match[1];
      try {
        const url = new URL(backendUrl);
        tokenFromBackend = url.searchParams.get("token");
      } catch {
        // ignore
      }
      if (!viteStarted && tokenFromBackend) {
        viteStarted = true;
        startVite(backendUrl, tokenFromBackend);
      }
    }
  }
});

backendProc.stderr.on("data", (chunk) => {
  process.stderr.write(`\x1b[2m[backend:err]\x1b[0m ${chunk.toString()}`);
});

backendProc.on("exit", (code, signal) => {
  if (exiting) return;
  logError("backend", `exited with code=${code} signal=${signal}`);
  shutdown(code ?? 1);
});

// Safety: if the backend never prints the URL within 15s, abort.
setTimeout(() => {
  if (!viteStarted) {
    logError("dev", "Backend did not announce a URL within 15s. Check the backend logs above.");
    shutdown(1);
  }
}, 15000);

function startVite(backendBaseUrl, token) {
  // backend prints e.g. http://127.0.0.1:4174/?token=abc, strip the path/query.
  const backendOrigin = (() => {
    try {
      const u = new URL(backendBaseUrl);
      return `${u.protocol}//${u.host}`;
    } catch {
      return backendBaseUrl;
    }
  })();

  const env = {
    ...process.env,
    VITE_SKILLEX_BACKEND: backendOrigin,
  };

  log("dev", `Backend ready at ${backendOrigin}`);
  log("dev", `Starting Vite dev server on port ${VITE_PORT}...`);

  // Use the local vite binary.
  const viteBin = join(ROOT, "node_modules", ".bin", "vite");
  viteProc = spawn(
    viteBin,
    ["--config", join(ROOT, "ui", "vite.config.ts"), "--port", String(VITE_PORT), "--strictPort"],
    { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] },
  );

  let viteAnnounced = false;

  viteProc.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    process.stdout.write(
      text
        .split("\n")
        .map((line) => (line ? `\x1b[2m[vite]\x1b[0m ${line}` : ""))
        .join("\n"),
    );

    if (!viteAnnounced && /VITE.+ready in/i.test(text)) {
      viteAnnounced = true;
      const viteUrl = `http://127.0.0.1:${VITE_PORT}/?token=${encodeURIComponent(token)}`;
      log("dev", "");
      log("dev", `\x1b[1m\x1b[32mReady -> ${viteUrl}\x1b[0m`);
      log("dev", "");
      if (!SKIP_OPEN) {
        openInBrowser(viteUrl);
      } else {
        log("dev", "SKILLEX_DEV_NO_OPEN=1 set - open the URL above manually.");
      }
    }
  });

  viteProc.stderr.on("data", (chunk) => {
    process.stderr.write(`\x1b[2m[vite:err]\x1b[0m ${chunk.toString()}`);
  });

  viteProc.on("exit", (code, signal) => {
    if (exiting) return;
    logError("vite", `exited with code=${code} signal=${signal}`);
    shutdown(code ?? 1);
  });
}

function openInBrowser(url) {
  const platform = process.platform;
  const cmd =
    platform === "darwin"
      ? "open"
      : platform === "win32"
        ? "cmd"
        : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
  } catch {
    log("dev", "Could not auto-open browser. Open the URL above manually.");
  }
}
