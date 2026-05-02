<script setup lang="ts">
defineProps<{
  variant?: "card" | "row";
}>();
</script>

<template>
  <div v-if="variant === 'row'" class="skeleton skeleton-row">
    <div class="skeleton-pill" style="width:18px;height:18px;"></div>
    <div class="skeleton-pill" style="width:80px;height:14px;"></div>
    <div class="skeleton-pill" style="flex:1;height:14px;"></div>
  </div>

  <article v-else class="skeleton skeleton-card">
    <div class="skeleton-pill" style="width:48px;height:48px;border-radius:12px;"></div>
    <div class="skeleton-pill" style="width:65%;height:18px;"></div>
    <div class="skeleton-pill" style="width:90%;height:12px;"></div>
    <div class="skeleton-pill" style="width:75%;height:12px;"></div>
    <div style="display:flex;gap:6px;margin-top:8px;">
      <div class="skeleton-pill" style="width:60px;height:20px;border-radius:999px;"></div>
      <div class="skeleton-pill" style="width:48px;height:20px;border-radius:999px;"></div>
      <div class="skeleton-pill" style="width:80px;height:20px;border-radius:999px;"></div>
    </div>
    <div class="skeleton-pill" style="width:100%;height:36px;border-radius:10px;margin-top:12px;"></div>
  </article>
</template>

<style scoped>
.skeleton {
  border: 1px solid rgba(63, 63, 70, 0.4);
  border-radius: 14px;
  background: rgba(24, 24, 27, 0.6);
  display: flex;
}
.skeleton-card {
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  min-height: 230px;
}
.skeleton-row {
  flex-direction: row;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
}
.skeleton-pill {
  background: linear-gradient(
    90deg,
    rgba(63, 63, 70, 0.45) 0%,
    rgba(82, 82, 91, 0.65) 50%,
    rgba(63, 63, 70, 0.45) 100%
  );
  background-size: 200% 100%;
  border-radius: 6px;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}
@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
