<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { EZUIKitPlayer } from "ezuikit-js";
import { api, apiErrorMessage } from "../services/api";
import Icon from "./Icon.vue";
import type { Camera } from "../types";

const props = defineProps<{ camera: Camera }>();
defineEmits<{ close: [] }>();

const containerId = `live-view-${props.camera.id}`;
const loading = ref(true);
const error = ref("");
let player: EZUIKitPlayer | null = null;

// EZUIKit defaults its own internal calls (device list, stream quality,
// cloud recordings — separate from our own /live endpoint) to China's
// open.ys7.com unless told otherwise, which silently returns empty/wrong
// data for accounts outside China (confirmed: getDeviceList() came back []
// against the default domain). EZVIZ's SDK docs list a fixed domain per
// account region; this deployment's EZVIZ account is on the South America
// region (confirmed from the Open Platform console URL, isaopen.ezviz.com).
const EZVIZ_ENV_DOMAIN = "https://isaopen.ezvizlife.com";

async function start() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await api.get<{ accessToken: string; url: string }>(
      `/monitoring/cameras/${props.camera.id}/live`
    );
    player = new EZUIKitPlayer({
      id: containerId,
      accessToken: data.accessToken,
      url: data.url,
      width: 720,
      height: 405,
      template: "standard",
      // Serve the decoder locally (see scripts/copy-ezuikit-static.mjs)
      // instead of relying on EZVIZ's remote CDN, which can fail silently
      // on some networks and leave the player stuck on a black frame.
      staticPath: "/ezuikit_static",
      env: { domain: EZVIZ_ENV_DOMAIN },
      handleError: (err: { type?: string; data?: { nErrorCode?: number } }) => {
        if (err?.type === "handleRunTimeInfoError" && err?.data?.nErrorCode === 5) {
          error.value = "Código de verificación (cifrado) incorrecto o faltante para esta cámara.";
        } else {
          error.value = "Error al reproducir el video. Revisa el estado de conectividad de la cámara.";
        }
      },
    });
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

onMounted(start);
onBeforeUnmount(() => {
  player?.stop();
  player?.destroy();
});
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal" style="max-width: 760px">
      <div class="modal-header">
        <h3 class="mono">Video en vivo — {{ camera.serialNumber }}</h3>
        <button class="icon-btn" @click="$emit('close')"><Icon name="close" :size="14" /></button>
      </div>

      <div class="modal-body">
        <p v-if="error" class="error">{{ error }}</p>
        <div class="live-container">
          <div :id="containerId" class="live-canvas" />
          <p v-if="loading" class="dim loading-overlay">Conectando…</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.live-container {
  position: relative;
  background: #000;
  border-radius: var(--radius);
  overflow: hidden;
  min-height: 405px;
}
.live-canvas {
  width: 100%;
}
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cfcfcf;
  margin: 0;
}
.error {
  color: var(--offline);
  font-size: 12.5px;
  margin: 0 0 var(--space-2);
}
</style>
