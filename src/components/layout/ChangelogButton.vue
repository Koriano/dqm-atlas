<script setup lang="ts">
import { computed, ref, shallowRef } from "vue"

import { useAppContext } from "../../app/context"
import AppDialog from "../common/AppDialog.vue"

/** Header button opening the list of changes. The releases are only loaded when the list is first opened. */
const app = useAppContext()
const dialog = ref<InstanceType<typeof AppDialog>>()
const changelog = shallowRef<typeof import("../../changelog")>()

/** One block per release, its changes grouped by kind. */
const releases = computed(() => {
  const loaded = changelog.value
  if (!loaded) return []
  return loaded.RELEASES.map(({ date, changes }) => ({
    date,
    title: loaded.fullDay(date, app.state.language),
    age: loaded.relativeDay(date, app.state.language),
    groups: loaded.CHANGE_KINDS.flatMap((kind) => {
      const entries = changes[kind] ?? []
      return entries.length > 0 ? [{ kind, entries }] : []
    }),
  }))
})

async function open() {
  changelog.value ??= await import("../../changelog")
  dialog.value?.showModal()
}
</script>

<template>
  <button type="button" class="changelog-button" :aria-label="app.text.value.changelog" @click="open">
    <!-- Scroll icon from Lucide (ISC licence). -->
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
    </svg>
    <span class="changelog-label">{{ app.text.value.changelog }}</span>
  </button>
  <AppDialog ref="dialog" :title="app.text.value.changelog" max-width="32rem">
    <div class="changelog-days">
      <section v-for="release in releases" :key="release.date">
        <h3 class="day-title">
          <time :datetime="release.date">{{ release.title }}</time>
          <span class="day-age">{{ release.age }}</span>
        </h3>
        <template v-for="group in release.groups" :key="group.kind">
          <h4 class="kind-title" :class="group.kind">{{ app.text.value.changeKinds[group.kind] }}</h4>
          <ul class="entries">
            <li v-for="(entry, index) in group.entries" :key="index">{{ entry[app.state.language] }}</li>
          </ul>
        </template>
      </section>
    </div>
  </AppDialog>
</template>

<style scoped>
.changelog-button {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.55rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 0.85rem;
  white-space: nowrap;
  cursor: pointer;
}
.changelog-button:hover,
.changelog-button:focus-visible {
  /* Thicker outline without moving the neighbours. */
  box-shadow: inset 0 0 0 1px var(--border);
}
.changelog-button svg {
  flex: none;
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.day-age {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 400;
}
.changelog-days {
  display: grid;
  gap: 1rem;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.day-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin: 0 0 0.4rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.9rem;
}
.kind-title {
  margin: 0.6rem 0 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.kind-title.feature {
  color: var(--success);
}
.kind-title.fix {
  color: var(--danger);
}
.entries {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.9rem;
}
@media (max-width: 600px) {
  .changelog-label {
    display: none;
  }
}
</style>
