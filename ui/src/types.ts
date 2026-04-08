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
    throw new Error("Missing Skillex Web UI bootstrap payload.");
  }

  return {
    token: String(value.token),
    initialScope: value.initialScope === "global" ? "global" : "local",
    initialSkillId: value.initialSkillId ? String(value.initialSkillId) : null,
  };
}
