<script setup lang="ts">
import { computed } from "vue";
import type { CameraStatus } from "../types";

const props = defineProps<{ status: CameraStatus }>();

const meta = computed(() => {
  switch (props.status) {
    case "ONLINE":
      return { label: "ONLINE", dot: "🟢", color: "var(--online)" };
    case "OFFLINE":
      return { label: "OFFLINE", dot: "🔴", color: "var(--offline)" };
    case "WARNING":
      return { label: "INTERMITENTE", dot: "🟡", color: "var(--warning)" };
    default:
      return { label: "SIN CONFIGURAR", dot: "⚪", color: "var(--unconfigured)" };
  }
});
</script>

<template>
  <span class="badge" :style="{ '--c': meta.color }">
    <span class="dot">{{ meta.dot }}</span>
    {{ meta.label }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--c);
  background: color-mix(in srgb, var(--c) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 35%, transparent);
  white-space: nowrap;
}
.dot {
  font-size: 10px;
}
</style>
