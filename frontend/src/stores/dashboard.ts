import { defineStore } from "pinia";
import { api } from "../services/api";
import { useAuthStore } from "./auth";
import type { DashboardSummary } from "../types";

let eventSource: EventSource | null = null;

export const useDashboardStore = defineStore("dashboard", {
  state: () => ({
    summary: null as DashboardSummary | null,
    connected: false,
    lastUpdated: null as Date | null,
  }),
  actions: {
    async fetchSummary() {
      const { data } = await api.get<DashboardSummary>("/dashboard/summary");
      this.summary = data;
      this.lastUpdated = new Date();
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
