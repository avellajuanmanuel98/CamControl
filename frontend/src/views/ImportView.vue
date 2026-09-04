<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, apiErrorMessage } from "../services/api";
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
      <h1>Importar cámaras</h1>
      <p class="muted">
        Carga el Excel/CSV con las columnas S/N, CODIGO, CIFRADO, CAPACIDAD, User_Compartidos, ESTADO y
        opcionalmente SEDE. El QR se sube por separado, después de importar.
      </p>
    </div>

    <div class="card form-panel">
      <div class="form-field">
        <label>Archivo (.xlsx o .csv)</label>
        <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" @change="onFileSelected" />
      </div>
      <div class="row">
        <div class="form-field">
          <label>Sede por defecto (si el archivo no trae columna SEDE)</label>
          <select v-model="defaultSiteId">
            <option value="">— Ninguna (falla si falta la sede) —</option>
            <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div class="form-field">
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
          {{ loading ? "Procesando..." : "1. Previsualizar" }}
        </button>
        <button
          class="btn btn-primary"
          :disabled="!file || loading || !report || committed"
          @click="run(false)"
        >
          2. Confirmar importación
        </button>
        <button class="btn" @click="reset">Limpiar</button>
      </div>
    </div>

    <div v-if="report" class="card report-panel">
      <h3>{{ committed ? "Resultado de la importación" : "Previsualización (nada se ha guardado todavía)" }}</h3>
      <div class="summary-row">
        <span>Filas totales: <strong>{{ report.totalRows }}</strong></span>
        <span class="ok">Crear: <strong>{{ report.created }}</strong></span>
        <span class="ok">Actualizar: <strong>{{ report.updated }}</strong></span>
        <span class="warn">Omitidas (duplicadas): <strong>{{ report.skipped }}</strong></span>
        <span class="bad">Errores: <strong>{{ report.errors }}</strong></span>
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
              <td>{{ row.rowNumber }}</td>
              <td>
                <span :class="['tag', row.action]">{{ row.action }}</span>
              </td>
              <td>{{ row.serialNumber || "—" }}</td>
              <td>{{ row.siteName || "—" }}</td>
              <td class="muted">{{ row.reason || "—" }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 20px;
}
h1 {
  margin: 0 0 6px;
  font-size: 24px;
}
.form-panel {
  padding: 22px;
  margin-bottom: 20px;
}
.row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.row .form-field {
  flex: 1;
  min-width: 240px;
}
.actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.report-panel {
  padding: 22px;
}
.report-panel h3 {
  margin-top: 0;
}
.summary-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  font-size: 14px;
}
.ok {
  color: var(--online);
}
.warn {
  color: var(--warning);
}
.bad {
  color: var(--offline);
}
.tag {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  text-transform: uppercase;
}
.tag.create {
  background: rgba(34, 197, 94, 0.15);
  color: var(--online);
}
.tag.update {
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent);
}
.tag.skip {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warning);
}
.tag.error {
  background: rgba(239, 68, 68, 0.15);
  color: var(--offline);
}
.error {
  color: var(--offline);
}
</style>
