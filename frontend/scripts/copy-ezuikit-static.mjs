// Copies the EZUIKit decoder assets (WASM decoder, workers) from the
// installed package into public/, so Vite serves them from our own origin
// instead of the player falling back to EZVIZ's remote CDN — which can fail
// silently (decoder never loads, video stays black with no visible error)
// on networks that can't reach it.
import { cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "node_modules", "ezuikit-js", "ezuikit_static");
const dest = join(here, "..", "public", "ezuikit_static");

if (!existsSync(src)) {
  console.warn("[copy-ezuikit-static] node_modules/ezuikit-js/ezuikit_static no existe, se omite la copia.");
  process.exit(0);
}

cpSync(src, dest, { recursive: true });
console.log("[copy-ezuikit-static] Copiado a public/ezuikit_static");
