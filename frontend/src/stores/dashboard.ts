import { defineStore } from "pinia";
import { api } from "../services/api";
import { useAuthStore } from "./auth";
import type { DashboardSummary, Incident, RecentEvent } from "../types";

let eventSource: EventSource | null = null;

export const useDashboardStore = defineStore("dashboard", {
  state: () => ({
    summary: null as DashboardSummary | null,
    incidents: [] as Incident[],
    recentEvents: [] as RecentEvent[],
    connected: false,
    lastUpdated: null as Date | null,
  }),
  actions: {
    async fetchSummary() {
      const { data } = await api.get<DashboardSummary>("/dashboard/summary");
      this.summary = data;
      this.lastUpdated = new Date();
    },
    async fetchIncidentsAndActivity() {
      const [incidents, events] = await Promise.all([
        api.get<Incident[]>("/dashboard/incidents"),
        api.get<RecentEvent[]>("/dashboard/recent-events"),
      ]);
      this.incidents = incidents.data;
      this.recentEvents = events.data;
    },
    connectStream() {
      if (eventSource) return;
      const auth = useAuthStore();
      if (!auth.token) return;

      const base = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api").replace(/\/$/, "");
      eventSource = new EventSource(`${base}/dashboard/stream?token=${encodeURIComponent(auth.token)}`);

      eventSource.addEventListener("summary", (event) => {
        this.summary = JSON.parse((event as MessageEvent).data);
        this.lastUpdated = new Date();
        this.connected = true;
      });

      // A camera changing state means the incidents list and activity feed
      // are stale too — refresh them alongside the summary.
      eventSource.addEventListener("camera", () => {
        this.fetchIncidentsAndActivity().catch(() => {});
      });

      eventSource.onerror = () => {
        // EventSource auto-reconnects; we just reflect the transient state.
        this.connected = false;
      };
    },
    disconnectStream() {
      eventSource?.close();
      eventSource = null;
      this.connected = false;
    },
  },
});
