import { defineStore } from "pinia";
import type { AuthUser } from "../types";

const TOKEN_KEY = "camcontrol_token";
const USER_KEY = "camcontrol_user";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) as string | null,
    user: JSON.parse(localStorage.getItem(USER_KEY) ?? "null") as AuthUser | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === "ADMIN",
    canManage: (state) => state.user?.role === "ADMIN" || state.user?.role === "OPERATOR",
  },
  actions: {
    setSession(token: string, user: AuthUser) {
      this.token = token;
      this.user = user;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
  },
});
