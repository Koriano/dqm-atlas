<script setup lang="ts">
import { computed } from "vue"

/** What is shown during a long wait: the task, and how far it has gone when it can be counted. */
const props = defineProps<{ label: string; progress?: { done: number; total: number } | null }>()

const counted = computed(() => (props.progress && props.progress.total > 0 ? props.progress : null))
</script>

<template>
  <div class="loading">
    <span class="spinner" aria-hidden="true" />
    <!-- Only the task is announced: a count changing hundreds of times would flood a screen reader. -->
    <p class="label" role="status">{{ label }}</p>
    <template v-if="counted">
      <div
        class="bar"
        role="progressbar"
        :aria-label="label"
        aria-valuemin="0"
        :aria-valuemax="counted.total"
        :aria-valuenow="counted.done"
        :aria-valuetext="`${counted.done} / ${counted.total}`"
      >
        <span :style="{ width: `${(counted.done / counted.total) * 100}%` }" />
      </div>
      <p class="count" aria-hidden="true">{{ counted.done }} / {{ counted.total }}</p>
    </template>
  </div>
</template>

<style scoped>
.loading {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  width: min(16rem, 100%);
  padding: 1rem;
  color: var(--text-muted);
  text-align: center;
}
.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
.label,
.count {
  margin: 0;
}
.count {
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
.bar {
  width: 100%;
  height: 0.375rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--border);
}
.bar span {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 0.15s linear;
}
@keyframes spin {
  to {
    transform: rotate(1turn);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation-duration: 2.4s;
  }
  .bar span {
    transition: none;
  }
}
</style>
