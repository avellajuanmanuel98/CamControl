<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { loadQrObjectUrl } from "../services/qr";

const props = defineProps<{ cameraId: string; hasQr: boolean; size?: number }>();
defineEmits<{ click: [] }>();

const src = ref<string | null>(null);
const loading = ref(false);

async function load() {
  if (!props.hasQr) {
    src.value = null;
    return;
  }
  loading.value = true;
  try {
    src.value = await loadQrObjectUrl(props.cameraId);
  } catch {
    src.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(() => [props.cameraId, props.hasQr], load);
</script>

<template>
  <button
    class="qr-thumb"
    :style="{ width: (size ?? 40) + 'px', height: (size ?? 40) + 'px' }"
    :disabled="!hasQr"
    @click="$emit('click')"
  >
    <img v-if="src" :src="src" alt="QR" />
    <span v-else-if="loading" class="placeholder">…</span>
    <span v-else class="placeholder">—</span>
  </button>
</template>

<style scoped>
.qr-thumb {
  padding: 0;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: white;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.qr-thumb:disabled {
  background: var(--surface-2);
  border-color: var(--border);
  cursor: default;
}
.qr-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.placeholder {
  color: var(--text-tertiary);
  font-size: 12px;
}
</style>
