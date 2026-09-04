<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, apiErrorMessage } from "../services/api";
import { useAuthStore } from "../stores/auth";
import StatusBadge from "../components/StatusBadge.vue";
import QrThumb from "../components/QrThumb.vue";
import QrModal from "../components/QrModal.vue";
import { relativeTime, friendlyDateTime, downDuration } from "../utils/time";
import type { Camera, CameraStatus, Site } from "../types";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const cameras = ref<Camera[]>([]);
const total = ref(0);
const sites = ref<Site[]>([]);
const loading = ref(true);
const error = ref("");
const checkingId = ref<string | null>(null);
const qrCamera = ref<Camera | null>(null);

const filters = reactive({
  siteId: (route.query.siteId as string) || "",
  status: (route.query.status as CameraStatus | "") || "",
  search: (route.query.search as string) || "",
});

async function loadSites() {
  const { data } = await api.get<Site[]>("/sites");
  sites.value = data;
}

async function loadCameras() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await api.get("/cameras", {
      params: {
        siteId: filters.siteId || undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
        pageSize: 100,
      },
    });
    cameras.value = data.items;
    total.value = data.total;
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  router.replace({
    query: {
      ...(filters.siteId ? { siteId: filters.siteId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search ? { search: filters.search } : {}),
    },
  });
}

watch(filters, applyFilters);
watch(() => route.query, loadCameras);

async function removeCamera(camera: Camera) {
  if (!confirm(`¿Eliminar la cámara ${camera.serialNumber}? Esto también borra su QR e historial.`)) return;
  try {
    await api.delete(`/cameras/${camera.id}`);
    await loadCameras();
  } catch (err) {
    alert(apiErrorMessage(err));
  }
}

async function checkNow(camera: Camera) {
  checkingId.value = camera.id;
  try {
    await api.post(`/monitoring/cameras/${camera.id}/check`);
    await loadCameras();
  } catch (err) {
    alert(apiErrorMessage(err));
  } finally {
    checkingId.value = null;
  }
}

function onQrUpdated(updated: Camera) {
  const idx = cameras.value.findIndex((c) => c.id === updated.id);
  if (idx !== -1) cameras.value[idx] = { ...cameras.value[idx], qrAsset: updated.qrAsset };
  qrCamera.value = { ...qrCamera.value!, qrAsset: updated.qrAsset };
}

const activeFilterLabel = computed(() => {
  const parts: string[] = [];
  if (filters.status) parts.push(`estado: ${filters.status}`);
  if (filters.siteId) parts.push(`sede: ${sites.value.find((s) => s.id === filters.siteId)?.name ?? filters.siteId}`);
  return parts.join(" · ");
});

onMounted(async () => {
  await loadSites();
  await loadCameras();
});
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Cámaras</h1>
        <p class="muted">{{ total }} cámara(s) {{ activeFilterLabel ? `· ${activeFilterLabel}` : "" }}</p>
      </div>
      <router-link v-if="auth.canManage" class="btn btn-primary" :to="{ name: 'camera-new' }">+ Nueva cámara</router-link>
    </div>

    <div class="filters card">
      <div class="form-field">
        <label>Sede</label>
        <select v-model="filters.siteId">
          <option value="">Todas</option>
          <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
      <div class="form-field">
        <label>Estado</label>
        <select v-model="filters.status">
          <option value="">Todos</option>
          <option value="ONLINE">🟢 Online</option>
          <option value="OFFLINE">🔴 Offline</option>
          <option value="WARNING">🟡 Intermitente</option>
          <option value="UNCONFIGURED">⚪ Sin configurar</option>
        </select>
      </div>
      <div class="form-field search">
        <label>Buscar</label>
        <input v-model="filters.search" placeholder="S/N, código, modelo, IP..." />
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="table-scroll card">
      <table>
        <thead>
          <tr>
            <th>Estado</th>
            <th>S/N</th>
            <th>Código</th>
            <th>Modelo</th>
            <th>Sede</th>
            <th>IP / Host</th>
            <th>QR</th>
            <th>Últ. comprobación</th>
            <th>Últ. online</th>
            <th>Latencia</th>
            <th>Usuario compartido</th>
            <th v-if="auth.canManage">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cam in cameras" :key="cam.id">
            <td>
              <StatusBadge :status="cam.status" />
              <div v-if="cam.status === 'OFFLINE'" class="down-since muted">
                lleva {{ downDuration(cam.lastOnlineAt) }} offline
              </div>
            </td>
            <td><strong>{{ cam.serialNumber }}</strong></td>
            <td>{{ cam.code || "—" }}</td>
            <td>{{ cam.model || "—" }}</td>
            <td>{{ cam.site.name }}</td>
            <td>{{ cam.ipAddress || cam.hostname || "—" }}</td>
            <td>
              <QrThumb :camera-id="cam.id" :has-qr="!!cam.qrAsset" @click="qrCamera = cam" />
            </td>
            <td>
              <span :title="cam.lastCheckedAt ?? ''">{{ relativeTime(cam.lastCheckedAt) }}</span>
            </td>
            <td>{{ friendlyDateTime(cam.lastOnlineAt) }}</td>
            <td>{{ cam.lastLatencyMs != null ? `${cam.lastLatencyMs} ms` : "—" }}</td>
            <td>{{ cam.sharedUser || "—" }}</td>
            <td v-if="auth.canManage" class="actions-cell">
              <button
                class="icon-btn"
                title="Verificar ahora"
                :disabled="checkingId === cam.id || !cam.ezvizDeviceSerial"
                @click="checkNow(cam)"
              >
                {{ checkingId === cam.id ? "⏳" : "🔄" }}
              </button>
              <router-link class="icon-btn" title="Editar" :to="{ name: 'camera-edit', params: { id: cam.id } }">✏️</router-link>
              <button v-if="auth.isAdmin" class="icon-btn" title="Eliminar" @click="removeCamera(cam)">🗑️</button>
            </td>
          </tr>
          <tr v-if="!loading && cameras.length === 0">
            <td :colspan="auth.canManage ? 12 : 11" class="muted">No se encontraron cámaras con estos filtros.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <QrModal v-if="qrCamera" :camera="qrCamera" @close="qrCamera = null" @updated="onQrUpdated" />
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}
h1 {
  margin: 0 0 4px;
  font-size: 24px;
}
.filters {
  display: flex;
  gap: 16px;
  padding: 16px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.filters .form-field {
  margin-bottom: 0;
  min-width: 160px;
}
.filters .search {
  flex: 1;
  min-width: 220px;
}
.down-since {
  font-size: 11px;
  margin-top: 3px;
}
.actions-cell {
  display: flex;
  gap: 6px;
}
.icon-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  padding: 5px 8px;
  color: var(--text);
  text-decoration: none;
  display: inline-flex;
}
.icon-btn:hover {
  border-color: var(--accent);
}
.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.error {
  color: var(--offline);
  margin-bottom: 12px;
}
</style>
