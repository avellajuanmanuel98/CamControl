<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { api, apiErrorMessage } from "../services/api";
import { useAuthStore } from "../stores/auth";
import { useToastStore } from "../stores/toast";
import { useConfirmStore } from "../stores/confirm";
import Icon from "../components/Icon.vue";
import type { Site } from "../types";

const sites = ref<Site[]>([]);
const loading = ref(true);
const auth = useAuthStore();
const router = useRouter();
const toast = useToastStore();
const confirmDialog = useConfirmStore();

const showForm = ref(false);
const editing = ref<Site | null>(null);
const form = ref({ name: "", code: "", address: "", notes: "" });
const saving = ref(false);
const formError = ref("");

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<Site[]>("/sites");
    sites.value = data;
  } catch (err) {
    toast.error(apiErrorMessage(err));
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
    const payload = {
      ...form.value,
      code: form.value.code || null,
      address: form.value.address || null,
      notes: form.value.notes || null,
    };
    if (editing.value) {
      await api.put(`/sites/${editing.value.id}`, payload);
      toast.success("Sede actualizada");
    } else {
      await api.post("/sites", payload);
      toast.success("Sede creada");
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
  const ok = await confirmDialog.ask({
    title: "Eliminar sede",
    message: `¿Eliminar "${site.name}"? Solo es posible si no tiene cámaras asociadas.`,
    confirmLabel: "Eliminar",
    danger: true,
  });
  if (!ok) return;
  try {
    await api.delete(`/sites/${site.id}`);
    toast.success("Sede eliminada");
    await load();
  } catch (err) {
    toast.error(apiErrorMessage(err));
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
        <p class="subtitle">Gestión de sedes/ubicaciones y sus estadísticas de cámaras</p>
      </div>
      <button v-if="auth.canManage" class="btn btn-primary" @click="openCreate">
        <Icon name="plus" :size="14" /> Nueva sede
      </button>
    </div>

    <p v-if="loading" class="dim">Cargando…</p>

    <div v-else class="panel">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Sede</th>
              <th>Dirección</th>
              <th class="num">Total</th>
              <th class="num">Online</th>
              <th class="num">Offline</th>
              <th class="num">Intermitente</th>
              <th class="num">Sin config.</th>
              <th v-if="auth.canManage">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="site in sites" :key="site.id">
              <td class="clickable" @click="viewCameras(site)"><strong>{{ site.name }}</strong></td>
              <td class="dim">{{ site.address || "—" }}</td>
              <td class="num">{{ site.stats?.total ?? 0 }}</td>
              <td class="num" :style="{ color: site.stats?.online ? 'var(--online)' : undefined }">{{ site.stats?.online ?? 0 }}</td>
              <td class="num" :style="{ color: site.stats?.offline ? 'var(--offline)' : undefined }">{{ site.stats?.offline ?? 0 }}</td>
              <td class="num" :style="{ color: site.stats?.warning ? 'var(--warning)' : undefined }">{{ site.stats?.warning ?? 0 }}</td>
              <td class="num dim">{{ site.stats?.unconfigured ?? 0 }}</td>
              <td v-if="auth.canManage" class="actions-cell">
                <button class="icon-btn" title="Editar" @click="openEdit(site)"><Icon name="edit" :size="14" /></button>
                <button class="icon-btn danger" title="Eliminar" @click="remove(site)"><Icon name="trash" :size="14" /></button>
              </td>
            </tr>
            <tr v-if="sites.length === 0">
              <td :colspan="auth.canManage ? 8 : 7" class="empty-state">No hay sedes registradas.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showForm" class="modal-backdrop" @click.self="showForm = false">
      <form class="modal" style="max-width: 380px" @submit.prevent="save">
        <div class="modal-header">
          <h3>{{ editing ? "Editar sede" : "Nueva sede" }}</h3>
          <button type="button" class="icon-btn" @click="showForm = false"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Nombre *</label>
            <input v-model="form.name" required placeholder="Ej. Medellín" />
          </div>
          <div class="field">
            <label>Código</label>
            <input v-model="form.code" placeholder="Opcional" />
          </div>
          <div class="field">
            <label>Dirección</label>
            <input v-model="form.address" placeholder="Opcional" />
          </div>
          <div class="field" style="margin-bottom: 0">
            <label>Notas</label>
            <textarea v-model="form.notes" rows="2" />
          </div>
          <p v-if="formError" class="error">{{ formError }}</p>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" @click="showForm = false">Cancelar</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? "Guardando…" : "Guardar" }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.clickable {
  cursor: pointer;
}
.clickable:hover {
  color: var(--accent);
}
.actions-cell {
  display: flex;
  gap: 2px;
}
.error {
  color: var(--offline);
  font-size: 12.5px;
  margin-top: var(--space-2);
}
</style>
