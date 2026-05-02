export type InstallScope = "local" | "global";
export type NoticeTone = "success" | "error" | "info";

export interface WebUiBootstrap {
  token: string;
  initialScope: InstallScope;
  initialSkillId: string | null;
}

export interface SourceConfig {
  repo: string;
  ref: string;
  label?: string | undefined;
}

export interface SourceInput {
  repo: string;
  ref?: string | undefined;
  label?: string | undefined;
}

export interface SourceSummary extends SourceConfig {
  skillCount: number;
}

export interface InstalledSkillMetadata {
  id: string;
  name: string;
  version: string;
  path: string;
  installedAt: string;
  compatibility: string[];
  tags: string[];
  source?: string | undefined;
}

export interface AdapterInfo {
  id: string;
  label: string;
}

export interface SyncMetadata {
  adapter: string;
  targetPath: string;
  syncedAt: string;
  skillIds?: string[] | undefined;
}

export interface DashboardState {
  scope: InstallScope;
  cwd: string;
  stateDir: string;
  initialized: boolean;
  sources: SourceConfig[];
  installed: InstalledSkillMetadata[];
  adapters: {
    active: string | null;
    detected: string[];
    supported: AdapterInfo[];
  };
  settings: {
    autoSync: boolean;
  };
  sync: SyncMetadata | null;
  syncHistory: Record<string, SyncMetadata>;
}

export interface CatalogSkill {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string | null;
  tags: string[];
  compatibility: string[];
  entry: string;
  path: string;
  files: string[];
  installed: boolean;
  source: {
    repo: string;
    ref: string;
    label?: string | undefined;
  };
  /** Optional explicit category from skill.json or SKILL.md frontmatter. */
  category?: string | undefined;
  scripts?: Record<string, string> | undefined;
}

export interface CatalogResponse {
  formatVersion: number;
  sources: SourceSummary[];
  skills: CatalogSkill[];
}

export interface SkillDetailResponse {
  skill: CatalogSkill;
  instructionsMarkdown: string;
  instructionsHtml: string;
  instructionsError: string | null;
}

export interface ToastState {
  visible: boolean;
  tone: NoticeTone;
  message: string;
}

declare global {
  interface Window {
    __SKILLEX_BOOTSTRAP__?: WebUiBootstrap | string;
  }
}

export function readBootstrap(): WebUiBootstrap {
  const raw = window.__SKILLEX_BOOTSTRAP__;
  const value =
    typeof raw === "string"
      ? raw === "__SKILLEX_BOOTSTRAP__"
        ? null
        : JSON.parse(raw)
      : raw;

  if (!value || typeof value !== "object" || !("token" in value) || !("initialScope" in value)) {
    // In Vite dev server (`npm run dev:ui`), the index.html is served as-is
    // and the bootstrap placeholder is not substituted by the Skillex backend.
    // We can either:
    //   (a) Recover from a query string the developer pasted from `skillex ui`.
    //   (b) Render an in-page overlay with copy-pasteable instructions.
    if (import.meta.env.DEV) {
      const recovered = recoverBootstrapFromUrl();
      if (recovered) return recovered;
      renderDevSetupOverlay();
      // Returning a placeholder lets the rest of the app construct without
      // crashing; API calls will fail until the developer wires the proxy
      // and reloads with the right token.
      return { token: "dev-placeholder", initialScope: "local", initialSkillId: null };
    }
    throw new Error("Missing Skillex Web UI bootstrap payload.");
  }

  return {
    token: String(value.token),
    initialScope: value.initialScope === "global" ? "global" : "local",
    initialSkillId: value.initialSkillId ? String(value.initialSkillId) : null,
  };
}

/**
 * In dev mode, accept the bootstrap from a query string so the developer can
 * paste the URL printed by `skillex ui`. The token is stashed in
 * `localStorage` so subsequent reloads don't need the URL parameters.
 */
function recoverBootstrapFromUrl(): WebUiBootstrap | null {
  const STORAGE_KEY = "skillex.dev-bootstrap";
  let token: string | null = null;
  let scope: "local" | "global" = "local";
  let initialSkillId: string | null = null;

  try {
    const url = new URL(window.location.href);
    token = url.searchParams.get("token");
    const scopeParam = url.searchParams.get("scope");
    if (scopeParam === "global" || scopeParam === "local") scope = scopeParam;
    if (token) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, scope }));
      // Strip ?token= from the URL so it doesn't show up in history.
      url.searchParams.delete("token");
      url.searchParams.delete("scope");
      window.history.replaceState({}, "", url.toString());
    } else {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { token?: string; scope?: string };
        if (parsed.token) {
          token = parsed.token;
          if (parsed.scope === "global" || parsed.scope === "local") scope = parsed.scope;
        }
      }
    }
  } catch {
    return null;
  }

  if (!token) return null;
  return { token, initialScope: scope, initialSkillId };
}

/**
 * Renders an in-page dev-setup overlay that explains exactly how to wire
 * the Vite dev server to a running `skillex ui` backend. Only invoked in
 * `import.meta.env.DEV` when no bootstrap could be recovered.
 */
function renderDevSetupOverlay(): void {
  const overlay = document.createElement("div");
  overlay.id = "skillex-dev-overlay";
  overlay.innerHTML = `
    <div class="skillex-dev-card">
      <h2>Skillex Web UI · dev mode</h2>
      <p>
        Vite is serving the UI bundle, but no backend bootstrap was injected.
        The UI needs a running <code>skillex ui</code> instance to talk to.
      </p>
      <ol>
        <li>In a separate terminal, run <code>node ./bin/skillex.js ui</code>
            (or <code>skillex ui</code> after <code>npm install -g</code>).</li>
        <li>Copy the printed URL — it looks like
            <code>http://127.0.0.1:&lt;port&gt;?token=&lt;token&gt;</code>.</li>
        <li>Open that URL with the same path you want to develop, but on the
            Vite dev port (default <code>4174</code>). Example:
            <code>http://127.0.0.1:4174?token=&lt;token&gt;</code>.</li>
        <li>Set the env var so Vite proxies API calls:
            <code>VITE_SKILLEX_BACKEND=http://127.0.0.1:&lt;port&gt; npm run dev:ui</code></li>
      </ol>
      <p style="opacity:0.7;font-size:12px;margin-top:14px;">
        Once a token is loaded, it is cached in <code>localStorage</code>
        until you clear it.
      </p>
    </div>
    <style>
      #skillex-dev-overlay {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(15, 17, 22, 0.92);
        display: flex; align-items: center; justify-content: center;
        font-family: "Inter", system-ui, sans-serif; color: #f4f4f5;
        padding: 16px;
      }
      .skillex-dev-card {
        background: #1c1c20; border: 1px solid #34343c;
        border-radius: 18px; padding: 28px 30px;
        max-width: 540px; box-shadow: 0 12px 40px rgba(0,0,0,0.5);
      }
      .skillex-dev-card h2 {
        margin: 0 0 8px; font-size: 1.05rem; color: #34d399;
      }
      .skillex-dev-card p, .skillex-dev-card li {
        font-size: 13px; line-height: 1.55; color: #cccfd9;
      }
      .skillex-dev-card ol { padding-left: 20px; margin: 12px 0 0; }
      .skillex-dev-card li { margin: 6px 0; }
      .skillex-dev-card code {
        font-family: "SF Mono", Menlo, monospace; font-size: 12px;
        background: #2a2a30; padding: 2px 6px; border-radius: 5px;
        word-break: break-all;
      }
    </style>
  `;
  document.body.appendChild(overlay);
}
