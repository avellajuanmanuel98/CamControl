<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, apiErrorMessage } from "../services/api";
import { useAuthStore } from "../stores/auth";
import { useToastStore } from "../stores/toast";
import { useConfirmStore } from "../stores/confirm";
import StatusBadge from "../components/StatusBadge.vue";
import QrThumb from "../components/QrThumb.vue";
import QrModal from "../components/QrModal.vue";
import Icon from "../components/Icon.vue";
import { relativeTime, downDuration } from "../utils/time";
import type { Camera, CameraStatus, Site } from "../types";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToastStore();
const confirmDialog = useConfirmStore();

const cameras = ref<Camera[]>([]);
const total = ref(0);
const sites = ref<Site[]>([]);
const loading = ref(true);
const checkingId = ref<string | null>(null);
const qrCamera = ref<Camera | null>(null);

const PAGE_SIZE = 50;

const filters = reactive({
  siteId: (route.query.siteId as string) || "",
  status: (route.query.status as CameraStatus | "") || "",
  search: (route.query.search as string) || "",
});
const page = ref(1);
const sortBy = ref((route.query.sortBy as string) || "updatedAt");
const sortDir = ref<"asc" | "desc">((route.query.sortDir as "asc" | "desc") || "desc");

let searchDebounce: ReturnType<typeof setTimeout> | null = null;
const searchInput = ref(filters.search);
watch(searchInput, (val) => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    filters.search = val;
  }, 350);
});
onBeforeUnmount(() => {
  if (searchDebounce) clearTimeout(searchDebounce);
});

async function loadSites() {
  const { data } = await api.get<Site[]>("/sites");
  sites.value = data;
}

async function loadCameras() {
  loading.value = true;
  try {
    const { data } = await api.get("/cameras", {
      params: {
        siteId: filters.siteId || undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
        page: page.value,
        pageSize: PAGE_SIZE,
        sortBy: sortBy.value,
        sortDir: sortDir.value,
      },
    });
    cameras.value = data.items;
    total.value = data.total;
  } catch (err) {
    toast.error(apiErrorMessage(err));
  } finally {
    loading.value = false;
  }
}

function applyQuery() {
  router.replace({
    query: {
      ...(filters.siteId ? { siteId: filters.siteId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search ? { search: filters.search } : {}),
      ...(sortBy.value !== "updatedAt" ? { sortBy: sortBy.value } : {}),
      ...(sortDir.value !== "desc" ? { sortDir: sortDir.value } : {}),
    },
  });
}

watch(filters, () => {
  page.value = 1;
  applyQuery();
});
watch(() => route.query, loadCameras);

function toggleSort(field: string) {
  if (sortBy.value === field) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = field;
    sortDir.value = "asc";
  }
  applyQuery();
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)));
function goToPage(p: number) {
  page.value = Math.min(Math.max(1, p), totalPages.value);
  loadCameras();
}

async function removeCamera(camera: Camera) {
  const ok = await confirmDialog.ask({
    title: "Eliminar cámara",
    message: `Se eliminará ${camera.serialNumber} junto con su QR e historial. Esta acción no se puede deshacer.`,
    confirmLabel: "Eliminar",
    danger: true,
  });
  if (!ok) return;
  try {
    await api.delete(`/cameras/${camera.id}`);
    toast.success(`Cámara ${camera.serialNumber} eliminada`);
    await loadCameras();
  } catch (err) {
    toast.error(apiErrorMessage(err));
  }
}

