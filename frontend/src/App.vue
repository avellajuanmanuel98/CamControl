<script setup lang="ts">
import { useRoute } from "vue-router";
import { useAuthStore } from "./stores/auth";
import AppShell from "./components/AppShell.vue";
import ToastStack from "./components/ToastStack.vue";
import ConfirmDialog from "./components/ConfirmDialog.vue";

const route = useRoute();
const auth = useAuthStore();
</script>

<template>
  <AppShell v-if="auth.isAuthenticated && !route.meta.public">
    <!-- Keyed by full path so navigating between routes that share a component
    (e.g. /cameras/new -> /cameras/:id/edit) always remounts it instead of
    silently reusing stale state. -->
    <router-view v-slot="{ Component }">
      <component :is="Component" :key="route.fullPath" />
    </router-view>
  </AppShell>
  <router-view v-else />

  <ToastStack />
  <ConfirmDialog />
</template>
