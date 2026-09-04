<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { api, apiErrorMessage } from "../services/api";
import { downloadQr, invalidateQr, loadQrObjectUrl } from "../services/qr";
import { useAuthStore } from "../stores/auth";
import type { Camera } from "../types";

const props = defineProps<{ camera: Camera }>();
const emit = defineEmits<{ close: []; updated: [camera: Camera] }>();

const auth = useAuthStore();
const src = ref<string | null>(null);
const uploading = ref(false);
const error = ref("");
const fileInput = ref<HTMLInputElement | null>(null);

async function load() {
  if (!props.camera.qrAsset) {
    src.value = null;
    return;
  }
  try {
    src.value = await loadQrObjectUrl(props.camera.id);
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
}

async function onFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  uploading.value = true;
  error.value = "";
  try {
    const form = new FormData();
    form.append("qr", file);
    const { data } = await api.post(`/cameras/${props.camera.id}/qr`, form);
    invalidateQr(props.camera.id);
    emit("updated", data.camera);
    await load();
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = "";
  }
}

async function remove() {
  if (!confirm("¿Eliminar el QR de esta cámara?")) return;
  try {
    await api.delete(`/cameras/${props.camera.id}/qr`);
    invalidateQr(props.camera.id);
    emit("updated", { ...props.camera, qrAsset: null });
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
}

function download() {
  if (props.camera.qrAsset) {
    downloadQr(props.camera.id, props.camera.qrAsset.filename);
  }
}

onMounted(load);
watch(() => props.camera.id, load);
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="card modal">
      <div class="modal-header">
        <h3>QR — {{ camera.serialNumber }}</h3>
        <button class="icon-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="qr-view">
        <img v-if="src" :src="src" alt="QR ampliado" />
        <div v-else class="empty-state muted">Esta cámara no tiene un QR cargado todavía.</div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="modal-actions">
        <button v-if="src" class="btn" @click="download">⬇️ Descargar</button>
        <template v-if="auth.canManage">
          <button class="btn" :disabled="uploading" @click="fileInput?.click()">
            {{ src ? "🔄 Reemplazar" : "⬆️ Subir QR" }}
          </button>
          <button v-if="src" class="btn btn-danger" @click="remove">🗑️ Eliminar</button>
        </template>
        <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" hidden @change="onFileSelected" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 20px;
}
.modal {
  width: 100%;
  max-width: 420px;
  padding: 22px;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.modal-header h3 {
  margin: 0;
  font-size: 16px;
}
.icon-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 16px;
}
.qr-view {
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  padding: 16px;
}
.qr-view img {
  max-width: 100%;
  max-height: 320px;
}
.empty-state {
  color: #555;
  font-size: 13px;
  text-align: center;
}
.error {
  color: var(--offline);
  font-size: 13px;
  margin-top: 10px;
}
.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
}
</style>
