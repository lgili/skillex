<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import Skeleton from "../components/Skeleton.vue";
import { useSkillexStore } from "../store";
import type { CatalogSkill } from "../types";

const route  = useRoute();
const store  = useSkillexStore();

const skillId = computed(() => (typeof route.params.skillId === "string" ? route.params.skillId : ""));
const detail  = computed(() => store.state.detail);

async function loadCurrentSkill() {
  if (!skillId.value) return;
  await store.loadSkillDetail(skillId.value);
}

watch(skillId, () => void loadCurrentSkill());
onMounted(() => void loadCurrentSkill());

/**
 * Resolves the breadcrumb category for the current skill: prefers the
 * explicit manifest field, falls back to a coarse inference based on tags,
 * else `null` so the breadcrumb hides the segment.
 */
const breadcrumbCategory = computed<string | null>(() => {
  const skill = detail.value?.skill;
  if (!skill) return null;
  const explicit = skill.category?.trim();
  if (explicit) return explicit;
  const blob = [skill.id, ...skill.tags].join(" ").toLowerCase();
  if (/git|commit|workflow|branch/.test(blob)) return "workflow";
  if (/test|jest|tdd|vitest|spec/.test(blob)) return "testing";
  if (/security|owasp|audit|guard/.test(blob)) return "security";
  if (/typescript|python|cpp-pro|c-pro|code-review|error-handling/.test(blob)) return "code";
  if (/docker|devops|ci|cd|helm/.test(blob)) return "devops";
  if (/wikipedia|arxiv|pubmed|web-search|web-scraper|research/.test(blob)) return "research";
  return null;
});

/**
 * Computes up to 4 catalog skills that share the most tags with the current
 * skill (or the same category, weighted lower). The current skill is always
 * excluded. Returns an empty array when the catalog has not loaded yet.
 */