async function checkNow(camera: Camera) {
  checkingId.value = camera.id;
  try {
    await api.post(`/monitoring/cameras/${camera.id}/check`);
    await loadCameras();
  } catch (err) {
    toast.error(apiErrorMessage(err));
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

const rangeStart = computed(() => (total.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1));
const rangeEnd = computed(() => Math.min(page.value * PAGE_SIZE, total.value));

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
        <p class="subtitle">{{ total }} cámara(s) {{ activeFilterLabel ? `· ${activeFilterLabel}` : "" }}</p>
      </div>
      <router-link v-if="auth.canManage" class="btn btn-primary" :to="{ name: 'camera-new' }">
        <Icon name="plus" :size="14" /> Nueva cámara
      </router-link>
    </div>

    <div class="panel toolbar">
      <select v-model="filters.siteId" class="toolbar-select">
        <option value="">Todas las sedes</option>
        <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <select v-model="filters.status" class="toolbar-select">
        <option value="">Todos los estados</option>
        <option value="ONLINE">Online</option>
        <option value="OFFLINE">Offline</option>
        <option value="WARNING">Intermitente</option>
        <option value="UNCONFIGURED">Sin configurar</option>
      </select>
      <div class="search-box">
        <Icon name="search" :size="14" class="dim" />
        <input v-model="searchInput" placeholder="Buscar por S/N, código, modelo, IP…" />
      </div>
    </div>

    <div class="panel">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th class="sortable" @click="toggleSort('status')">
                <span class="th-inner">Estado <Icon v-if="sortBy === 'status'" :name="sortDir === 'asc' ? 'chevron-up' : 'chevron-down'" :size="11" /></span>
              </th>
              <th class="sortable" @click="toggleSort('serialNumber')">
                <span class="th-inner">S/N <Icon v-if="sortBy === 'serialNumber'" :name="sortDir === 'asc' ? 'chevron-up' : 'chevron-down'" :size="11" /></span>
              </th>
              <th>Código</th>
              <th>Modelo</th>
              <th class="sortable" @click="toggleSort('site')">
                <span class="th-inner">Sede <Icon v-if="sortBy === 'site'" :name="sortDir === 'asc' ? 'chevron-up' : 'chevron-down'" :size="11" /></span>
              </th>
              <th>IP / Host</th>
              <th>QR</th>
              <th class="sortable" @click="toggleSort('lastCheckedAt')">
                <span class="th-inner">Últ. comprobación <Icon v-if="sortBy === 'lastCheckedAt'" :name="sortDir === 'asc' ? 'chevron-up' : 'chevron-down'" :size="11" /></span>
              </th>
              <th class="sortable" @click="toggleSort('statusChangedAt')">
                <span class="th-inner">Últ. cambio <Icon v-if="sortBy === 'statusChangedAt'" :name="sortDir === 'asc' ? 'chevron-up' : 'chevron-down'" :size="11" /></span>
              </th>
              <th class="sortable num" @click="toggleSort('lastLatencyMs')">
                <span class="th-inner">Latencia <Icon v-if="sortBy === 'lastLatencyMs'" :name="sortDir === 'asc' ? 'chevron-up' : 'chevron-down'" :size="11" /></span>
              </th>
              <th>Usuario compartido</th>
              <th v-if="auth.canManage">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cam in cameras" :key="cam.id">
              <td>
                <StatusBadge
                  :status="cam.status"
                  :sub="cam.status === 'OFFLINE' ? `desde hace ${downDuration(cam.lastOnlineAt)}` : undefined"
                />
              </td>
              <td class="mono"><strong>{{ cam.serialNumber }}</strong></td>
              <td>{{ cam.code || "—" }}</td>
              <td>{{ cam.model || "—" }}</td>
              <td>{{ cam.site.name }}</td>
              <td class="mono">{{ cam.ipAddress || cam.hostname || "—" }}</td>
              <td>
                <QrThumb :camera-id="cam.id" :has-qr="!!cam.qrAsset" @click="qrCamera = cam" />
              </td>
              <td><span :title="cam.lastCheckedAt ?? ''">{{ relativeTime(cam.lastCheckedAt) }}</span></td>
              <td>{{ relativeTime(cam.statusChangedAt) }}</td>
              <td class="num">{{ cam.lastLatencyMs != null ? `${cam.lastLatencyMs} ms` : "—" }}</td>
              <td>{{ cam.sharedUser || "—" }}</td>
              <td v-if="auth.canManage" class="actions-cell">
                <button
                  class="icon-btn"
                  title="Verificar ahora"
                  :disabled="checkingId === cam.id || !cam.ezvizDeviceSerial"
                  @click="checkNow(cam)"
                >
                  <Icon name="refresh" :size="14" />
                </button>
                <router-link class="icon-btn" title="Editar" :to="{ name: 'camera-edit', params: { id: cam.id } }">
                  <Icon name="edit" :size="14" />
                </router-link>
                <button v-if="auth.isAdmin" class="icon-btn danger" title="Eliminar" @click="removeCamera(cam)">
                  <Icon name="trash" :size="14" />
                </button>
              </td>
            </tr>
            <tr v-if="!loading && cameras.length === 0">
              <td :colspan="auth.canManage ? 12 : 11" class="empty-state">No se encontraron cámaras con estos filtros.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <span>{{ rangeStart }}–{{ rangeEnd }} de {{ total }}</span>
        <div class="pagination-controls">
          <button class="icon-btn" :disabled="page <= 1" @click="goToPage(page - 1)"><Icon name="chevron-left" :size="14" /></button>
          <span class="dim" style="padding: 0 6px">{{ page }} / {{ totalPages }}</span>
          <button class="icon-btn" :disabled="page >= totalPages" @click="goToPage(page + 1)"><Icon name="chevron-right" :size="14" /></button>
        </div>
      </div>
    </div>

    <QrModal v-if="qrCamera" :camera="qrCamera" @close="qrCamera = null" @updated="onQrUpdated" />
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}
.toolbar-select {
  width: auto;
  min-width: 150px;
}
.search-box {
  flex: 1;
  min-width: 220px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  padding: 0 10px;
  height: 32px;
}
.search-box input {
  border: none;
  background: none;
  height: 30px;
  padding: 0;
}
.search-box input:focus {
  box-shadow: none;
}
.actions-cell {
  display: flex;
  gap: 2px;
}
</style>
