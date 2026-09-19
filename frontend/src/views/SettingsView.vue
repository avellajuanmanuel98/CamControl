<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, apiErrorMessage } from "../services/api";
import { useToastStore } from "../stores/toast";
import Icon from "../components/Icon.vue";
import { friendlyDateTime } from "../utils/time";
import type { EzvizCredential } from "../types";

const credentials = ref<EzvizCredential[]>([]);
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const toast = useToastStore();

const form = ref({ label: "", appKey: "", appSecret: "" });

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<EzvizCredential[]>("/monitoring/credentials");
    credentials.value = data;
  } catch (err) {
    toast.error(apiErrorMessage(err));
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  error.value = "";
  try {
    await api.post("/monitoring/credentials", form.value);
    toast.success("Credenciales EZVIZ guardadas y activadas");
    form.value = { label: "", appKey: "", appSecret: "" };
    await load();
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Configuración</h1>
        <p class="subtitle">Credenciales de integración con EZVIZ Open Platform para verificar conectividad</p>
      </div>
    </div>

    <div class="panel" style="margin-bottom: var(--space-4)">
      <div class="panel-header"><h2>Credencial EZVIZ (AppKey / AppSecret)</h2></div>
      <div class="panel-body">
        <p class="dim" style="margin: 0 0 var(--space-3)">
          Se obtienen en el Open Platform Console de EZVIZ, en <strong>Account Settings → Appkey management</strong>.
          Al guardar una nueva credencial, queda activa y se cifra en la base de datos — nunca se vuelve a mostrar
          por aquí ni por la API, solo se puede reemplazar.
        </p>
        <form @submit.prevent="save" class="field-grid">
          <div class="field">
            <label>Etiqueta</label>
            <input v-model="form.label" required placeholder="Ej. Cuenta principal Colombia" />
          </div>
          <div class="field">
            <label>AppKey</label>
            <input v-model="form.appKey" required class="mono" autocomplete="off" />
          </div>
          <div class="field">
            <label>AppSecret</label>
            <input v-model="form.appSecret" required type="password" class="mono" autocomplete="off" />
          </div>
          <div class="field field-full" style="margin-bottom: 0">
            <p v-if="error" class="error" style="margin: 0 0 var(--space-2)">{{ error }}</p>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? "Guardando…" : "Guardar y activar" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header"><h2>Historial de credenciales</h2></div>
      <p v-if="loading" class="dim" style="padding: var(--space-3)">Cargando…</p>
      <div v-else class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Etiqueta</th>
              <th>Estado</th>
              <th>Creada</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in credentials" :key="c.id">
              <td>{{ c.label }}</td>
              <td>
                <span v-if="c.active" style="color: var(--online); display: inline-flex; align-items: center; gap: 5px">
                  <Icon name="check" :size="13" /> Activa
                </span>
                <span v-else class="dim">Reemplazada</span>
              </td>
              <td class="dim">{{ friendlyDateTime(c.createdAt) }}</td>
            </tr>
            <tr v-if="credentials.length === 0">
              <td colspan="3" class="empty-state">Aún no se ha guardado ninguna credencial EZVIZ.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.field-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0 var(--space-4);
}
.field-full {
  grid-column: 1 / -1;
}
.error {
  color: var(--offline);
  font-size: 12.5px;
}
@media (max-width: 720px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
