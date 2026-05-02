<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import SkillCard from "../components/SkillCard.vue";
import Skeleton from "../components/Skeleton.vue";
import { RECOMMENDED_SKILL_IDS } from "../recommended";
import { useSkillexStore } from "../store";
import type { CatalogSkill } from "../types";

const isMac = typeof navigator !== "undefined" && /Mac|iPad|iPhone|iPod/.test(navigator.platform);
const installAllShortcutLabel = isMac ? "⇧⌘A" : "Ctrl+Shift+A";

const store = useSkillexStore();
const selectedCategory = ref("all");
/** When true, restrict the grid to the user's installed skills. */
const installedOnly = ref(false);
/** When true, the grid is grouped by source.repo. */
const groupBySource = ref(false);

const showInstallAll = ref(false);
const showRemoveAll = ref(false);

const CATEGORIES = [
  { id: "all",         name: "All",         icon: "✦" },
  { id: "code",        name: "Code",        icon: "💻" },
  { id: "engineering", name: "Engineering", icon: "⚡" },
  { id: "workflow",    name: "Workflow",    icon: "🌿" },
  { id: "testing",     name: "Testing",     icon: "🧪" },
  { id: "security",    name: "Security",    icon: "🛡️" },
  { id: "devops",      name: "DevOps",      icon: "🐳" },
  { id: "research",    name: "Research",    icon: "🔍" },
  { id: "data",        name: "Data",        icon: "📊" },
  { id: "tools",       name: "Tools",       icon: "🔧" },
  { id: "other",       name: "Other",       icon: "📦" },
];

function inferCategory(id: string, tags: string[]): string {
  const all = [id, ...tags].map(s => s.toLowerCase()).join(" ");
  if (/wikipedia|arxiv|pubmed|ncbi|duckduckgo|web-search|web-scraper|research-wikipedia|research-arxiv|research-pubmed/.test(all)) return "research";
  if (/data-engineer|data-scientist|data-science|machine-learning|\bml\b|etl|elt|\bdbt\b|airflow|pipeline|feature-engineering|data-warehouse|data-modeling/.test(all)) return "data";
  if (/simulation|mna|z-domain|magnetics|mosfet|igbt|waveform|fft|thd|newton-raphson|psim|schematic|netlist|altium|datasheet|curve-digitization|semiconductor/.test(all)) return "engineering";
  if (/typescript|python|cpp-pro|c-pro|code-review|error-handling/.test(all)) return "code";
  if (/git|commit|workflow|branch/.test(all)) return "workflow";
  if (/test|jest|tdd|vitest|spec/.test(all))  return "testing";
  if (/security|owasp|audit|guard/.test(all)) return "security";
  if (/docker|devops|ci|cd|helm/.test(all))   return "devops";
  if (/pdf|extraction|document|scraper|tool|docs|web/.test(all)) return "tools";
  return "other";
}

function resolveCategory(skill: CatalogSkill): { id: string; inferred: boolean } {
  const explicit = skill.category?.trim();
  if (explicit) {
    return { id: explicit.toLowerCase(), inferred: false };
  }
  return { id: inferCategory(skill.id, skill.tags), inferred: true };
}

function categoryCount(catId: string): number {
  if (catId === "all") return store.state.catalog?.skills.length ?? 0;
  return (store.state.catalog?.skills ?? []).filter(s => resolveCategory(s).id === catId).length;
}

const totalSkills = computed(() => store.state.catalog?.skills.length ?? 0);
const installedCount = computed(() => store.state.dashboard?.installed.length ?? 0);
const notInstalledCount = computed(() => Math.max(0, totalSkills.value - installedCount.value));

/** Recommended ids present in the catalog AND not yet installed. */
const recommendedRemaining = computed(() => {
  const catalogIds = new Set((store.state.catalog?.skills ?? []).map((s) => s.id));
  const installedIds = new Set((store.state.dashboard?.installed ?? []).map((s) => s.id));
  return RECOMMENDED_SKILL_IDS.filter((id) => catalogIds.has(id) && !installedIds.has(id));
});

