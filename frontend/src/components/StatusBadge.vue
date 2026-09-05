<script setup lang="ts">
import { computed } from "vue";
import type { CameraStatus } from "../types";

const props = defineProps<{ status: CameraStatus; sub?: string }>();

// Color alone never carries the meaning: each status also gets a distinct
// shape (circle / square / triangle / dashed circle) so it reads correctly
// for color-blind users and on a black & white printout. No badge/pill
// background — just a colored glyph next to plain text, the way a status
// column reads in Zabbix/PRTG/GitHub Actions rather than a UI-kit tag.
const meta = computed(() => {
  switch (props.status) {
    case "ONLINE":
      return { label: "Online", color: "var(--online)", shape: "circle" };
    case "OFFLINE":
      return { label: "Offline", color: "var(--offline)", shape: "square" };
    case "WARNING":
      return { label: "Intermitente", color: "var(--warning)", shape: "triangle" };
    default:
      return { label: "Sin configurar", color: "var(--neutral)", shape: "dashed" };
  }
});
</script>

<template>
  <span class="status-wrap">
    <span class="status">
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" :style="{ color: meta.color }">
        <circle v-if="meta.shape === 'circle'" cx="4" cy="4" r="4" fill="currentColor" />
        <rect v-else-if="meta.shape === 'square'" width="8" height="8" fill="currentColor" />
        <polygon v-else-if="meta.shape === 'triangle'" points="4,0 8,8 0,8" fill="currentColor" />
        <circle
          v-else
          cx="4"
          cy="4"
          r="3.2"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-dasharray="2 1.6"
        />
      </svg>
      <span class="status-label">{{ meta.label }}</span>
    </span>
    <span v-if="sub" class="status-sub dim">{{ sub }}</span>
  </span>
</template>

<style scoped>
.status-wrap {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
}
.status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.status-label {
  font-size: 12.5px;
  color: var(--text);
}
.status-sub {
  font-size: 11px;
}
</style>
