<script setup lang="ts">
import { computed } from "vue";
import type { CatalogSkill } from "../types";
import { useSkillexStore } from "../store";
import { highlightSegments } from "../highlight";

const props = defineProps<{
  skill: CatalogSkill;
  onOpen: (skillId: string) => void;
  onInstall: (skill: CatalogSkill) => Promise<void>;
  onRemove: (skillId: string) => Promise<void>;
  /** When true, the resolved category came from regex inference (no explicit declaration). */
  inferredCategory?: boolean;
  /** Resolved category id (lowercase). Optional; only used for the inferred chip context. */
  resolvedCategoryId?: string;
}>();

const store = useSkillexStore();

/** True when this card has an in-flight install/remove/update action. */
const isBusy = computed(() => store.state.busyCards.has(props.skill.id));

const searchQuery = computed(() => store.state.searchQuery);

/** Pre-computed highlight segments for the title and description. */
const nameSegments = computed(() => highlightSegments(props.skill.name, searchQuery.value));
const descriptionSegments = computed(() => highlightSegments(props.skill.description, searchQuery.value));

/** Selection state plumbed through the global store. */
const isSelected = computed(() => store.state.selectedSkillIds.has(props.skill.id));
const inSelectionMode = computed(() => store.state.selectedSkillIds.size > 0);

/**
 * Card click handler:
 *   - Shift+click  → toggle selection (always; even when selection is empty,
 *                     this enters selection mode).
 *   - Plain click  → in selection mode, toggle selection. Otherwise navigate
 *                     to the skill detail page (existing behavior).
 */
function handleCardClick(event: MouseEvent) {
  if (event.shiftKey) {
    event.preventDefault();
    store.toggleSelectedSkill(props.skill.id);
    return;
  }
  if (inSelectionMode.value) {
    event.preventDefault();
    store.toggleSelectedSkill(props.skill.id);
    return;
  }
  props.onOpen(props.skill.id);
}

function handleCheckboxClick(event: MouseEvent) {
  event.stopPropagation();
  store.toggleSelectedSkill(props.skill.id);
}

const CATEGORY_MAP: Record<string, string> = {
  workflow: "icon-bg-workflow",
  testing:  "icon-bg-testing",
  devops:   "icon-bg-devops",
  tools:    "icon-bg-tools",
  security: "icon-bg-security",
};

const TAG_COLORS: Record<string, string> = {
  git: "tag-git", github: "tag-git", commit: "tag-git",
  testing: "tag-test", jest: "tag-test", tdd: "tag-test", test: "tag-test",
  docker: "tag-docker", devops: "tag-docker", yaml: "tag-docker",
  security: "tag-security", owasp: "tag-security", audit: "tag-security",
  react: "tag-react", hooks: "tag-react",
  python: "tag-python", docs: "tag-python",
};

function iconClass(skill: CatalogSkill): string {
  // try to infer category from tags
  const tags = skill.tags.map(t => t.toLowerCase());
  if (tags.some(t => ["git","github","commit","workflow"].includes(t))) return "icon-bg-workflow";
  if (tags.some(t => ["testing","jest","tdd","test","vitest"].includes(t))) return "icon-bg-testing";
  if (tags.some(t => ["docker","devops","ci","cd"].includes(t))) return "icon-bg-devops";
  if (tags.some(t => ["security","owasp","audit"].includes(t))) return "icon-bg-security";
  if (tags.some(t => ["tools","python","scraper","web"].includes(t))) return "icon-bg-tools";
  return CATEGORY_MAP[skill.id] ?? "icon-bg-default";
}

function tagClass(tag: string): string {
  return TAG_COLORS[tag.toLowerCase()] ?? "tag-default";
}

// derive a simple emoji icon from skill id / tags
function skillIcon(skill: CatalogSkill): string {
  const id = skill.id.toLowerCase();
  if (id.includes("git") || id.includes("commit")) return "🌿";
  if (id.includes("test") || id.includes("jest"))  return "🧪";
  if (id.includes("docker"))  return "🐳";
  if (id.includes("security") || id.includes("guard")) return "🛡️";
  if (id.includes("react"))   return "⚛️";
  if (id.includes("python"))  return "🐍";
  if (id.includes("typescript") || id.includes("ts")) return "🔷";
  if (id.includes("cpp") || id.includes("c++")) return "⚙️";
  if (id.includes("latex"))   return "📄";
  if (id.includes("create"))  return "✨";
  if (id.includes("code") || id.includes("review")) return "🔍";
  if (id.includes("error"))   return "🐛";
  return "📦";
}