const visibleSkills = computed(() => {
  let base = store.filteredSkills.value;
  if (selectedCategory.value !== "all") {
    base = base.filter(s => resolveCategory(s).id === selectedCategory.value);
  }
  if (installedOnly.value) {
    base = base.filter(s => s.installed);
  }
  return base;
});

/** True when the catalog response has not been fetched yet (first load). */
const isInitialLoading = computed(() => store.state.catalog === null);

/**
 * Buckets `visibleSkills` by their source repo when `groupBySource` is on.
 * Each bucket carries the source label (or repo) and the skills in their
 * existing alphabetic order.
 */
const groupedSkills = computed(() => {
  if (!groupBySource.value) {
    return [{ key: "_all", label: "", repo: "", skills: visibleSkills.value }];
  }
  const buckets = new Map<string, { key: string; label: string; repo: string; skills: CatalogSkill[] }>();
  for (const skill of visibleSkills.value) {
    const key = `${skill.source.repo}@${skill.source.ref}`;
    const label = skill.source.label || skill.source.repo;
    if (!buckets.has(key)) {
      buckets.set(key, { key, label, repo: skill.source.repo, skills: [] });
    }
    buckets.get(key)!.skills.push(skill);
  }
  return [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label));
});

/** True when there is more than one configured source (so grouping is meaningful). */
const canGroupBySource = computed(
  () => (store.state.catalog?.sources?.length ?? 0) > 1,
);

/** True when the catalog has loaded but the workspace has zero skills installed. */
const isFreshWorkspace = computed(
  () => !isInitialLoading.value && totalSkills.value > 0 && installedCount.value === 0,
);

async function handleInstallAll(): Promise<void> {
  showInstallAll.value = false;
  try {
    await store.installAll();
  } catch {
    /* error already surfaced via toast */
  }
}

async function handleInstallRecommended(): Promise<void> {
  try {
    await store.installRecommended();
  } catch {
    /* error already surfaced via toast */
  }
}

async function handleRemoveAll(): Promise<void> {
  showRemoveAll.value = false;
  try {
    await store.removeAllInstalled();
  } catch {
    /* error already surfaced via toast */
  }
}

function clearFilters(): void {
  store.setSearchQuery("");
  selectedCategory.value = "all";
  installedOnly.value = false;
}

/** Listener wired via App.vue's keyboard shortcut bus. */
function onInstallAllRequested(): void {
  if (notInstalledCount.value === 0 || store.state.busyLabel) return;
  showInstallAll.value = true;
}

/** Esc clears any active selection (no-op when nothing is selected). */
function onSelectionEscape(event: KeyboardEvent): void {
  if (event.key !== "Escape") return;
  if (store.state.selectedSkillIds.size === 0) return;
  // Don't clear selection if a confirm dialog is open or a text input is focused.
  if (showInstallAll.value || showRemoveAll.value) return;
  const target = event.target as HTMLElement | null;
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
  store.clearSelection();
}

// Bulk-selection action shortcuts
const selectedCount = computed(() => store.state.selectedSkillIds.size);
const selectionInstallableCount = computed(() => {
  const installedIds = new Set((store.state.dashboard?.installed ?? []).map((s) => s.id));
  let n = 0;
  for (const id of store.state.selectedSkillIds) if (!installedIds.has(id)) n += 1;
  return n;
});
const selectionRemovableCount = computed(() => {
  const installedIds = new Set((store.state.dashboard?.installed ?? []).map((s) => s.id));
  let n = 0;
  for (const id of store.state.selectedSkillIds) if (installedIds.has(id)) n += 1;
  return n;
});

function selectAllVisible(): void {
  store.setSelectedSkills(visibleSkills.value.map((s) => s.id));
}

async function handleInstallSelected(): Promise<void> {
  try {
    await store.installSelectedSkills();
  } catch {
    /* surfaced via toast */
  }
}

async function handleRemoveSelected(): Promise<void> {
  try {
    await store.removeSelectedSkills();
  } catch {
    /* surfaced via toast */
  }
}

