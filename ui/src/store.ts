import type { ComputedRef, InjectionKey } from "vue";
import { computed, inject, reactive } from "vue";
import type { Router } from "vue-router";
import { createApiClient } from "./api";
import type {
  CatalogSkill,
  CatalogResponse,
  DashboardState,
  InstallScope,
  NoticeTone,
  SkillDetailResponse,
  SourceInput,
  SyncMetadata,
  ToastState,
  WebUiBootstrap,
} from "./types";

function sortSyncs(history: DashboardState["syncHistory"]) {
  return Object.values(history || {}).sort((left, right) => right.syncedAt.localeCompare(left.syncedAt));
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Aggregate status surfaced in the sidebar Doctor link. */
export type DoctorStatus = "pass" | "warn" | "fail" | null;

export interface SkillexStore {
  state: {
    bootstrap: WebUiBootstrap;
    scope: InstallScope;
    syncAdapter: string;
    searchQuery: string;
    dashboard: DashboardState | null;
    catalog: CatalogResponse | null;
    detail: SkillDetailResponse | null;
    detailLoading: boolean;
    initialized: boolean;
    busyLabel: string | null;
    /** Skill ids whose card-level action is currently in flight. */
    busyCards: Set<string>;
    /** Aggregate health from the most recent /api/doctor poll. */
    doctorStatus: DoctorStatus;
    notice: { tone: NoticeTone; message: string } | null;
    toast: ToastState;
  };
  filteredSkills: ComputedRef<CatalogSkill[]>;
  availableSyncAdapters: ComputedRef<Array<{ value: string; label: string }>>;
  recentSyncTargets: ComputedRef<SyncMetadata[]>;
  initialize: (routeSkillId?: string | null) => Promise<void>;
  refreshAll: () => Promise<void>;
  loadSkillDetail: (skillId: string) => Promise<void>;
  clearDetail: () => void;
  navigateHome: () => Promise<void>;
  navigateToSkill: (skillId: string) => Promise<void>;
  setScope: (scope: InstallScope) => Promise<void>;
  setSyncAdapter: (adapter: string) => void;
  installSkill: (skill: CatalogSkill) => Promise<void>;
  removeSkill: (skillId: string) => Promise<void>;
  updateSkill: (skillId?: string) => Promise<void>;
  syncNow: () => Promise<void>;
  addSource: (source: SourceInput) => Promise<void>;
  removeSource: (repo: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  clearNotice: () => void;
  /** Refresh the cached aggregate doctor status (called on initialize + after mutations). */
  loadDoctorStatus: () => Promise<void>;
  /** Full Doctor report for the dedicated Doctor page. */
  loadDoctor: () => Promise<{
    scope: "local" | "global";
    stateDir: string;
    hasFailures: boolean;
    checks: Array<{ name: string; status: "pass" | "warn" | "fail"; message: string; hint?: string }>;
  }>;
}

export const SKILLEX_STORE_KEY: InjectionKey<SkillexStore> = Symbol("skillex-store");

export function createSkillexStore(router: Router, bootstrap: WebUiBootstrap): SkillexStore {
  const state = reactive({
    bootstrap,
    scope: bootstrap.initialScope,
    syncAdapter: "all",
    searchQuery: "",
    dashboard: null as DashboardState | null,
    catalog: null as CatalogResponse | null,
    detail: null as SkillDetailResponse | null,
    detailLoading: false,
    initialized: false,
    busyLabel: null as string | null,
    busyCards: new Set<string>(),
    doctorStatus: null as DoctorStatus,
    notice: null as { tone: NoticeTone; message: string } | null,
    toast: {
      visible: false,
      tone: "info" as NoticeTone,
      message: "",
    },
  });

  const api = createApiClient({
    token: bootstrap.token,
    getScope: () => state.scope,
  });

  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  function routeQuery() {
    return {
      token: bootstrap.token,
      scope: state.scope,
    };
  }

  function showNotice(message: string, tone: NoticeTone) {
    state.notice = { message, tone };
    state.toast.visible = true;
    state.toast.message = message;
    state.toast.tone = tone;
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(() => {
      state.toast.visible = false;
    }, 2600);
  }

  async function refreshAll(): Promise<void> {
    const [dashboard, catalog] = await Promise.all([api.getState(), api.getCatalog()]);
    state.dashboard = dashboard;
    state.catalog = catalog;
  }

  async function refreshAfterMutation(detailSkillId?: string | null): Promise<void> {
    await refreshAll();
    if (detailSkillId) {
      await loadSkillDetail(detailSkillId);
    }
  }

  /**
   * Runs a workspace-wide action with the global busy overlay. Used for
   * refresh / sync / source mutations where blocking the whole page is OK.
   */
  async function runGlobalAction(
    label: string,
    action: () => Promise<unknown>,
    detailSkillId?: string | null,
  ): Promise<void> {
    state.busyLabel = label;
    try {
      await action();
      await refreshAfterMutation(detailSkillId);
      showNotice(`${label} complete.`, "success");
      void loadDoctorStatus();
    } catch (error) {
      const message = formatError(error);
      state.notice = { message, tone: "error" };
      showNotice(message, "error");
      throw error;
    } finally {
      state.busyLabel = null;
    }
  }

  /**
   * Runs an action targeted at a single skill card. The card shows a localized
   * spinner via `state.busyCards`; the rest of the page stays interactive.
   */
  async function runCardAction(
    skillId: string,
    label: string,
    action: () => Promise<unknown>,
    detailSkillId?: string | null,
  ): Promise<void> {
    // Clone the Set so Vue's reactivity proxy notices the change.
    const next = new Set(state.busyCards);
    next.add(skillId);
    state.busyCards = next;
    try {
      await action();
      await refreshAfterMutation(detailSkillId);
      showNotice(`${label} complete.`, "success");
      void loadDoctorStatus();
    } catch (error) {
      const message = formatError(error);
      state.notice = { message, tone: "error" };
      showNotice(message, "error");
      throw error;
    } finally {
      const cleared = new Set(state.busyCards);
      cleared.delete(skillId);
      state.busyCards = cleared;
    }
  }

  async function loadDoctorStatus(): Promise<void> {
    try {
      const report = await api.getDoctor();
      if (report.hasFailures) {
        state.doctorStatus = "fail";
      } else if (report.checks.some((c) => c.status === "warn")) {
        state.doctorStatus = "warn";
      } else {
        state.doctorStatus = "pass";
      }
    } catch {
      // Non-blocking: keep the previous status (or null on first load).
    }
  }

  async function navigateHome(): Promise<void> {
    state.detail = null;
    await router.push({ name: "catalog", query: routeQuery() });
  }

  async function navigateToSkill(skillId: string): Promise<void> {
    await router.push({
      name: "skill-detail",
      params: { skillId },
      query: routeQuery(),
    });
  }

  async function loadSkillDetail(skillId: string): Promise<void> {
    state.detailLoading = true;
    try {
      state.detail = await api.getSkillDetail(skillId);
    } catch (error) {
      state.detail = null;
      showNotice(formatError(error), "error");
      throw error;
    } finally {
      state.detailLoading = false;
    }
  }

  async function initialize(routeSkillId?: string | null): Promise<void> {
    if (state.initialized) {
      if (routeSkillId) {
        await loadSkillDetail(routeSkillId);
      }
      return;
    }
    state.initialized = true;
    await refreshAll();
    void loadDoctorStatus();
    if (routeSkillId) {
      await loadSkillDetail(routeSkillId);
    }
  }

  async function setScope(scope: InstallScope): Promise<void> {
    if (state.scope === scope) {
      return;
    }
    state.scope = scope;
    const currentSkillId = typeof router.currentRoute.value.params.skillId === "string"
      ? router.currentRoute.value.params.skillId
      : null;
    if (currentSkillId) {
      await router.replace({
        name: "skill-detail",
        params: { skillId: currentSkillId },
        query: routeQuery(),
      });
    } else {
      await router.replace({ name: "catalog", query: routeQuery() });
    }
    await refreshAfterMutation(currentSkillId);
  }

  const filteredSkills = computed(() => {
    const skills = state.catalog?.skills || [];
    const query = state.searchQuery.trim().toLowerCase();
    if (!query) {
      return skills;
    }
    return skills.filter((skill) => {
      const haystack = [
        skill.id,
        skill.name,
        skill.description,
        skill.author || "",
        skill.source.label || "",
        skill.source.repo,
        ...skill.tags,
        ...skill.compatibility,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  });

  const availableSyncAdapters = computed(() => {
    const supported = state.dashboard?.adapters.supported || [];
    return [
      { value: "all", label: "All detected" },
      ...supported.map((adapter) => ({
        value: adapter.id,
        label: adapter.label,
      })),
    ];
  });

  const recentSyncTargets = computed(() => sortSyncs(state.dashboard?.syncHistory || {}));

  return {
    state,
    filteredSkills,
    availableSyncAdapters,
    recentSyncTargets,
    initialize,
    refreshAll,
    async loadSkillDetail(skillId: string) {
      await loadSkillDetail(skillId);
    },
    clearDetail() {
      state.detail = null;
    },
    async navigateHome() {
      await navigateHome();
    },
    async navigateToSkill(skillId: string) {
      await navigateToSkill(skillId);
    },
    async setScope(scope: InstallScope) {
      await setScope(scope);
    },
    setSyncAdapter(adapter: string) {
      state.syncAdapter = adapter || "all";
    },
    async installSkill(skill: CatalogSkill) {
      await runCardAction(
        skill.id,
        `Installed ${skill.name}`,
        () =>
          api.installSkill(skill.id, {
            repo: skill.source.repo,
            ref: skill.source.ref,
          }),
        state.detail?.skill.id || null,
      );
    },
    async removeSkill(skillId: string) {
      const currentDetail = state.detail?.skill.id || null;
      await runCardAction(
        skillId,
        `Removed ${skillId}`,
        () => api.removeSkill(skillId),
        currentDetail === skillId ? null : currentDetail,
      );
      if (currentDetail === skillId) {
        state.detail = null;
        await navigateHome();
      }
    },
    async updateSkill(skillId?: string) {
      // Per-card spinner when updating a single skill; global overlay when
      // updating the whole installed set.
      if (skillId) {
        await runCardAction(
          skillId,
          `Updated ${skillId}`,
          () => api.updateSkill(skillId),
          state.detail?.skill.id || null,
        );
      } else {
        await runGlobalAction(
          "Updated installed skills",
          () => api.updateSkill(skillId),
          state.detail?.skill.id || null,
        );
      }
    },
    async syncNow() {
      await runGlobalAction("Sync finished", () => api.syncSkills(state.syncAdapter), state.detail?.skill.id || null);
    },
    async addSource(source) {
      await runGlobalAction(`Added ${source.repo}`, () => api.addSource(source), state.detail?.skill.id || null);
    },
    async removeSource(repo: string) {
      await runGlobalAction(`Removed ${repo}`, () => api.removeSource(repo), state.detail?.skill.id || null);
    },
    setSearchQuery(query: string) {
      state.searchQuery = query;
    },
    clearNotice() {
      state.notice = null;
    },
    async loadDoctorStatus() {
      await loadDoctorStatus();
    },
    loadDoctor() {
      return api.getDoctor();
    },
  };
}

export function useSkillexStore(): SkillexStore {
  const store = inject(SKILLEX_STORE_KEY);
  if (!store) {
    throw new Error("Skillex store was not provided.");
  }
  return store;
}