// Deterministic CSS-only avatar: initials on a hashed HSL background.
// Replaces the previous external Dicebear image so the UI works offline and
// does not leak page-load telemetry to a third-party host.
function avatarInitials(skill: CatalogSkill): string {
  const source = (skill.author || skill.source.repo).trim();
  if (!source) return "?";
  const parts = source.replace(/[/_-]+/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return parts[0]!.slice(0, 2).toUpperCase();
}

function avatarBackground(skill: CatalogSkill): string {
  const source = (skill.author || skill.source.repo).trim();
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}deg 70% 35%)`;
}
</script>

<style scoped>
.skill-card.is-busy {
  opacity: 0.65;
  filter: saturate(0.7);
  pointer-events: none;
}
.skill-card.is-busy .skill-card-actions {
  pointer-events: auto;
}
.card-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: card-spin 0.7s linear infinite;
}
@keyframes card-spin {
  to { transform: rotate(360deg); }
}
.inferred-chip {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px dashed rgba(82, 82, 91, 0.6);
  color: var(--text-dim);
  letter-spacing: 0.04em;
}

.search-mark {
  background: rgba(16, 185, 129, 0.22);
  color: #fff;
  border-radius: 3px;
  padding: 0 2px;
  font-weight: inherit;
}

.skill-card-checkbox {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1.5px solid var(--line-strong);
  background: rgba(24, 24, 27, 0.85);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 5;
  transition: background 120ms, border-color 120ms;
}
.skill-card-checkbox:hover { border-color: var(--accent-ring); }
.skill-card-checkbox.checked {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.skill-card-checkbox:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.skill-card.is-selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent), var(--shadow-soft);
}

/* When in selection mode, dim hover transform so cards feel batch-selectable. */
.skill-card.in-selection-mode { transition: border-color 150ms, box-shadow 150ms, transform 150ms; }
</style>

<template>
  <article
    class="skill-card"
    :class="{
      'is-installed': skill.installed,
      'is-busy': isBusy,
      'is-selected': isSelected,
      'in-selection-mode': inSelectionMode,
    }"
    @click="handleCardClick"
  >
    <!--
      Selection checkbox: appears when the user is in selection mode (any card
      selected). The checkbox itself is always interactive even when the card
      is the busy one, so the user can deselect a stuck card.
    -->
    <button
      v-if="inSelectionMode"
      type="button"
      class="skill-card-checkbox"
      :class="{ checked: isSelected }"
      :aria-checked="isSelected"
      :aria-label="`${isSelected ? 'Deselect' : 'Select'} ${skill.name}`"
      role="checkbox"
      @click.stop="handleCheckboxClick"
    >
      <svg v-if="isSelected" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
      </svg>
    </button>
    <div class="skill-card-body">
      <!-- Icon row -->
      <div class="skill-card-icon-row">
        <div class="skill-icon-wrap" :class="iconClass(skill)">
          {{ skillIcon(skill) }}
          <!-- installed checkmark -->
          <div v-if="skill.installed" class="skill-installed-dot">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"/>
            </svg>
          </div>
        </div>

        <div class="skill-card-meta">
          <span class="downloads-count">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            {{ skill.source.repo }}
          </span>
        </div>
      </div>

      <!-- Name + version -->
      <div class="skill-card-head">
        <h3>
          <template v-for="(seg, i) in nameSegments" :key="`name-${i}`">
            <mark v-if="seg.match" class="search-mark">{{ seg.text }}</mark>
            <template v-else>{{ seg.text }}</template>
          </template>
        </h3>
        <span class="version-badge">v{{ skill.version }}</span>
      </div>

      <!-- Description -->
      <p class="skill-description">
        <template v-for="(seg, i) in descriptionSegments" :key="`desc-${i}`">
          <mark v-if="seg.match" class="search-mark">{{ seg.text }}</mark>
          <template v-else>{{ seg.text }}</template>
        </template>
      </p>

      <!-- Tags -->
      <div v-if="skill.tags.length > 0" class="tag-block">
        <span
          v-for="tag in skill.tags"
          :key="`${skill.id}-${tag}`"
          class="skill-tag"
          :class="tagClass(tag)"
        >
          {{ tag }}
        </span>
      </div>

      <!-- Compatibility -->
      <div v-if="skill.compatibility.length > 0" class="tag-block tag-block-compat">
        <span
          v-for="adapter in skill.compatibility"
          :key="`${skill.id}-${adapter}`"
          class="chip chip-accent"
          style="height:20px;font-size:10px;padding:0 8px;"
        >
          {{ adapter }}
        </span>
      </div>
    </div>

    <!-- Card footer -->
    <div class="skill-card-footer">
      <div class="skill-author">
        <span
          class="skill-author-avatar"
          :style="{ background: avatarBackground(skill) }"
          :aria-hidden="true"
        >{{ avatarInitials(skill) }}</span>
        {{ skill.author || skill.source.repo }}
      </div>

      <div class="skill-card-actions" @click.stop>
        <span v-if="inferredCategory" class="inferred-chip" title="Category inferred from id/tags. Add `category:` to the skill manifest to override.">
          (inferred)
        </span>

        <template v-if="skill.installed">
          <span class="installed-label">Installed</span>
          <button
            class="remove-btn"
            type="button"
            title="Remove"
            :disabled="isBusy"
            @click="onRemove(skill.id)"
          >
            <span v-if="isBusy" class="card-spinner" aria-label="Working"></span>
            <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </template>
        <template v-else>
          <button
            class="button button-primary"
            style="min-height:28px;padding:0 12px;font-size:0.75rem;"
            type="button"
            :disabled="isBusy"
            @click="onInstall(skill)"
          >
            <span v-if="isBusy" class="card-spinner" aria-label="Working"></span>
            <template v-else>
              <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
              </svg>
              Install
            </template>
          </button>
        </template>
      </div>
    </div>
  </article>
</template>