onMounted(() => {
  window.addEventListener("skillex:request-install-all", onInstallAllRequested);
  window.addEventListener("keydown", onSelectionEscape);
});
onUnmounted(() => {
  window.removeEventListener("skillex:request-install-all", onInstallAllRequested);
  window.removeEventListener("keydown", onSelectionEscape);
});
</script>

<template>
  <section class="page-column">

    <!-- ── Hero panel ─────────────────────────────────────────────────────── -->
    <div class="panel">
      <div class="panel-head" style="align-items:flex-start;flex-wrap:wrap;gap:16px;">
        <div class="panel-head-title">
          <p class="eyebrow">Discovery</p>
          <h2>Marketplace</h2>
          <p>Browse skills from your configured catalog sources and install them in your workspace.</p>
        </div>

        <!-- Bulk actions: shown only when the catalog has loaded. -->
        <div v-if="!isInitialLoading && totalSkills > 0" class="bulk-actions">
          <button
            class="button button-primary"
            type="button"
            :disabled="notInstalledCount === 0 || store.state.busyLabel !== null"
            :title="notInstalledCount === 0
              ? 'All skills are already installed.'
              : `Install all ${notInstalledCount} remaining skill(s) into your workspace. (${installAllShortcutLabel})`"
            @click="showInstallAll = true"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Install all
            <span v-if="notInstalledCount > 0" class="bulk-count">{{ notInstalledCount }}</span>
            <span v-if="notInstalledCount > 0" class="bulk-shortcut" aria-hidden="true">{{ installAllShortcutLabel }}</span>
          </button>
          <button
            v-if="recommendedRemaining.length > 0"
            class="button button-secondary"
            type="button"
            :disabled="store.state.busyLabel !== null"
            :title="`Install the curated starter pack: ${recommendedRemaining.join(', ')}`"
            @click="handleInstallRecommended"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            Install recommended
            <span class="bulk-count" style="background:rgba(16,185,129,0.18);color:var(--accent);">{{ recommendedRemaining.length }}</span>
          </button>
          <button
            v-if="installedCount > 0"
            class="button button-ghost danger-ghost"
            type="button"
            :disabled="store.state.busyLabel !== null"
            :title="`Remove all ${installedCount} installed skill(s) from your workspace.`"
            @click="showRemoveAll = true"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove all ({{ installedCount }})
          </button>
        </div>
      </div>

      <!-- Shift+click hint: surfaces the bulk-select gesture for first-time users. -->
      <p v-if="!isInitialLoading && totalSkills > 0 && selectedCount === 0" class="bulk-select-hint">
        <kbd>Shift</kbd> + click any card to start a multi-select.
      </p>

      <!-- Stats row -->
      <div class="catalog-overview">
        <article class="overview-card">
          <span>Visible</span>
          <strong>{{ visibleSkills.length }}</strong>
        </article>
        <article class="overview-card">
          <span>Sources</span>
          <strong>{{ store.state.catalog?.sources.length ?? 0 }}</strong>
        </article>
        <article class="overview-card overview-card-clickable" :class="{ active: installedOnly }"
                 role="button"
                 tabindex="0"
                 :aria-pressed="installedOnly"
                 :title="installedOnly ? 'Showing installed only — click to clear' : 'Click to filter installed only'"
                 @click="installedOnly = !installedOnly"
                 @keydown.enter.space.prevent="installedOnly = !installedOnly">
          <span>Installed</span>
          <strong>{{ installedCount }}<span v-if="installedCount > 0" style="font-size:0.6em;color:var(--text-dim);font-weight:500;"> / {{ totalSkills }}</span></strong>
        </article>
      </div>

      <!-- Category pills + group toggle -->
      <div class="category-pills">
        <button
          v-for="cat in CATEGORIES"
          :key="cat.id"
          class="category-pill"
          :class="{ active: selectedCategory === cat.id }"
          type="button"
          @click="selectedCategory = cat.id"
        >
          <span aria-hidden="true">{{ cat.icon }}</span>
          {{ cat.name }}
          <span v-if="cat.id !== 'all'" class="category-pill-count">
            {{ categoryCount(cat.id) }}
          </span>
        </button>

        <!-- Group-by-source toggle: only useful when 2+ sources are configured. -->
        <button
          v-if="canGroupBySource"
          class="category-pill group-toggle"
          :class="{ active: groupBySource }"
          type="button"
          :aria-pressed="groupBySource"
          :title="groupBySource ? 'Click to flatten the grid' : 'Group skills by their catalog source'"
          @click="groupBySource = !groupBySource"
        >
          <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          Group by source
        </button>
      </div>
    </div>

    <!-- ── Selection bar: shown when at least one skill is selected. ─────── -->
    <transition name="selection-bar">
      <div v-if="selectedCount > 0" class="selection-bar" role="region" aria-label="Bulk selection">
        <div class="selection-bar-info">
          <strong>{{ selectedCount }} selected</strong>
          <span class="selection-bar-hint">
            Shift+click cards to add/remove ·
            <button type="button" class="link-button" @click="selectAllVisible">Select all visible ({{ visibleSkills.length }})</button>
          </span>
        </div>
        <div class="selection-bar-actions">
          <button
            v-if="selectionInstallableCount > 0"
            class="button button-primary"
            type="button"
            :disabled="store.state.busyLabel !== null"
            @click="handleInstallSelected"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Install {{ selectionInstallableCount }}
          </button>
          <button
            v-if="selectionRemovableCount > 0"
            class="button button-danger"
            type="button"
            :disabled="store.state.busyLabel !== null"
            @click="handleRemoveSelected"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove {{ selectionRemovableCount }}
          </button>
          <button
            class="button button-ghost"
            type="button"
            title="Clear selection (Esc)"
            @click="store.clearSelection()"
          >
            Clear
          </button>
        </div>
      </div>
    </transition>

    <!-- ── Skeleton: first load ───────────────────────────────────────────── -->
    <div v-if="isInitialLoading" class="catalog-grid">
      <Skeleton v-for="n in 6" :key="`skeleton-${n}`" variant="card" />
    </div>

    <!-- ── Fresh workspace state: no skills installed yet, prominent CTAs ── -->
    <div v-else-if="isFreshWorkspace && !installedOnly && selectedCategory === 'all' && !store.state.searchQuery"
         class="onboarding-card">
      <div class="onboarding-icon" aria-hidden="true">
        <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="onboarding-text">
        <strong>Your workspace is set up. Install your first skill.</strong>
        <p>{{ totalSkills }} skill(s) are available across {{ store.state.catalog?.sources.length ?? 0 }} source(s). Pick one below, or install everything at once.</p>
      </div>
      <button
        class="button button-primary"
        type="button"
        :disabled="store.state.busyLabel !== null"
        @click="showInstallAll = true"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        Install all {{ totalSkills }} skills
      </button>
    </div>

    <!-- ── Filtered empty state ───────────────────────────────────────────── -->
    <div v-else-if="visibleSkills.length === 0" class="empty-state">
      <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24"
           style="color:var(--text-dim);margin-bottom:4px;" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <strong>No skills match your filters</strong>
      <p>
        Try a different category or search term, or
        <button type="button" class="link-button" @click="clearFilters">clear all filters</button>.
      </p>
    </div>

    <!-- ── Skill grid (flat or grouped) ───────────────────────────────────── -->
    <template v-else>
      <template v-for="bucket in groupedSkills" :key="bucket.key">
        <!-- Group heading: rendered only when grouping is on AND we have a label. -->
        <div v-if="groupBySource && bucket.label" class="source-group-head">
          <span class="source-group-icon" aria-hidden="true">📦</span>
          <strong>{{ bucket.label }}</strong>
          <code v-if="bucket.label !== bucket.repo" class="source-group-repo">{{ bucket.repo }}</code>
          <span class="source-group-count">{{ bucket.skills.length }} skill(s)</span>
        </div>

        <div class="catalog-grid">
          <SkillCard
            v-for="skill in bucket.skills"
            :key="`${bucket.key}-${skill.id}`"
            :skill="skill"
            :inferred-category="resolveCategory(skill).inferred"
            :resolved-category-id="resolveCategory(skill).id"
            :on-open="store.navigateToSkill"
            :on-install="store.installSkill"
            :on-remove="store.removeSkill"
          />
        </div>
      </template>
    </template>

    <!-- Confirmation dialogs -->
    <ConfirmDialog
      :open="showInstallAll"
      title="Install every skill in the catalog?"
      :message="`This will download and install ${notInstalledCount} skill(s) into your workspace. The active agent will be auto-synced when finished.`"
      confirm-label="Install all"
      @confirm="handleInstallAll"
      @cancel="showInstallAll = false"
    />
    <ConfirmDialog
      :open="showRemoveAll"
      tone="danger"
      title="Remove every installed skill?"
      :message="`This will remove ${installedCount} skill(s) from your workspace. Synced adapter targets will be cleaned up automatically. This cannot be undone (you can reinstall via 'Install all').`"
      confirm-label="Remove all"
      @confirm="handleRemoveAll"
      @cancel="showRemoveAll = false"
    />

  </section>