const relatedSkills = computed<CatalogSkill[]>(() => {
  const current = detail.value?.skill;
  if (!current) return [];
  const all = store.state.catalog?.skills ?? [];
  if (all.length === 0) return [];

  const currentTags = new Set(current.tags.map((t) => t.toLowerCase()));
  const currentCategory = current.category?.trim().toLowerCase();

  // Score: shared-tag count + 0.5 if the explicit category matches.
  const ranked = all
    .filter((s) => s.id !== current.id)
    .map((s) => {
      const tagOverlap = s.tags.reduce(
        (n, tag) => n + (currentTags.has(tag.toLowerCase()) ? 1 : 0),
        0,
      );
      const sameCategory =
        currentCategory && s.category?.trim().toLowerCase() === currentCategory ? 0.5 : 0;
      return { skill: s, score: tagOverlap + sameCategory };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return ranked.map((r) => r.skill);
});
</script>

<template>
  <section class="page-column">

    <!-- Hero panel -->
    <div class="panel">
      <div class="detail-topbar">
        <!-- Breadcrumbs replace the previous "Skill detail" eyebrow + back button.
             Last segment is the active page (no link). -->
        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <button class="breadcrumb-link" type="button" @click="store.navigateHome()">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" />
            </svg>
            Catalog
          </button>
          <span v-if="breadcrumbCategory" class="breadcrumb-sep" aria-hidden="true">/</span>
          <span v-if="breadcrumbCategory" class="breadcrumb-segment">{{ breadcrumbCategory }}</span>
          <span class="breadcrumb-sep" aria-hidden="true">/</span>
          <span class="breadcrumb-current" aria-current="page">{{ detail?.skill.name ?? skillId }}</span>
        </nav>
      </div>

      <div v-if="detail" class="detail-hero">
        <div>
          <p class="eyebrow">Skill</p>
          <h2>{{ detail.skill.name }}</h2>
          <p class="detail-description">{{ detail.skill.description }}</p>
        </div>
        <!--
          Action order follows the design-principle "primary action last": passive
          (Sync) -> secondary (Update, only when installed) -> primary (Install) or
          destructive (Remove). The right-most button is what most users will hit
          on this screen.
        -->
        <div class="detail-actions">
          <button class="button button-ghost" type="button" @click="store.syncNow()" title="Re-sync this workspace's adapters">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Sync
          </button>
          <button
            v-if="detail.skill.installed"
            class="button button-secondary"
            type="button"
            :title="`Re-fetch ${detail.skill.id} from its source`"
            @click="store.updateSkill(detail.skill.id)"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M16 12a4 4 0 11-8 0 4 4 0 018 0zM12 8V4m0 16v-4m4-4h4M4 12h4"/>
            </svg>
            Update
          </button>
          <button
            v-if="!detail.skill.installed"
            class="button button-primary"
            type="button"
            @click="store.installSkill(detail.skill)"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
            </svg>
            Install
          </button>
          <button
            v-else
            class="button button-danger"
            type="button"
            @click="store.removeSkill(detail.skill.id)"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            Remove
          </button>
        </div>
      </div>
    </div>

    <!--
      Skeletons during initial load: replace the spinner-only block with
      structural placeholders that mirror the metadata grid + content body
      so the layout doesn't jump when the real data arrives.
    -->
    <template v-if="store.state.detailLoading && !detail">
      <div class="panel detail-skeleton-grid">
        <Skeleton variant="row" />
        <Skeleton variant="row" />
        <Skeleton variant="row" />
        <Skeleton variant="row" />
      </div>
      <div class="panel" style="padding:18px;display:grid;gap:10px;">
        <div class="skeleton-pill" style="width:30%;height:12px;border-radius:6px;"></div>
        <div class="skeleton-pill" style="width:90%;height:14px;border-radius:6px;"></div>
        <div class="skeleton-pill" style="width:80%;height:14px;border-radius:6px;"></div>
        <div class="skeleton-pill" style="width:60%;height:14px;border-radius:6px;"></div>
        <div class="skeleton-pill" style="width:75%;height:14px;border-radius:6px;"></div>
      </div>
    </template>

    <template v-else-if="detail">

      <!-- Metadata grid -->
      <div class="panel">
        <div class="detail-metadata-grid">
          <article class="metadata-card">
            <span>Skill ID</span>
            <strong style="font-family:monospace;font-size:0.82rem;">{{ detail.skill.id }}</strong>
          </article>
          <article class="metadata-card">
            <span>Source</span>
            <strong>{{ detail.skill.source.label || detail.skill.source.repo }}</strong>
          </article>
          <article class="metadata-card">
            <span>Version</span>
            <strong style="font-family:monospace;">v{{ detail.skill.version }}</strong>
          </article>
          <article class="metadata-card">
            <span>Installed</span>
            <strong :style="detail.skill.installed ? 'color:var(--accent)' : 'color:var(--text-muted)'">
              {{ detail.skill.installed ? "✓ Yes" : "No" }}
            </strong>
          </article>
        </div>

        <!-- Tags + compat -->
        <div class="detail-chip-sections">
          <div>
            <p class="section-label" style="margin:0 0 8px;display:block;">Tags</p>
            <div class="chip-row">
              <span v-for="tag in detail.skill.tags" :key="tag" class="chip">{{ tag }}</span>
              <span v-if="detail.skill.tags.length === 0" style="font-size:0.8rem;color:var(--text-dim)">—</span>
            </div>
          </div>
          <div>
            <p class="section-label" style="margin:0 0 8px;display:block;">Compatibility</p>
            <div class="chip-row">
              <span v-for="adapter in detail.skill.compatibility" :key="adapter" class="chip chip-accent">
                {{ adapter }}
              </span>
              <span v-if="detail.skill.compatibility.length === 0" style="font-size:0.8rem;color:var(--text-dim)">—</span>
            </div>
          </div>
        </div>
      </div>

      <!-- SKILL.md -->
      <div class="panel">
        <div class="panel-head">
          <div class="panel-head-title">
            <p class="eyebrow">Instructions</p>
            <h2>SKILL.md</h2>
            <p>Content rendered by the backend.</p>
          </div>
        </div>

        <div v-if="detail.instructionsError" class="error-card" style="margin:0 20px 20px;">
          <strong>Instructions unavailable</strong>
          <p>{{ detail.instructionsError }}</p>
        </div>

        <article v-else class="markdown-body" v-html="detail.instructionsHtml"></article>
      </div>

      <!--
        Related skills skeleton while the catalog is still loading (relatedSkills
        is computed off the catalog response, so an empty array could mean
        "loading" OR "no matches"). We only show the skeleton when the catalog
        itself hasn't resolved yet AND we already have a detail to compare to.
      -->
      <div v-if="relatedSkills.length === 0 && store.state.catalog === null" class="panel">
        <div class="panel-head">
          <div class="panel-head-title">
            <p class="eyebrow">You might also like</p>
            <h2>Related skills</h2>
          </div>
        </div>
        <div class="related-grid">
          <Skeleton v-for="n in 4" :key="`related-skel-${n}`" variant="card" />
        </div>
      </div>

      <!-- Related skills (by shared tags / category) -->
      <div v-else-if="relatedSkills.length > 0" class="panel">
        <div class="panel-head">
          <div class="panel-head-title">
            <p class="eyebrow">You might also like</p>
            <h2>Related skills</h2>
            <p>Suggested by shared tags{{ detail.skill.category ? ' and category' : '' }}.</p>
          </div>
        </div>
        <div class="related-grid">
          <button
            v-for="related in relatedSkills"
            :key="related.id"
            class="related-card"
            type="button"
            :title="related.description"
            @click="store.navigateToSkill(related.id)"
          >
            <div class="related-card-head">
              <strong>{{ related.name }}</strong>
              <span v-if="related.installed" class="related-installed-mark" aria-label="Installed">✓</span>
            </div>
            <p>{{ related.description }}</p>
            <div class="related-card-tags">
              <span v-for="tag in related.tags.slice(0, 3)" :key="tag" class="chip" style="height:18px;font-size:9px;padding:0 6px;">
                {{ tag }}
              </span>
            </div>
          </button>
        </div>
      </div>

    </template>

  </section>
</template>

<style scoped>
.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  padding: 0 20px 20px;
}

.related-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--line);
  background: rgba(24, 24, 27, 0.55);
  text-align: left;
  cursor: pointer;
  transition: border-color 150ms, background 150ms, transform 150ms;
}
.related-card:hover {
  border-color: var(--accent-ring);
  background: rgba(39, 39, 42, 0.7);
  transform: translateY(-1px);
}
.related-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.related-card-head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.related-card-head strong {
  color: var(--text);
  font-size: 0.85rem;
}

