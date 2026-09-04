<script setup lang="ts">
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const auth = useAuthStore();

function logout() {
  auth.logout();
  router.push({ name: "login" });
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-dot" />
        CamControl
      </div>
      <nav>
        <router-link to="/" class="nav-item">📊 Dashboard</router-link>
        <router-link to="/cameras" class="nav-item">🎥 Cámaras</router-link>
        <router-link to="/sites" class="nav-item">🏢 Sedes</router-link>
        <router-link v-if="auth.canManage" to="/import" class="nav-item">📥 Importar</router-link>
      </nav>
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-name">{{ auth.user?.name }}</div>
          <div class="user-role muted">{{ auth.user?.role }}</div>
        </div>
        <button class="btn" @click="logout">Salir</button>
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
  width: 230px;
  flex-shrink: 0;
  background: var(--bg-elevated);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
}
.brand {
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px 20px;
}
.brand-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--online);
  box-shadow: 0 0 8px var(--online);
}
nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}
.nav-item {
  padding: 10px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
}
.router-link-exact-active {
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent);
}
.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.user-name {
  font-size: 13px;
  font-weight: 600;
}
.user-role {
  font-size: 11px;
}
.content {
  flex: 1;
  padding: 28px 32px;
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
    padding: 10px 14px;
  }
  .brand {
    padding: 0 10px 0 0;
  }
  nav {
    flex-direction: row;
    flex: 1;
    overflow-x: auto;
  }
  .sidebar-footer {
    border-top: none;
    padding-top: 0;
  }
  .user-info {
    display: none;
  }
  .content {
    padding: 18px;
  }
}
</style>
