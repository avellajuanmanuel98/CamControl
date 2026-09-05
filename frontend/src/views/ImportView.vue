<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, apiErrorMessage } from "../services/api";
import { useToastStore } from "../stores/toast";
import type { ImportReport, Site } from "../types";

const sites = ref<Site[]>([]);
const defaultSiteId = ref("");
const duplicateStrategy = ref<"skip" | "update">("skip");
const file = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const report = ref<ImportReport | null>(null);
const committed = ref(false);
const loading = ref(false);
const error = ref("");
const toast = useToastStore();

const ACTION_TAG: Record<string, string> = {
  create: "tag-online",
  update: "tag-accent",
  skip: "tag-warning",
  error: "tag-offline",
};

function onFileSelected(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null;
  report.value = null;
  committed.value = false;
}

async function run(dryRun: boolean) {
  if (!file.value) return;
  loading.value = true;
  error.value = "";
  try {
    const form = new FormData();
    form.append("file", file.value);
    if (defaultSiteId.value) form.append("defaultSiteId", defaultSiteId.value);
    form.append("duplicateStrategy", duplicateStrategy.value);
    form.append("dryRun", String(dryRun));
    const { data } = await api.post<ImportReport>("/import", form);
    report.value = data;
    committed.value = !dryRun;
    if (!dryRun) toast.success(`Importación completada: ${data.created} creadas, ${data.updated} actualizadas`);
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

function reset() {
  file.value = null;
  report.value = null;
  committed.value = false;
  if (fileInput.value) fileInput.value.value = "";
}

onMounted(async () => {
  const { data } = await api.get<Site[]>("/sites");
  sites.value = data;
});
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Importar cámaras</h1>
        <p class="subtitle">
          Carga el Excel/CSV con las columnas S/N, CODIGO, CIFRADO, CAPACIDAD, User_Compartidos, ESTADO y
          opcionalmente SEDE. El QR se sube por separado, después de importar.
        </p>
      </div>
    </div>

    <div class="panel panel-body" style="margin-bottom: var(--space-4)">
      <div class="field">
        <label>Archivo (.xlsx o .csv)</label>
        <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" @change="onFileSelected" />
      </div>
      <div class="row">
        <div class="field">
          <label>Sede por defecto (si el archivo no trae columna SEDE)</label>
          <select v-model="defaultSiteId">
            <option value="">— Ninguna (falla si falta la sede) —</option>
            <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>Si el S/N o código ya existe</label>
          <select v-model="duplicateStrategy">
            <option value="skip">Omitir (no tocar la cámara existente)</option>
            <option value="update">Actualizar sus datos</option>
          </select>
        </div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="actions">
        <button class="btn" :disabled="!file || loading" @click="run(true)">
          {{ loading ? "Procesando…" : "1. Previsualizar" }}
        </button>
        <button class="btn btn-primary" :disabled="!file || loading || !report || committed" @click="run(false)">
          2. Confirmar importación
        </button>
        <button class="btn" @click="reset">Limpiar</button>
      </div>
    </div>

    <div v-if="report" class="panel">
      <div class="panel-header">
        <h2>{{ committed ? "Resultado de la importación" : "Previsualización — nada se ha guardado todavía" }}</h2>
      </div>
      <div class="panel-body summary-row">
        <span>Filas totales: <strong>{{ report.totalRows }}</strong></span>
        <span style="color: var(--online)">Crear: <strong>{{ report.created }}</strong></span>
        <span style="color: var(--accent)">Actualizar: <strong>{{ report.updated }}</strong></span>
        <span style="color: var(--warning)">Omitidas: <strong>{{ report.skipped }}</strong></span>
        <span style="color: var(--offline)">Errores: <strong>{{ report.errors }}</strong></span>
      </div>

      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Fila</th>
              <th>Acción</th>
              <th>S/N</th>
              <th>Sede</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in report.rows" :key="row.rowNumber">
              <td class="mono">{{ row.rowNumber }}</td>
              <td><span class="tag" :class="ACTION_TAG[row.action]">{{ row.action }}</span></td>
              <td class="mono">{{ row.serialNumber || "—" }}</td>
              <td>{{ row.siteName || "—" }}</td>
              <td class="dim">{{ row.reason || "—" }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
}
.row .field {
  flex: 1;
  min-width: 240px;
}
.actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.summary-row {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
  font-size: 13px;
}
.error {
  color: var(--offline);
  font-size: 12.5px;
}
</style>
