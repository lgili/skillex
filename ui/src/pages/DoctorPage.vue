<script setup lang="ts">
import { onMounted, ref } from "vue";
import Skeleton from "../components/Skeleton.vue";
import { useSkillexStore } from "../store";

interface DoctorCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  hint?: string;
}

interface DoctorReport {
  scope: "local" | "global";
  stateDir: string;
  checks: DoctorCheck[];
  hasFailures: boolean;
}

const store = useSkillexStore();
const report = ref<DoctorReport | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    report.value = await store.loadDoctor();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function symbolFor(status: DoctorCheck["status"]): string {
  return status === "fail" ? "✗" : status === "warn" ? "⚠" : "✓";
}
</script>

<template>
  <section class="doctor-page" style="padding:24px;display:grid;gap:16px;">
    <header class="panel" style="padding:20px;">
      <p class="eyebrow">Diagnostics</p>
      <h2 style="margin:6px 0 4px;">Doctor</h2>
      <p style="margin:0;color:var(--text-dim);font-size:13px;">
        Six health checks for the workspace and your environment.
      </p>
      <div style="margin-top:12px;display:flex;gap:8px;align-items:center;">
        <button class="button button-primary" type="button" :disabled="loading" @click="load">
          <span v-if="loading">Running...</span>
          <span v-else>Re-run checks</span>
        </button>
        <span v-if="report" style="font-size:12px;color:var(--text-dim);">
          Scope: {{ report.scope }} · State: <code style="font-family:monospace;">{{ report.stateDir }}</code>
        </span>
      </div>
    </header>

    <div v-if="error" class="status-banner" data-tone="error">{{ error }}</div>

    <!-- Skeleton during the first load. -->
    <div v-if="loading && !report" class="panel" style="padding:8px;display:grid;gap:8px;">
      <Skeleton v-for="n in 4" :key="`doctor-skel-${n}`" variant="row" />
    </div>

    <div v-else-if="report" class="panel" style="padding:0;overflow:hidden;">
      <div
        v-for="check in report.checks"
        :key="check.name"
        :data-status="check.status"
        style="display:grid;grid-template-columns:32px 110px 1fr;gap:14px;padding:14px 18px;border-bottom:1px solid rgba(63,63,70,0.3);align-items:start;"
      >
        <span
          :style="{
            fontWeight: 700,
            color:
              check.status === 'fail' ? 'var(--danger)'
              : check.status === 'warn' ? '#facc15'
              : 'var(--success, #34d399)',
          }"
        >
          {{ symbolFor(check.status) }}
        </span>
        <strong style="font-family:monospace;font-size:12px;color:var(--text);">{{ check.name }}</strong>
        <div>
          <p style="margin:0;color:var(--text);font-size:13px;">{{ check.message }}</p>
          <p v-if="check.hint" style="margin:6px 0 0;color:var(--text-dim);font-size:12px;">
            <strong style="color:var(--text-muted);">Hint:</strong> {{ check.hint }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="report && !report.hasFailures" class="status-banner" data-tone="success">
      All checks passed.
    </div>
  </section>
</template>
