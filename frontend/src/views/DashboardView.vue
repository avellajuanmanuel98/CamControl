<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useDashboardStore } from "../stores/dashboard";
import StatCard from "../components/StatCard.vue";
import { relativeTime } from "../utils/time";

const dashboard = useDashboardStore();
const router = useRouter();

onMounted(() => {
  dashboard.fetchSummary();
  dashboard.connectStream();
});
onUnmounted(() => dashboard.disconnectStream());

function goToCameras(status?: string, siteId?: string) {
  router.push({ name: "cameras", query: { ...(status ? { status } : {}), ...(siteId ? { siteId } : {}) } });
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p class="muted">
          Estado de conectividad de todas las cámaras
          <span v-if="dashboard.lastUpdated">· actualizado {{ relativeTime(dashboard.lastUpdated.toISOString()) }}</span>
        </p>
      </div>
      <div class="live-indicator" :class="{ live: dashboard.connected }">
        <span class="pulse" />
        {{ dashboard.connected ? "En vivo" : "Conectando..." }}
      </div>
    </div>

    <template v-if="dashboard.summary">
      <div class="stats-grid">
        <StatCard
          label="TOTAL CÁMARAS"
          :value="dashboard.summary.global.total"
          color="var(--accent)"
          icon="🎥"
          @click="goToCameras()"
        />
        <StatCard
          label="ONLINE"
          :value="dashboard.summary.global.ONLINE"
          color="var(--online)"
          icon="🟢"
          @click="goToCameras('ONLINE')"
        />
        <StatCard
          label="OFFLINE"
          :value="dashboard.summary.global.OFFLINE"
          color="var(--offline)"
          icon="🔴"
          @click="goToCameras('OFFLINE')"
        />
        <StatCard
          label="INTERMITENTES"
          :value="dashboard.summary.global.WARNING"
          color="var(--warning)"
          icon="🟡"
          @click="goToCameras('WARNING')"
        />
        <StatCard
          label="SIN CONFIGURAR"
          :value="dashboard.summary.global.UNCONFIGURED"
          color="var(--unconfigured)"
          icon="⚪"
          @click="goToCameras('UNCONFIGURED')"
        />
      </div>

      <h2 class="section-title">Por sede</h2>
      <div class="table-scroll card">
        <table>
          <thead>
            <tr>
              <th>Sede</th>
              <th>Total</th>
              <th>🟢 Online</th>
              <th>🔴 Offline</th>
              <th>🟡 Intermitente</th>
              <th>⚪ Sin configurar</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in dashboard.summary.bySite"
              :key="row.siteId"
              class="clickable"
              @click="goToCameras(undefined, row.siteId)"
            >
              <td><strong>{{ row.siteName }}</strong></td>
              <td>{{ row.total }}</td>
              <td>{{ row.ONLINE }}</td>
              <td>{{ row.OFFLINE }}</td>
              <td>{{ row.WARNING }}</td>
              <td>{{ row.UNCONFIGURED }}</td>
            </tr>
            <tr v-if="dashboard.summary.bySite.length === 0">
              <td colspan="6" class="muted">No hay cámaras registradas todavía.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 12px;
  flex-wrap: wrap;
}
h1 {
  margin: 0 0 4px;
  font-size: 24px;
}
.section-title {
  font-size: 16px;
  margin: 28px 0 12px;
  color: var(--text-muted);
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
}
.live-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px solid var(--border);
  padding: 6px 12px;
  border-radius: 999px;
}
.pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--unconfigured);
}
.live-indicator.live .pulse {
  background: var(--online);
  box-shadow: 0 0 6px var(--online);
  animation: pulse 1.6s infinite;
}
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
}
.clickable {
  cursor: pointer;
}
</style>
