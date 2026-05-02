<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When `"danger"`, the confirm button uses the danger styling. */
  tone?: "default" | "danger";
}>();

const emit = defineEmits<{
  (event: "confirm"): void;
  (event: "cancel"): void;
}>();

const dialogEl = ref<HTMLDivElement | null>(null);
const cancelBtn = ref<HTMLButtonElement | null>(null);

function onKeydown(event: KeyboardEvent): void {
  if (!props.open) return;
  if (event.key === "Escape") {
    event.preventDefault();
    emit("cancel");
  }
  if (event.key === "Enter" && document.activeElement?.tagName !== "BUTTON") {
    event.preventDefault();
    emit("confirm");
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return;
    // Defer focus until the DOM is mounted so the focus ring is visible.
    await new Promise((resolve) => setTimeout(resolve, 0));
    cancelBtn.value?.focus();
  },
);

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <transition name="confirm">
    <div
      v-if="open"
      ref="dialogEl"
      class="confirm-backdrop"
      role="presentation"
      @click.self="emit('cancel')"
    >
      <div
        class="confirm-card"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`confirm-title-${title.replace(/\s+/g, '-')}`"
      >
        <h3 :id="`confirm-title-${title.replace(/\s+/g, '-')}`" class="confirm-title">
          {{ title }}
        </h3>
        <p class="confirm-message">{{ message }}</p>
        <div class="confirm-actions">
          <button
            ref="cancelBtn"
            class="button button-ghost"
            type="button"
            @click="emit('cancel')"
          >
            {{ cancelLabel || "Cancel" }}
          </button>
          <button
            :class="['button', tone === 'danger' ? 'button-danger' : 'button-primary']"
            type="button"
            @click="emit('confirm')"
          >
            {{ confirmLabel || "Confirm" }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 16px;
}

.confirm-card {
  background: var(--bg-elevated);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-xl);
  padding: 24px;
  width: 100%;
  max-width: 440px;
  box-shadow: var(--shadow);
  animation: confirm-pop 180ms ease;
}

.confirm-title {
  margin: 0 0 8px;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
}

.confirm-message {
  margin: 0 0 20px;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

@keyframes confirm-pop {
  from {
    transform: scale(0.96);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 160ms ease;
}
.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}
</style>
