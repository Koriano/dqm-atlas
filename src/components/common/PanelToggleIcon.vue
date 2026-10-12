<script setup lang="ts">
defineProps<{ direction: "open" | "close" }>()
</script>

<template>
  <svg class="panel-toggle-icon" :class="direction" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2" />
    <line x1="9" y1="4" x2="9" y2="20" stroke="currentColor" stroke-width="2" />
    <polyline points="16 9 13 12 16 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>

<style scoped>
/* The drawn chevron points left (close); the open icon mirrors it. */
.panel-toggle-icon.open polyline {
  transform: translateX(29px) scaleX(-1);
}
</style>
