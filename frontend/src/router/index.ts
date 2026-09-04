import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", name: "login", component: () => import("../views/LoginView.vue"), meta: { public: true } },
    { path: "/", name: "dashboard", component: () => import("../views/DashboardView.vue") },
    { path: "/sites", name: "sites", component: () => import("../views/SitesView.vue") },
    { path: "/cameras", name: "cameras", component: () => import("../views/CamerasView.vue") },
    {
      path: "/cameras/new",
      name: "camera-new",
      component: () => import("../views/CameraFormView.vue"),
      meta: { requiresManage: true },
    },
    {
      path: "/cameras/:id/edit",
      name: "camera-edit",
      component: () => import("../views/CameraFormView.vue"),
      props: true,
      meta: { requiresManage: true },
    },
    {
      path: "/import",
      name: "import",
      component: () => import("../views/ImportView.vue"),
      meta: { requiresManage: true },
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  if (to.meta.public && auth.isAuthenticated && to.name === "login") {
    return { name: "dashboard" };
  }
  if (to.meta.requiresManage && !auth.canManage) {
    return { name: "dashboard" };
  }
  return true;
});

export default router;
