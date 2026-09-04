<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { api, apiErrorMessage } from "../services/api";
import { useAuthStore } from "../stores/auth";
import type { Site } from "../types";

const sites = ref<Site[]>([]);
const loading = ref(true);
const error = ref("");
const auth = useAuthStore();
const router = useRouter();

const showForm = ref(false);
const editing = ref<Site | null>(null);
const form = ref({ name: "", code: "", address: "", notes: "" });
const saving = ref(false);
const formError = ref("");

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await api.get<Site[]>("/sites");
    sites.value = data;
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  form.value = { name: "", code: "", address: "", notes: "" };
  formError.value = "";
  showForm.value = true;
}

function openEdit(site: Site) {
  editing.value = site;
  form.value = { name: site.name, code: site.code ?? "", address: site.address ?? "", notes: site.notes ?? "" };
  formError.value = "";
  showForm.value = true;
}

async function save() {
  saving.value = true;
  formError.value = "";
  try {
    const payload = { ...form.value, code: form.value.code || null, address: form.value.address || null, notes: form.value.notes || null };
    if (editing.value) {
      await api.put(`/sites/${editing.value.id}`, payload);
    } else {
      await api.post("/sites", payload);
    }
    showForm.value = false;
    await load();
  } catch (err) {
    formError.value = apiErrorMessage(err);
  } finally {
    saving.value = false;
  }
}

async function remove(site: Site) {
  if (!confirm(`¿Eliminar la sede "${site.name}"? Esta acción no se puede deshacer.`)) return;
  try {
    await api.delete(`/sites/${site.id}`);
    await load();
  } catch (err) {
    alert(apiErrorMessage(err));
  }
}

function viewCameras(site: Site) {
  router.push({ name: "cameras", query: { siteId: site.id } });
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Sedes</h1>
        <p class="muted">Gestión de sedes/ubicaciones y sus estadísticas de cámaras</p>
      </div>
      <button v-if="auth.canManage" class="btn btn-primary" @click="openCreate">+ Nueva sede</button>
    </div>

    <p v-if="error" class="error muted">{{ error }}</p>
    <p v-else-if="loading" class="muted">Cargando...</p>

    <div v-else class="sites-grid">
      <div v-for="site in sites" :key="site.id" class="card site-card">
        <div class="site-head">
          <h3 @click="viewCameras(site)">{{ site.name }}</h3>
          <div v-if="auth.canManage" class="actions">
            <button class="icon-btn" title="Editar" @click="openEdit(site)">✏️</button>
            <button class="icon-btn" title="Eliminar" @click="remove(site)">🗑️</button>
          </div>
        </div>
        <p v-if="site.address" class="muted address">{{ site.address }}</p>
        <div class="stats-row" v-if="site.stats">
          <span class="stat"><strong>{{ site.stats.total }}</strong> total</span>
          <span class="stat online">🟢 {{ site.stats.online }}</span>
          <span class="stat offline">🔴 {{ site.stats.offline }}</span>
          <span class="stat warning">🟡 {{ site.stats.warning }}</span>
        </div>
        <button class="btn view-btn" @click="viewCameras(site)">Ver cámaras →</button>
      </div>
      <p v-if="sites.length === 0" class="muted">No hay sedes registradas.</p>
    </div>

    <div v-if="showForm" class="modal-backdrop" @click.self="showForm = false">
      <form class="card modal" @submit.prevent="save">
        <h3>{{ editing ? "Editar sede" : "Nueva sede" }}</h3>
        <div class="form-field">
          <label>Nombre *</label>
          <input v-model="form.name" required placeholder="Ej. Medellín" />
        </div>
        <div class="form-field">
          <label>Código</label>
          <input v-model="form.code" placeholder="Opcional" />
        </div>
        <div class="form-field">
          <label>Dirección</label>
          <input v-model="form.address" placeholder="Opcional" />
        </div>
        <div class="form-field">
          <label>Notas</label>
          <textarea v-model="form.notes" rows="2" />
        </div>
        <p v-if="formError" class="error">{{ formError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn" @click="showForm = false">Cancelar</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? "Guardando..." : "Guardar" }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}
h1 {
  margin: 0 0 4px;
  font-size: 24px;
}
.sites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.site-card {
  padding: 18px;
}
.site-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.site-head h3 {
  margin: 0;
  cursor: pointer;
  font-size: 16px;
}
.site-head h3:hover {
  color: var(--accent);
}
.actions {
  display: flex;
  gap: 4px;
}
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  border-radius: 6px;
}
.icon-btn:hover {
  background: rgba(255, 255, 255, 0.06);
}
.address {
  font-size: 13px;
  margin: 6px 0 12px;
}
.stats-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 13px;
  margin: 10px 0 14px;
}
.view-btn {
  width: 100%;
  justify-content: center;
  font-size: 13px;
}
.error {
  color: var(--offline);
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 20px;
}
.modal {
  width: 100%;
  max-width: 420px;
  padding: 24px;
}
.modal h3 {
  margin-top: 0;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}
</style>