</template>

<style scoped>
.bulk-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.bulk-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  margin-left: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #fff;
}

.bulk-shortcut {
  margin-left: 6px;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.22);
  font-family: monospace;
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}
@media (max-width: 900px) {
  .bulk-shortcut { display: none; }
}

.danger-ghost {
  color: var(--danger);
  border-color: rgba(248, 113, 113, 0.3);
}
.danger-ghost:hover:not(:disabled) {
  background: var(--danger-soft);
  border-color: rgba(248, 113, 113, 0.5);
}

.overview-card-clickable {
  cursor: pointer;
  transition: border-color 150ms, background 150ms;
  outline: none;
}
.overview-card-clickable:hover,
.overview-card-clickable:focus-visible {
  border-color: var(--accent-ring);
}
.overview-card-clickable.active {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.onboarding-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 20px 24px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--accent-ring);
  background: linear-gradient(135deg, var(--accent-soft) 0%, rgba(16, 185, 129, 0.04) 100%);
}

.onboarding-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--accent-soft);
  border: 1px solid var(--accent-ring);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.onboarding-text strong {
  display: block;
  font-size: 0.95rem;
  color: var(--text);
  margin-bottom: 2px;
}
.onboarding-text p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.link-button {
  background: none;
  border: 0;
  padding: 0;
  color: var(--accent);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}
