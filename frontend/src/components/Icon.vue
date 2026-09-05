<script setup lang="ts">
// Minimal hand-drawn icon set (1.75px stroke, 24x24 grid) — no icon font,
// no external dependency. Kept deliberately small and geometric instead of
// pulling in a full icon library for a dozen glyphs.
withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 16 });

export type IconName =
  | "edit"
  | "trash"
  | "refresh"
  | "close"
  | "download"
  | "upload"
  | "search"
  | "chevron-up"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "plus"
  | "external"
  | "image"
  | "alert"
  | "clock"
  | "filter"
  | "check"
  | "sites"
  | "cameras"
  | "dashboard"
  | "import"
  | "logout"
  | "activity"
  | "mac";
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'edit'">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </template>
    <template v-else-if="name === 'refresh'">
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="M6 6l12 12M18 6L6 18" />
    </template>
    <template v-else-if="name === 'download'">
      <path d="M12 3v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M4 20h16" />
    </template>
    <template v-else-if="name === 'upload'">
      <path d="M12 21V9" />
      <path d="M7 13l5-5 5 5" />
      <path d="M4 20h16" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </template>
    <template v-else-if="name === 'chevron-up'">
      <path d="M6 15l6-6 6 6" />
    </template>
    <template v-else-if="name === 'chevron-down'">
      <path d="M6 9l6 6 6-6" />
    </template>
    <template v-else-if="name === 'chevron-left'">
      <path d="M15 6l-6 6 6 6" />
    </template>
    <template v-else-if="name === 'chevron-right'">
      <path d="M9 6l6 6-6 6" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14M5 12h14" />
    </template>
    <template v-else-if="name === 'external'">
      <path d="M14 4h6v6" />
      <path d="M10 14L20 4" />
      <path d="M18 14v6H4V6h6" />
    </template>
    <template v-else-if="name === 'image'">
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5-5-9 9" />
    </template>
    <template v-else-if="name === 'alert'">
      <path d="M12 3l10 18H2Z" />
      <path d="M12 10v4" />
      <path d="M12 17.5v.1" />
    </template>
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </template>
    <template v-else-if="name === 'filter'">
      <path d="M4 5h16" />
      <path d="M7 12h10" />
      <path d="M10 19h4" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="M4 12l5 5 11-11" />
    </template>
    <template v-else-if="name === 'sites'">
      <path d="M4 21V9l8-5 8 5v12" />
      <path d="M9 21v-6h6v6" />
    </template>
    <template v-else-if="name === 'cameras'">
      <rect x="2" y="7" width="14" height="11" rx="1.5" />
      <path d="M16 10.5l5-2.5v9l-5-2.5" />
    </template>
    <template v-else-if="name === 'dashboard'">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </template>
    <template v-else-if="name === 'import'">
      <path d="M4 4h16v6H4z" />
      <path d="M12 12v8" />
      <path d="M8.5 17l3.5 3 3.5-3" />
    </template>
    <template v-else-if="name === 'logout'">
      <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </template>
    <template v-else-if="name === 'activity'">
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </template>
    <template v-else-if="name === 'mac'">
      <rect x="3" y="5" width="18" height="12" rx="1.5" />
      <path d="M3 17h18" />
      <path d="M8 21h8" />
    </template>
  </svg>
</template>