.related-installed-mark {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 10px;
  font-weight: 700;
}

.related-card p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.related-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

/* Breadcrumbs */
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--text-dim);
}
.breadcrumb-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: 0;
  padding: 4px 8px;
  border-radius: 6px;
  color: var(--text-muted);
  font: inherit;
  cursor: pointer;
  transition: background 120ms, color 120ms;
}
.breadcrumb-link:hover {
  background: var(--bg-hover);
  color: var(--text);
}
.breadcrumb-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.breadcrumb-sep {
  color: var(--text-dim);
  user-select: none;
}
.breadcrumb-segment {
  text-transform: capitalize;
  color: var(--text-muted);
}
.breadcrumb-current {
  color: var(--text);
  font-weight: 500;
  max-width: 320px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Skeleton block used when the metadata grid is still loading. */
.detail-skeleton-grid {
  padding: 14px;
  display: grid;
  gap: 8px;
}

/* Reused shimmer-pill from Skeleton.vue for inline placeholders in this page. */
.skeleton-pill {
  background: linear-gradient(
    90deg,
    rgba(63, 63, 70, 0.45) 0%,
    rgba(82, 82, 91, 0.65) 50%,
    rgba(63, 63, 70, 0.45) 100%
  );
  background-size: 200% 100%;
  animation: detail-shimmer 1.4s ease-in-out infinite;
}
@keyframes detail-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
