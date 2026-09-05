<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { api, apiErrorMessage } from "../services/api";
import { useAuthStore } from "../stores/auth";

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    const { data } = await api.post("/auth/login", { email: email.value, password: password.value });
    auth.setSession(data.token, data.user);
    const redirect = (route.query.redirect as string) || "/";
    router.push(redirect);
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <form class="panel login-card" @submit.prevent="submit">
      <div class="brand">CamControl</div>
      <p class="subtitle muted">Gestión y monitoreo de cámaras de seguridad</p>

      <div class="field">
        <label>Correo</label>
        <input v-model="email" type="email" required autofocus placeholder="usuario@empresa.com" />
      </div>
      <div class="field">
        <label>Contraseña</label>
        <input v-model="password" type="password" required placeholder="••••••••" />
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <button class="btn btn-primary" type="submit" :disabled="loading" style="width: 100%; justify-content: center">
        {{ loading ? "Ingresando…" : "Ingresar" }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: var(--bg);
}
.login-card {
  width: 100%;
  max-width: 340px;
  padding: var(--space-5);
}
.brand {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.subtitle {
  margin: 4px 0 var(--space-5);
  font-size: 12.5px;
}
.error {
  color: var(--offline);
  font-size: 12.5px;
  margin-bottom: var(--space-3);
}
</style>