.link-button:hover { color: var(--accent-hover); }

.group-toggle {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.source-group-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 4px 8px;
  border-bottom: 1px solid var(--line);
  margin-top: 8px;
}
.source-group-head strong {
  color: var(--text);
  font-size: 0.92rem;
}
.source-group-icon {
  font-size: 1.05rem;
}
.source-group-repo {
  font-family: monospace;
  font-size: 11px;
  color: var(--text-dim);
  background: rgba(39, 39, 42, 0.5);
  padding: 2px 6px;
  border-radius: 6px;
}
.source-group-count {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-dim);
}

.selection-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 18px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--accent);
  background: linear-gradient(135deg, var(--accent-soft) 0%, rgba(16, 185, 129, 0.04) 100%);
  position: sticky;
  top: 8px;
  z-index: 20;
  box-shadow: var(--shadow-soft);
}

.selection-bar-info strong {
  color: var(--accent);
  font-size: 0.95rem;
}
.selection-bar-hint {
  display: block;
  margin-top: 2px;
  font-size: 0.75rem;
  color: var(--text-muted);
}
.selection-bar-hint .link-button {
  font-size: 0.75rem;
}

.selection-bar-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.selection-bar-enter-active,
.selection-bar-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}
.selection-bar-enter-from,
.selection-bar-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.bulk-select-hint {
  margin: 4px 0 12px;
  font-size: 11px;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  gap: 6px;
}
.bulk-select-hint kbd {
  font-family: monospace;
  font-size: 10px;
  padding: 1px 5px;
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  background: var(--bg-elevated);
  color: var(--text-muted);
}
@media (max-width: 680px) {
  .bulk-select-hint { display: none; }
}

@media (max-width: 680px) {
  .onboarding-card {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .onboarding-icon { margin: 0 auto; }
}
</style>
