import type {
  CatalogResponse,
  InstallScope,
  SkillDetailResponse,
  SourceConfig,
  SourceInput,
  DashboardState,
} from "./types";

interface ApiClientOptions {
  token: string;
  getScope: () => InstallScope;
}

export function createApiClient(options: ApiClientOptions) {
  async function request<T>(
    pathname: string,
    init: {
      method?: "GET" | "POST" | "DELETE";
      body?: object;
      query?: URLSearchParams;
    } = {},
  ): Promise<T> {
    const url = new URL(pathname, window.location.origin);
    if (init.query) {
      url.search = init.query.toString();
    } else if (init.method === undefined || init.method === "GET" || init.method === "DELETE") {
      url.searchParams.set("scope", options.getScope());
    }

    const response = await fetch(url, {
      method: init.method || "GET",
      headers: {
        "x-skillex-token": options.token,
        ...(init.body ? { "content-type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify({ ...init.body, scope: options.getScope() }) : undefined,
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(payload.error?.message || `Request failed with ${response.status}`);
    }

    return payload as T;
  }

  return {
    getState() {
      return request<DashboardState>("/api/state");
    },
    getDoctor() {
      return request<{
        scope: "local" | "global";
        stateDir: string;
        hasFailures: boolean;
        checks: Array<{ name: string; status: "pass" | "warn" | "fail"; message: string; hint?: string }>;
      }>("/api/doctor");
    },
    getCatalog() {
      return request<CatalogResponse>("/api/catalog");
    },
    getSkillDetail(skillId: string) {
      return request<SkillDetailResponse>(`/api/catalog/${encodeURIComponent(skillId)}`);
    },
    getSources() {
      return request<SourceConfig[]>("/api/sources");
    },
    installSkill(skillId: string, source?: { repo?: string; ref?: string }) {
      return request("/api/install", {
        method: "POST",
        body: {
          skillIds: [skillId],
          ...(source?.repo ? { repo: source.repo } : {}),
          ...(source?.ref ? { ref: source.ref } : {}),
        },
      });
    },
    installAll(source?: { repo?: string; ref?: string }) {
      return request<{ installedCount: number; installedSkills: Array<{ id: string }> }>("/api/install", {
        method: "POST",
        body: {
          all: true,
          ...(source?.repo ? { repo: source.repo } : {}),
          ...(source?.ref ? { ref: source.ref } : {}),
        },
      });
    },
    installSkillIds(skillIds: string[], source?: { repo?: string; ref?: string }) {
      return request<{ installedCount: number; installedSkills: Array<{ id: string }> }>("/api/install", {
        method: "POST",
        body: {
          skillIds,
          ...(source?.repo ? { repo: source.repo } : {}),
          ...(source?.ref ? { ref: source.ref } : {}),
        },
      });
    },
    removeSkills(skillIds: string[]) {
      return request<{ removedSkills: string[]; missingSkills: string[] }>("/api/remove", {
        method: "POST",
        body: { skillIds },
      });
    },
    removeSkill(skillId: string) {
      return request("/api/remove", {
        method: "POST",
        body: { skillIds: [skillId] },
      });
    },
    updateSkill(skillId?: string) {
      return request("/api/update", {
        method: "POST",
        body: skillId ? { skillIds: [skillId] } : {},
      });
    },
    syncSkills(adapter: string) {
      return request<{ syncs?: Array<{ adapter: string }> }>("/api/sync", {
        method: "POST",
        body: adapter === "all" ? {} : { adapter },
      });
    },
    addSource(source: SourceInput) {
      return request("/api/sources", {
        method: "POST",
        body: source,
      });
    },
    removeSource(repo: string) {
      const query = new URLSearchParams();
      query.set("scope", options.getScope());
      return request(`/api/sources/${encodeURIComponent(repo)}`, {
        method: "DELETE",
        query,
      });
    },
  };
}
