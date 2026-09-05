<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useDashboardStore } from "../stores/dashboard";
import StatusBadge from "../components/StatusBadge.vue";
import Icon from "../components/Icon.vue";
import { relativeTime, downDuration } from "../utils/time";

const dashboard = useDashboardStore();
const router = useRouter();

onMounted(() => {
  dashboard.fetchSummary();
  dashboard.fetchIncidentsAndActivity();
  dashboard.connectStream();
});
onUnmounted(() => dashboard.disconnectStream());

function goToCameras(status?: string, siteId?: string) {
  router.push({ name: "cameras", query: { ...(status ? { status } : {}), ...(siteId ? { siteId } : {}) } });
}

function goToCamera(id: string) {
  router.push({ name: "camera-edit", params: { id } });
}

// Sites with the most trouble first — that's what a technician needs to see.
const sitesBySeverity = computed(() => {
  if (!dashboard.summary) return [];
  return [...dashboard.summary.bySite].sort((a, b) => b.OFFLINE * 10 + b.WARNING - (a.OFFLINE * 10 + a.WARNING));
});

const kpis = computed(() => {
  const g = dashboard.summary?.global;
  return [
    { key: "", label: "Total", value: g?.total ?? 0, color: "var(--text)" },
    { key: "ONLINE", label: "Online", value: g?.ONLINE ?? 0, color: "var(--online)" },
    { key: "OFFLINE", label: "Offline", value: g?.OFFLINE ?? 0, color: "var(--offline)" },
    { key: "WARNING", label: "Intermitente", value: g?.WARNING ?? 0, color: "var(--warning)" },
    { key: "UNCONFIGURED", label: "Sin configurar", value: g?.UNCONFIGURED ?? 0, color: "var(--neutral)" },
  ];
});

function eventLabel(status: string) {
  if (status === "ONLINE") return "volvió a estar online";
  if (status === "OFFLINE") return "pasó a offline";
  if (status === "WARNING") return "se volvió intermitente";
  return "cambió de estado";
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p class="subtitle">
          Estado de conectividad de todas las cámaras
          <span v-if="dashboard.lastUpdated">· actualizado {{ relativeTime(dashboard.lastUpdated.toISOString()) }}</span>
        </p>
      </div>
      <div class="live-indicator" :class="{ live: dashboard.connected }">
        <span class="pulse" />
        {{ dashboard.connected ? "En vivo" : "Conectando…" }}
      </div>
    </div>

    <template v-if="dashboard.summary">
      <!-- KPI strip: one cohesive panel, not four separate giant cards -->
      <div class="panel kpi-strip">
        <button v-for="k in kpis" :key="k.label" class="kpi" @click="goToCameras(k.key || undefined)">
          <span class="kpi-value" :style="{ color: k.color }">{{ k.value }}</span>
          <span class="kpi-label">{{ k.label }}</span>
        </button>
      </div>

      <div class="dash-grid">
        <div class="panel">
          <div class="panel-header">
            <h2>Sedes</h2>
            <span class="dim" style="font-size: 11.5px">ordenadas por severidad</span>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Sede</th>
                  <th class="num">Total</th>
                  <th class="num">Online</th>
                  <th class="num">Offline</th>
                  <th class="num">Intermitente</th>
                  <th class="num">Sin config.</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in sitesBySeverity"
                  :key="row.siteId"
                  class="clickable"
                  @click="goToCameras(undefined, row.siteId)"
                >
                  <td><strong>{{ row.siteName }}</strong></td>
                  <td class="num">{{ row.total }}</td>
                  <td class="num" :style="{ color: row.ONLINE ? 'var(--online)' : undefined }">{{ row.ONLINE }}</td>
                  <td class="num" :style="{ color: row.OFFLINE ? 'var(--offline)' : undefined }">{{ row.OFFLINE }}</td>
                  <td class="num" :style="{ color: row.WARNING ? 'var(--warning)' : undefined }">{{ row.WARNING }}</td>
                  <td class="num dim">{{ row.UNCONFIGURED }}</td>
                </tr>
                <tr v-if="sitesBySeverity.length === 0">
                  <td colspan="6" class="empty-state">No hay cámaras registradas todavía.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="side-col">
          <div class="panel">
            <div class="panel-header">
              <h2>Incidentes activos</h2>
              <span class="tag tag-offline" v-if="dashboard.incidents.length">{{ dashboard.incidents.length }}</span>
            </div>
            <ul class="incident-list">
              <li v-for="inc in dashboard.incidents" :key="inc.id" class="incident-row" @click="goToCamera(inc.id)">
                <StatusBadge :status="inc.status" />
                <div class="incident-main">
                  <div class="mono">{{ inc.serialNumber }}</div>
                  <div class="dim" style="font-size: 11px">{{ inc.site.name }}</div>
                </div>
                <div class="incident-duration dim">{{ downDuration(inc.lastOnlineAt) }}</div>
              </li>
              <li v-if="dashboard.incidents.length === 0" class="empty-state">Sin incidentes activos.</li>
            </ul>
          </div>

          <div class="panel">
            <div class="panel-header">
              <h2>Actividad reciente</h2>
            </div>
            <ul class="activity-list">
              <li v-for="ev in dashboard.recentEvents" :key="ev.id" class="activity-row">
                <Icon name="activity" :size="13" class="dim" />
                <span>
                  <strong class="mono">{{ ev.camera.serialNumber }}</strong>
                  {{ eventLabel(ev.status) }}
                  <span class="dim">· {{ ev.camera.site.name }}</span>
                </span>
                <span class="dim activity-time">{{ relativeTime(ev.checkedAt) }}</span>
              </li>
              <li v-if="dashboard.recentEvents.length === 0" class="empty-state">Sin actividad registrada todavía.</li>
            </ul>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.live-indicator {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--text-secondary);
  padding-top: 2px;
}
.pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--neutral);
}
.live-indicator.live .pulse {
  background: var(--online);
}

.kpi-strip {
  display: flex;
  margin-bottom: var(--space-4);
  overflow-x: auto;
}
.kpi {
  flex: 1;
  min-width: 120px;
  background: none;
  border: none;
  border-right: 1px solid var(--border);
  cursor: pointer;
  padding: var(--space-4);
  text-align: left;
  font-family: inherit;
}
.kpi:last-child {
  border-right: none;
}
.kpi:hover {
  background: var(--surface-2);
}
.kpi-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.kpi-label {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.dash-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: var(--space-4);
  align-items: start;
}
.side-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.clickable {
  cursor: pointer;
}

.incident-list,
.activity-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 320px;
  overflow-y: auto;
}
.incident-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 9px var(--space-4);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}
.incident-row:last-child {
  border-bottom: none;
}
.incident-row:hover {
  background: var(--surface-2);
}
.incident-main {
  flex: 1;
  min-width: 0;
}
.incident-duration {
  font-size: 11px;
  white-space: nowrap;
}

.activity-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px var(--space-4);
  border-bottom: 1px solid var(--border);
  font-size: 12px;
}
.activity-row:last-child {
  border-bottom: none;
}
.activity-time {
  margin-left: auto;
  font-size: 11px;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .dash-grid {
    grid-template-columns: 1fr;
  }
  .kpi-strip {
    flex-wrap: nowrap;
  }
}
</style>
