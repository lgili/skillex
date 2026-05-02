<script setup lang="ts">
import type { CatalogSkill } from "../types";

const props = defineProps<{
  skill: CatalogSkill;
  onOpen: (skillId: string) => void;
  onInstall: (skill: CatalogSkill) => Promise<void>;
  onRemove: (skillId: string) => Promise<void>;
}>();

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
</script>

<template>
  <article
    class="skill-card"
    :class="{ 'is-installed': skill.installed }"
    @click="onOpen(skill.id)"
  >
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
          <span class="verified-badge">
            <svg width="10" height="10" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"/>
            </svg>
            Oficial
          </span>
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
        <h3>{{ skill.name }}</h3>
        <span class="version-badge">v{{ skill.version }}</span>
      </div>

      <!-- Description -->
      <p class="skill-description">{{ skill.description }}</p>

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
        <img
          :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${skill.author || skill.source.repo}`"
          :alt="skill.author || skill.source.repo"
        />
        {{ skill.author || skill.source.repo }}
      </div>

      <div class="skill-card-actions" @click.stop>
        <template v-if="skill.installed">
          <span class="installed-label">Installed</span>
          <button class="remove-btn" type="button" title="Remove" @click="onRemove(skill.id)">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            @click="onInstall(skill)"
          >
            <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
            </svg>
            Install
          </button>
        </template>
      </div>
    </div>
  </article>
</template>
