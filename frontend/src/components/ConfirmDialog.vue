<script setup lang="ts">
import { useConfirmStore } from "../stores/confirm";

const store = useConfirmStore();
</script>

<template>
  <div v-if="store.open && store.options" class="modal-backdrop" @click.self="store.resolve(false)">
    <div class="modal" style="max-width: 380px">
      <div class="modal-header">
        <h3>{{ store.options.title }}</h3>
      </div>
      <div class="modal-body">
        <p style="margin: 0; color: var(--text-secondary)">{{ store.options.message }}</p>
      </div>
      <div class="modal-actions">
        <button class="btn" @click="store.resolve(false)">Cancelar</button>
        <button :class="store.options.danger ? 'btn btn-danger' : 'btn btn-primary'" @click="store.resolve(true)">
          {{ store.options.confirmLabel ?? "Confirmar" }}
        </button>
      </div>
    </div>
  </div>
</template>
