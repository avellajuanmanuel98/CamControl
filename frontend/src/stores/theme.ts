import { defineStore } from "pinia";

export type Theme = "light" | "dark";
const STORAGE_KEY = "camcontrol_theme";

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export const useThemeStore = defineStore("theme", {
  state: () => ({
    // White/light is the product default; dark is an opt-in preference,
    // not something we infer from the OS, so it stays put once chosen.
    theme: (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "light",
  }),
  actions: {
    init() {
      apply(this.theme);
    },
    toggle() {
      this.theme = this.theme === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, this.theme);
      apply(this.theme);
    },
  },
});
