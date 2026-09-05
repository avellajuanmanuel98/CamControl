<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, apiErrorMessage } from "../services/api";
import { useToastStore } from "../stores/toast";
import QrThumb from "../components/QrThumb.vue";
import QrModal from "../components/QrModal.vue";
import StatusBadge from "../components/StatusBadge.vue";
import Icon from "../components/Icon.vue";
import { friendlyDateTime, relativeTime, downDuration } from "../utils/time";
import type { Camera, CameraStatusEvent, Site } from "../types";

const props = defineProps<{ id?: string }>();
const route = useRoute();
const router = useRouter();
const toast = useToastStore();

const isEdit = !!props.id;
const sites = ref<Site[]>([]);
const loading = ref(isEdit);
const saving = ref(false);
const error = ref("");
const camera = ref<Camera | null>(null);
const showQrModal = ref(false);
const history = ref<CameraStatusEvent[]>([]);

const form = ref({
  serialNumber: "",
  code: "",
  cifrado: "",
  capacidad: "",
  sharedUser: "",
  model: "",
  observations: "",
  ipAddress: "",
  macAddress: "",
  hostname: "",
  port: "" as string | number,
  ezvizDeviceSerial: "",
  siteId: (route.query.siteId as string) || "",
  status: "UNCONFIGURED",
});

async function loadSites() {
  const { data } = await api.get<Site[]>("/sites");
  sites.value = data;
  if (!form.value.siteId && data.length) form.value.siteId = data[0].id;
}

async function loadHistory() {
  if (!props.id) return;
  const { data } = await api.get<CameraStatusEvent[]>(`/cameras/${props.id}/history`, { params: { limit: 30 } });
  history.value = data;
}

async function loadCamera() {
  if (!props.id) return;
  const { data } = await api.get<Camera>(`/cameras/${props.id}`);
  camera.value = data;
  form.value = {
    serialNumber: data.serialNumber,
    code: data.code ?? "",
    cifrado: data.cifrado ?? "",
    capacidad: data.capacidad ?? "",
    sharedUser: data.sharedUser ?? "",
    model: data.model ?? "",
    observations: data.observations ?? "",
    ipAddress: data.ipAddress ?? "",
    macAddress: data.macAddress ?? "",
    hostname: data.hostname ?? "",
    port: data.port ?? "",
    ezvizDeviceSerial: data.ezvizDeviceSerial ?? "",
    siteId: data.siteId,
    status: data.status,
  };
}

async function submit() {
  saving.value = true;
  error.value = "";
  try {
    const payload = {
      ...form.value,
      code: form.value.code || null,
      cifrado: form.value.cifrado || null,
      capacidad: form.value.capacidad || null,
      sharedUser: form.value.sharedUser || null,
      model: form.value.model || null,
      observations: form.value.observations || null,
      ipAddress: form.value.ipAddress || null,
      macAddress: form.value.macAddress || null,
      hostname: form.value.hostname || null,
      ezvizDeviceSerial: form.value.ezvizDeviceSerial || null,
      port: form.value.port ? Number(form.value.port) : null,
    };
    if (isEdit) {
      await api.put(`/cameras/${props.id}`, payload);
      toast.success("Cambios guardados");
      router.push({ name: "cameras" });
    } else {
      const { data } = await api.post("/cameras", payload);
      toast.success("Cámara creada");
      // Jump straight into edit mode so the QR can be uploaded right away.
      router.push({ name: "camera-edit", params: { id: data.id } });
    }
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    saving.value = false;
  }
}

function onQrUpdated(updated: Camera) {
  if (camera.value) camera.value.qrAsset = updated.qrAsset;
}

onMounted(async () => {
  await loadSites();
  if (isEdit) {
    await Promise.all([loadCamera(), loadHistory()]);
    loading.value = false;
  }
});
</script>

