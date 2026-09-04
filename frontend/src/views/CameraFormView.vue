<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, apiErrorMessage } from "../services/api";
import QrThumb from "../components/QrThumb.vue";
import QrModal from "../components/QrModal.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { friendlyDateTime } from "../utils/time";
import type { Camera, CameraStatusEvent, Site } from "../types";

const props = defineProps<{ id?: string }>();
const route = useRoute();
const router = useRouter();

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
  const { data } = await api.get<CameraStatusEvent[]>(`/cameras/${props.id}/history`, { params: { limit: 20 } });
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
      hostname: form.value.hostname || null,
      ezvizDeviceSerial: form.value.ezvizDeviceSerial || null,
      port: form.value.port ? Number(form.value.port) : null,
    };
    if (isEdit) {
      await api.put(`/cameras/${props.id}`, payload);
      router.push({ name: "cameras" });
    } else {
      const { data } = await api.post("/cameras", payload);
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
  <div class="form-page">
    <div class="page-header">
      <h1>{{ isEdit ? "Editar cámara" : "Nueva cámara" }}</h1>
      <router-link class="btn" :to="{ name: 'cameras' }">← Volver al listado</router-link>
    </div>

    <p v-if="loading" class="muted">Cargando...</p>

    <div v-else class="layout">
      <form class="card form-card" @submit.prevent="submit">
        <div class="grid">
          <div class="form-field">
            <label>S/N *</label>
            <input v-model="form.serialNumber" required placeholder="Ej. BA4241638" />
          </div>
          <div class="form-field">
            <label>Código</label>
            <input v-model="form.code" />
          </div>
          <div class="form-field">
            <label>Sede *</label>
            <select v-model="form.siteId" required>
              <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div class="form-field">
            <label>Modelo</label>
            <input v-model="form.model" placeholder="Ej. EZVIZ C6N" />
          </div>
          <div class="form-field">
            <label>Cifrado</label>
            <input v-model="form.cifrado" />
          </div>
          <div class="form-field">
            <label>Capacidad</label>
            <input v-model="form.capacidad" placeholder="Ej. 128GB / Plan cloud" />
          </div>
          <div class="form-field">
            <label>Usuario compartido</label>
            <input v-model="form.sharedUser" />
          </div>
          <div class="form-field">
            <label>Estado (manual, se sobrescribe al monitorear)</label>
            <select v-model="form.status">
              <option value="UNCONFIGURED">Sin configurar</option>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
              <option value="WARNING">Intermitente</option>
            </select>
          </div>
          <div class="form-field">
            <label>Serial EZVIZ (para monitoreo)</label>
            <input v-model="form.ezvizDeviceSerial" placeholder="Se autocompleta si decodificamos el QR" />
          </div>
          <div class="form-field">
            <label>IP</label>
            <input v-model="form.ipAddress" placeholder="Opcional" />
          </div>
          <div class="form-field">
            <label>Hostname</label>
            <input v-model="form.hostname" placeholder="Opcional" />
          </div>
          <div class="form-field">
            <label>Puerto</label>
            <input v-model="form.port" type="number" placeholder="Opcional" />
          </div>
        </div>
        <div class="form-field">
          <label>Observaciones</label>
          <textarea v-model="form.observations" rows="3" />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <div class="form-actions">
          <router-link class="btn" :to="{ name: 'cameras' }">Cancelar</router-link>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear y continuar" }}
          </button>
        </div>
      </form>

      <div v-if="isEdit && camera" class="card qr-card">
        <h3>Código QR</h3>
        <p class="muted small">Foto del QR de EZVIZ asociado a esta cámara.</p>
        <QrThumb
          :camera-id="camera.id"
          :has-qr="!!camera.qrAsset"
          :size="140"
          style="margin: 0 auto"
          @click="showQrModal = true"
        />
        <button class="btn" style="margin-top: 12px; width: 100%; justify-content: center" @click="showQrModal = true">
          {{ camera.qrAsset ? "Ver / reemplazar" : "Subir QR" }}
        </button>

      </div>
    </div>

    <div v-if="isEdit && camera" class="card history-card">
      <h3>Historial de conectividad</h3>
      <p class="muted small">Últimas {{ history.length }} verificaciones registradas.</p>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Origen</th>
              <th>Latencia</th>
              <th>Mensaje</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="event in history" :key="event.id">
              <td><StatusBadge :status="event.status" /></td>
              <td>{{ friendlyDateTime(event.checkedAt) }}</td>
              <td>{{ event.source }}</td>
              <td>{{ event.latencyMs != null ? `${event.latencyMs} ms` : "—" }}</td>
              <td class="muted">{{ event.message || "—" }}</td>
            </tr>
            <tr v-if="history.length === 0">
              <td colspan="5" class="muted">
                Todavía no hay verificaciones registradas. Se generarán automáticamente cuando el
                monitoreo EZVIZ esté activo, o al usar "Verificar ahora" desde el listado.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <QrModal v-if="showQrModal && camera" :camera="camera" @close="showQrModal = false" @updated="onQrUpdated" />
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
h1 {
  margin: 0;
  font-size: 22px;
}
.layout {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 20px;
  align-items: start;
}
.form-card {
  padding: 24px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 20px;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}
.qr-card {
  padding: 20px;
  text-align: center;
}
.qr-card h3 {
  margin-top: 0;
}
.small {
  font-size: 12px;
}
.history-card {
  margin-top: 20px;
  padding: 20px;
}
.history-card h3 {
  margin-top: 0;
}
.error {
  color: var(--offline);
}

@media (max-width: 800px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
