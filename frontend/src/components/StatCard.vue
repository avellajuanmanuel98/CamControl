<script setup lang="ts">
defineProps<{
  label: string;
  value: number;
  color: string;
  icon: string;
  active?: boolean;
}>();
defineEmits<{ click: [] }>();
</script>

<template>
  <button class="stat-card" :class="{ active }" :style="{ '--c': color }" @click="$emit('click')">
    <div class="icon">{{ icon }}</div>
    <div class="value">{{ value }}</div>
    <div class="label">{{ label }}</div>
  </button>
</template>

<style scoped>
.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  text-align: left;
  cursor: pointer;
  color: var(--text);
  transition: transform 0.12s, border-color 0.12s;
  border-top: 3px solid var(--c);
}
.stat-card:hover {
  transform: translateY(-2px);
  border-color: var(--c);
}
.stat-card.active {
  box-shadow: 0 0 0 2px var(--c);
}
.icon {
  font-size: 20px;
  margin-bottom: 8px;
}
.value {
  font-size: 32px;
  font-weight: 800;
  color: var(--c);
  line-height: 1;
}
.label {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 600;
  letter-spacing: 0.02em;
}
</style>
