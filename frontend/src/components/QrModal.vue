<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { api, apiErrorMessage } from "../services/api";
import { downloadQr, invalidateQr, loadQrObjectUrl } from "../services/qr";
import { useAuthStore } from "../stores/auth";
import { useToastStore } from "../stores/toast";
import { useConfirmStore } from "../stores/confirm";
import Icon from "./Icon.vue";
import type { Camera } from "../types";

const props = defineProps<{ camera: Camera }>();
const emit = defineEmits<{ close: []; updated: [camera: Camera] }>();

const auth = useAuthStore();
const toast = useToastStore();
const confirmDialog = useConfirmStore();
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
    toast.success("QR actualizado");
    await load();
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = "";
  }
}

async function remove() {
  const ok = await confirmDialog.ask({
    title: "Eliminar QR",
    message: "Se eliminará la imagen del QR de esta cámara.",
    confirmLabel: "Eliminar",
    danger: true,
  });
  if (!ok) return;
  try {
    await api.delete(`/cameras/${props.camera.id}/qr`);
    invalidateQr(props.camera.id);
    emit("updated", { ...props.camera, qrAsset: null });
    toast.success("QR eliminado");
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
    <div class="modal" style="max-width: 400px">
      <div class="modal-header">
        <h3 class="mono">QR — {{ camera.serialNumber }}</h3>
        <button class="icon-btn" @click="$emit('close')"><Icon name="close" :size="14" /></button>
      </div>

      <div class="modal-body">
        <div class="qr-view">
          <img v-if="src" :src="src" alt="QR ampliado" />
          <div v-else class="empty-state">Esta cámara no tiene un QR cargado todavía.</div>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
      </div>

      <div class="modal-actions">
        <button v-if="src" class="btn btn-sm" @click="download"><Icon name="download" :size="13" /> Descargar</button>
        <template v-if="auth.canManage">
          <button class="btn btn-sm" :disabled="uploading" @click="fileInput?.click()">
            <Icon :name="src ? 'refresh' : 'upload'" :size="13" /> {{ src ? "Reemplazar" : "Subir QR" }}
          </button>
          <button v-if="src" class="btn btn-sm btn-danger" @click="remove"><Icon name="trash" :size="13" /> Eliminar</button>
        </template>
        <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" hidden @change="onFileSelected" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.qr-view {
  background: white;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  padding: var(--space-4);
}
.qr-view img {
  max-width: 100%;
  max-height: 300px;
}
.empty-state {
  color: #6b6b6b;
  background: none;
  padding: 0;
}
.error {
  color: var(--offline);
  font-size: 12.5px;
  margin-top: var(--space-2);
}
</style>