<template>
  <div class="detail-page">
    <div class="page-header">
      <div class="title-row">
        <router-link class="icon-btn" :to="{ name: 'cameras' }" title="Volver al listado">
          <Icon name="chevron-left" :size="16" />
        </router-link>
        <h1 class="mono">{{ isEdit ? form.serialNumber || "Cámara" : "Nueva cámara" }}</h1>
        <StatusBadge v-if="camera" :status="camera.status" />
      </div>
    </div>

    <p v-if="loading" class="dim">Cargando…</p>

    <form v-else @submit.prevent="submit">
      <div class="detail-grid">
        <div class="main-col">
          <section class="panel">
            <div class="panel-header"><h2>Información</h2></div>
            <div class="panel-body field-grid">
              <div class="field">
                <label>S/N *</label>
                <input v-model="form.serialNumber" required class="mono" placeholder="Ej. BA4241638" />
              </div>
              <div class="field">
                <label>Código</label>
                <input v-model="form.code" />
              </div>
              <div class="field">
                <label>Sede *</label>
                <select v-model="form.siteId" required>
                  <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </div>
              <div class="field">
                <label>Modelo</label>
                <input v-model="form.model" placeholder="Ej. EZVIZ C6N" />
              </div>
              <div class="field">
                <label>IP</label>
                <input v-model="form.ipAddress" class="mono" placeholder="Opcional" />
              </div>
              <div class="field">
                <label>MAC</label>
                <input v-model="form.macAddress" class="mono" placeholder="Opcional" />
              </div>
              <div class="field">
                <label>Hostname</label>
                <input v-model="form.hostname" placeholder="Opcional" />
              </div>
              <div class="field">
                <label>Puerto</label>
                <input v-model="form.port" type="number" placeholder="Opcional" />
              </div>
              <div class="field">
                <label>Cifrado</label>
                <input v-model="form.cifrado" />
              </div>
              <div class="field">
                <label>Capacidad</label>
                <input v-model="form.capacidad" placeholder="Ej. 128GB / plan cloud" />
              </div>
              <div class="field">
                <label>Usuario compartido</label>
                <input v-model="form.sharedUser" />
              </div>
              <div class="field">
                <label>Serial EZVIZ</label>
                <input v-model="form.ezvizDeviceSerial" class="mono" placeholder="Autocompletado al leer el QR" />
              </div>
              <div class="field field-full">
                <label>Observaciones</label>
                <textarea v-model="form.observations" rows="2" />
              </div>
            </div>
          </section>

          <section v-if="isEdit && camera" class="panel">
            <div class="panel-header"><h2>Conectividad</h2></div>
            <div class="panel-body">
              <dl class="stat-grid">
                <div>
                  <dt>Estado actual</dt>
                  <dd><StatusBadge :status="camera.status" /></dd>
                </div>
                <div>
                  <dt>Latencia</dt>
                  <dd class="mono">{{ camera.lastLatencyMs != null ? `${camera.lastLatencyMs} ms` : "—" }}</dd>
                </div>
                <div>
                  <dt>Última comprobación</dt>
                  <dd>{{ relativeTime(camera.lastCheckedAt) }}</dd>
                </div>
                <div>
                  <dt>Última conexión</dt>
                  <dd>{{ friendlyDateTime(camera.lastOnlineAt) }}</dd>
                </div>
                <div>
                  <dt>Tiempo offline</dt>
                  <dd>{{ camera.status === "OFFLINE" ? downDuration(camera.lastOnlineAt) : "—" }}</dd>
                </div>
                <div>
                  <dt>Fallos consecutivos</dt>
                  <dd class="mono">{{ camera.consecutiveFails }}</dd>
                </div>
              </dl>

              <div class="override-row">
                <label style="margin: 0">Forzar estado manualmente</label>
                <select v-model="form.status" class="override-select">
                  <option value="UNCONFIGURED">Sin configurar</option>
                  <option value="ONLINE">Online</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="WARNING">Intermitente</option>
                </select>
                <span class="dim field-hint" style="margin: 0">Se sobrescribe en la próxima verificación automática.</span>
              </div>
            </div>
          </section>

          <section v-if="isEdit" class="panel">
            <div class="panel-header">
              <h2>Historial</h2>
              <span class="dim" style="font-size: 11.5px">cambios de estado</span>
            </div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Origen</th>
                    <th class="num">Latencia</th>
                    <th>Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="event in history" :key="event.id">
                    <td><StatusBadge :status="event.status" /></td>
                    <td>{{ friendlyDateTime(event.checkedAt) }}</td>
                    <td class="dim">{{ event.source }}</td>
                    <td class="num">{{ event.latencyMs != null ? `${event.latencyMs} ms` : "—" }}</td>
                    <td class="dim">{{ event.message || "—" }}</td>
                  </tr>
                  <tr v-if="history.length === 0">
                    <td colspan="5" class="empty-state">
                      Sin cambios de estado registrados todavía. Se generarán automáticamente cuando el
                      monitoreo EZVIZ esté activo, o al usar "Verificar ahora" desde el listado.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div class="side-col">
          <section v-if="isEdit && camera" class="panel">
            <div class="panel-header"><h2>Código QR</h2></div>
            <div class="panel-body qr-panel">
              <QrThumb :camera-id="camera.id" :has-qr="!!camera.qrAsset" :size="150" @click="showQrModal = true" />
              <button type="button" class="btn btn-sm" style="width: 100%; justify-content: center" @click="showQrModal = true">
                {{ camera.qrAsset ? "Ver / reemplazar" : "Subir QR" }}
              </button>
            </div>
          </section>
        </div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="form-actions">
        <router-link class="btn" :to="{ name: 'cameras' }">Cancelar</router-link>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear y continuar" }}
        </button>
      </div>
    </form>

    <QrModal v-if="showQrModal && camera" :camera="camera" @close="showQrModal = false" @updated="onQrUpdated" />
  </div>
</template>

<style scoped>
.title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.title-row h1 {
  font-size: 16px;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: var(--space-4);
  align-items: start;
}
.main-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}
.side-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.field-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0 var(--space-4);
}
.field-full {
  grid-column: 1 / -1;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  margin: 0;
}
.stat-grid dt {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}
.stat-grid dd {
  margin: 0;
  font-size: 13px;
}
.override-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}
.override-select {
  width: auto;
  min-width: 160px;
  height: 28px;
}
.qr-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
.error {
  color: var(--offline);
  margin-top: var(--space-3);
}

@media (max-width: 860px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .field-grid,
  .stat-grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 520px) {
  .field-grid,
  .stat-grid {
    grid-template-columns: 1fr;
  }
}
</style>
