<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, apiErrorMessage } from "../services/api";
import { useAuthStore } from "../stores/auth";
import { useToastStore } from "../stores/toast";
import Icon from "../components/Icon.vue";
import { friendlyDateTime } from "../utils/time";
import type { AppUser, UserRole } from "../types";

const users = ref<AppUser[]>([]);
const loading = ref(true);
const auth = useAuthStore();
const toast = useToastStore();

const showForm = ref(false);
const editing = ref<AppUser | null>(null);
const saving = ref(false);
const formError = ref("");

const createForm = ref({ email: "", name: "", role: "VIEWER" as UserRole, password: "" });
const editForm = ref({ name: "", role: "VIEWER" as UserRole, active: true, password: "" });

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Administrador",
  OPERATOR: "Operador",
  VIEWER: "Solo lectura",
};

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<AppUser[]>("/users");
    users.value = data;
  } catch (err) {
    toast.error(apiErrorMessage(err));
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  createForm.value = { email: "", name: "", role: "VIEWER", password: "" };
  formError.value = "";
  showForm.value = true;
}

function openEdit(user: AppUser) {
  editing.value = user;
  editForm.value = { name: user.name, role: user.role, active: user.active, password: "" };
  formError.value = "";
  showForm.value = true;
}

async function save() {
  saving.value = true;
  formError.value = "";
  try {
    if (editing.value) {
      const { password, ...rest } = editForm.value;
      await api.put(`/users/${editing.value.id}`, { ...rest, ...(password ? { password } : {}) });
      toast.success("Usuario actualizado");
    } else {
      await api.post("/users", createForm.value);
      toast.success("Usuario creado");
    }
    showForm.value = false;
    await load();
  } catch (err) {
    formError.value = apiErrorMessage(err);
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
        <h1>Usuarios</h1>
        <p class="subtitle">Quién puede administrar cámaras, sedes y credenciales del sistema</p>
      </div>
      <button class="btn btn-primary" @click="openCreate"><Icon name="plus" :size="14" /> Nuevo usuario</button>
    </div>

    <p v-if="loading" class="dim">Cargando…</p>

    <div v-else class="panel">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Creado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>
                <strong>{{ user.name }}</strong>
                <span v-if="user.id === auth.user?.id" class="dim"> (tú)</span>
              </td>
              <td class="mono">{{ user.email }}</td>
              <td>{{ ROLE_LABEL[user.role] }}</td>
              <td :style="{ color: user.active ? 'var(--online)' : 'var(--neutral)' }">
                {{ user.active ? "Activo" : "Inactivo" }}
              </td>
              <td class="dim">{{ friendlyDateTime(user.createdAt) }}</td>
              <td>
                <button class="icon-btn" title="Editar" @click="openEdit(user)"><Icon name="edit" :size="14" /></button>
              </td>
            </tr>
            <tr v-if="users.length === 0">
              <td colspan="6" class="empty-state">No hay usuarios registrados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showForm" class="modal-backdrop" @click.self="showForm = false">
      <form class="modal" style="max-width: 400px" @submit.prevent="save">
        <div class="modal-header">
          <h3>{{ editing ? "Editar usuario" : "Nuevo usuario" }}</h3>
          <button type="button" class="icon-btn" @click="showForm = false"><Icon name="close" :size="14" /></button>
        </div>

        <div class="modal-body">
          <template v-if="editing">
            <div class="field">
              <label>Correo</label>
              <input :value="editing.email" disabled class="mono" />
            </div>
            <div class="field">
              <label>Nombre</label>
              <input v-model="editForm.name" required />
            </div>
            <div class="field">
              <label>Rol</label>
              <select v-model="editForm.role" :disabled="editing.id === auth.user?.id">
                <option value="VIEWER">Solo lectura</option>
                <option value="OPERATOR">Operador</option>
                <option value="ADMIN">Administrador</option>
              </select>
              <p v-if="editing.id === auth.user?.id" class="field-hint">
                No puedes cambiar tu propio rol (evita bloquearte a ti mismo).
              </p>
            </div>
            <div class="field">
              <label style="display: flex; align-items: center; gap: 8px; text-transform: none; font-size: 13px">
                <input
                  type="checkbox"
                  v-model="editForm.active"
                  :disabled="editing.id === auth.user?.id"
                  style="width: auto; height: auto"
                />
                Usuario activo
              </label>
            </div>
            <div class="field" style="margin-bottom: 0">
              <label>Nueva contraseña</label>
              <input v-model="editForm.password" type="password" placeholder="Dejar en blanco para no cambiarla" />
            </div>
          </template>

          <template v-else>
            <div class="field">
              <label>Correo *</label>
              <input v-model="createForm.email" type="email" required placeholder="usuario@empresa.com" />
            </div>
            <div class="field">
              <label>Nombre *</label>
              <input v-model="createForm.name" required />
            </div>
            <div class="field">
              <label>Rol</label>
              <select v-model="createForm.role">
                <option value="VIEWER">Solo lectura</option>
                <option value="OPERATOR">Operador</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <div class="field" style="margin-bottom: 0">
              <label>Contraseña * (mínimo 8 caracteres)</label>
              <input v-model="createForm.password" type="password" required minlength="8" />
            </div>
          </template>

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
.error {
  color: var(--offline);
  font-size: 12.5px;
  margin-top: var(--space-2);
}
</style>
