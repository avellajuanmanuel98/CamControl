<script setup lang="ts">
import { useToastStore } from "../stores/toast";

const toasts = useToastStore();
</script>

<template>
  <div class="toast-stack">
    <div v-for="t in toasts.items" :key="t.id" class="toast" :class="`toast-${t.kind}`" @click="toasts.dismiss(t.id)">
      {{ t.text }}
    </div>
  </div>
</template>
