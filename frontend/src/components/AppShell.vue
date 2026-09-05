<script setup lang="ts">
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useThemeStore } from "../stores/theme";
import Icon from "./Icon.vue";

const router = useRouter();
const auth = useAuthStore();
const theme = useThemeStore();

function logout() {
  auth.logout();
  router.push({ name: "login" });
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">CamControl</div>
      <nav>
        <router-link to="/" class="nav-item" aria-label="Dashboard" title="Dashboard">
          <Icon name="dashboard" :size="15" /> <span class="nav-label">Dashboard</span>
        </router-link>
        <router-link to="/cameras" class="nav-item" aria-label="Cámaras" title="Cámaras">
          <Icon name="cameras" :size="15" /> <span class="nav-label">Cámaras</span>
        </router-link>
        <router-link to="/sites" class="nav-item" aria-label="Sedes" title="Sedes">
          <Icon name="sites" :size="15" /> <span class="nav-label">Sedes</span>
        </router-link>
        <router-link v-if="auth.canManage" to="/import" class="nav-item" aria-label="Importar" title="Importar">
          <Icon name="import" :size="15" /> <span class="nav-label">Importar</span>
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-name">{{ auth.user?.name }}</div>
          <div class="user-role dim">{{ auth.user?.role }}</div>
        </div>
        <button
          class="icon-btn"
          :title="theme.theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'"
          @click="theme.toggle"
        >
          <Icon :name="theme.theme === 'light' ? 'moon' : 'sun'" :size="15" />
        </button>
        <button class="icon-btn" title="Cerrar sesión" @click="logout"><Icon name="logout" :size="15" /></button>
      </div>
    </aside>
    <main class="content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
}
.sidebar {
  width: 200px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: var(--space-4) var(--space-2);
}
.brand {
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  padding: 0 var(--space-2) var(--space-4);
}
nav {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px var(--space-2);
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 500;
  border-left: 2px solid transparent;
}
.nav-item:hover {
  background: var(--surface-2);
  color: var(--text);
}
.router-link-exact-active {
  color: var(--text);
  border-left-color: var(--accent);
  background: var(--surface-2);
}
.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-2) 0;
  border-top: 1px solid var(--border);
  margin-top: var(--space-2);
}
.user-name {
  font-size: 12px;
  font-weight: 600;
}
.user-role {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.content {
  flex: 1;
  padding: var(--space-5);
  min-width: 0;
}

@media (max-width: 768px) {
  .shell {
    flex-direction: column;
  }
  .sidebar {
    width: 100%;
    flex-direction: row;
    align-items: center;
    padding: var(--space-2) var(--space-3);
  }
  .brand {
    padding: 0 var(--space-3) 0 0;
    flex-shrink: 0;
  }
  nav {
    flex-direction: row;
    flex: 1;
    overflow-x: auto;
    min-width: 0;
  }
  .nav-item {
    border-left: none;
    border-bottom: 2px solid transparent;
    flex-shrink: 0;
    white-space: nowrap;
  }
  .router-link-exact-active {
    border-left-color: transparent;
    border-bottom-color: var(--accent);
  }
  .sidebar-footer {
    border-top: none;
    margin-top: 0;
    padding-top: 0;
    flex-shrink: 0;
  }
  .user-info {
    display: none;
  }
  .content {
    padding: var(--space-3);
  }
}

/* Icon-only nav below ~480px: fits all sections in one row instead of an
   ambiguous horizontal scroll on a phone-width screen. */
@media (max-width: 480px) {
  .nav-label {
    display: none;
  }
  .nav-item {
    padding: 8px 10px;
  }
}
</style>
