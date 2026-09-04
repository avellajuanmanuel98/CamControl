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
    <form class="login-card card" @submit.prevent="submit">
      <div class="brand">
        <span class="brand-dot" />
        CamControl
      </div>
      <p class="subtitle muted">Gestión y monitoreo de cámaras de seguridad</p>

      <div class="form-field">
        <label>Correo</label>
        <input v-model="email" type="email" required autofocus placeholder="usuario@empresa.com" />
      </div>
      <div class="form-field">
        <label>Contraseña</label>
        <input v-model="password" type="password" required placeholder="••••••••" />
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <button class="btn btn-primary" type="submit" :disabled="loading" style="width: 100%; justify-content: center">
        {{ loading ? "Ingresando..." : "Ingresar" }}
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
  padding: 20px;
  background: radial-gradient(circle at 30% 20%, #16213f 0%, var(--bg) 60%);
}
.login-card {
  width: 100%;
  max-width: 380px;
  padding: 36px;
}
.brand {
  font-size: 22px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--online);
  box-shadow: 0 0 10px var(--online);
}
.subtitle {
  margin: 6px 0 24px;
  font-size: 13px;
}
.error {
  color: var(--offline);
  font-size: 13px;
  margin-bottom: 14px;
}
</style>
