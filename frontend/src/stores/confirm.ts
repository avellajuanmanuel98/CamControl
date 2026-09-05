import { defineStore } from "pinia";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export const useConfirmStore = defineStore("confirm", {
  state: () => ({
    open: false,
    options: null as ConfirmOptions | null,
    resolver: null as ((value: boolean) => void) | null,
  }),
  actions: {
    // Promise-based replacement for window.confirm() that matches the
    // app's own modal styling instead of the browser's native dialog.
    ask(options: ConfirmOptions): Promise<boolean> {
      this.options = options;
      this.open = true;
      return new Promise((resolve) => {
        this.resolver = resolve;
      });
    },
    resolve(value: boolean) {
      this.open = false;
      this.resolver?.(value);
      this.resolver = null;
    },
  },
});
