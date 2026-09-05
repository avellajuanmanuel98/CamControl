import { defineStore } from "pinia";

export interface Toast {
  id: number;
  text: string;
  kind: "info" | "success" | "error";
}

let nextId = 1;

export const useToastStore = defineStore("toast", {
  state: () => ({ items: [] as Toast[] }),
  actions: {
    push(text: string, kind: Toast["kind"] = "info", timeoutMs = 4500) {
      const id = nextId++;
      this.items.push({ id, text, kind });
      setTimeout(() => this.dismiss(id), timeoutMs);
    },
    success(text: string) {
      this.push(text, "success");
    },
    error(text: string) {
      this.push(text, "error", 7000);
    },
    dismiss(id: number) {
      this.items = this.items.filter((t) => t.id !== id);
    },
  },
});
