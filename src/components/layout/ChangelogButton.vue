<script setup lang="ts">
import { computed, ref, shallowRef, useId } from "vue"

import { useAppContext } from "../../app/context"

/** Header button opening the list of changes. The releases are only loaded when the list is first opened. */
const app = useAppContext()
const dialog = ref<HTMLDialogElement>()
const titleId = useId()
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

function onBackdropClick(event: MouseEvent) {
  if (event.target === dialog.value) dialog.value?.close()
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
  <Teleport to="body">
    <!-- Escape closes the dialog only: it must not reach the shell, which would close the tree on mobile. -->
    <dialog ref="dialog" class="changelog-dialog" :aria-labelledby="titleId" @click="onBackdropClick" @keydown.stop>
      <div class="changelog">
        <h2 :id="titleId" class="changelog-title">{{ app.text.value.changelog }}</h2>
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
        <div class="changelog-actions">
          <button type="button" class="close-button" @click="dialog?.close()">{{ app.text.value.close }}</button>
        </div>
      </div>
    </dialog>
  </Teleport>
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
.changelog-dialog {
  width: min(32rem, calc(100% - 1.5rem));
  max-height: min(40rem, calc(100% - 1.5rem));
  box-sizing: border-box;
  padding: 0;
  border: 0;
  border-radius: 0.75rem;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow);
}
/* Only the list scrolls: the title and the close button stay in view. */
.changelog-dialog[open] {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.changelog-dialog::backdrop {
  background: rgb(0 0 0 / 0.4);
}
.changelog {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  padding: 1rem;
}
.changelog-title {
  margin: 0;
  font-size: 1.05rem;
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
.changelog-actions {
  display: flex;
  justify-content: flex-end;
}
.close-button {
  padding: 0.35rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}
@media (max-width: 600px) {
  .changelog-label {
    display: none;
  }
}
</style>
