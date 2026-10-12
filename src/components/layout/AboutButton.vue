<script setup lang="ts">
import { ref, useId } from "vue"

import { useAppContext } from "../../app/context"

/** Header icon button opening the legal notice: unofficial fan site, owners of the game's content, feedback form. */
const FEEDBACK_URL = "https://docs.google.com/forms/d/e/1FAIpQLSck6BCBlOkD8g_sH_vWesZZz8seK4vCd2eC7pRh5rN9teLDMA/viewform"

const app = useAppContext()
const dialog = ref<HTMLDialogElement>()
const titleId = useId()

function onBackdropClick(event: MouseEvent) {
  if (event.target === dialog.value) dialog.value?.close()
}
</script>

<template>
  <button type="button" class="about-button" :aria-label="app.text.value.about.title" :title="app.text.value.about.title" @click="dialog?.showModal()">
    <!-- Info icon from Lucide (ISC licence). -->
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  </button>
  <Teleport to="body">
    <!-- Escape closes the dialog only: it must not reach the shell, which would close the tree on mobile. -->
    <dialog ref="dialog" class="about-dialog" :aria-labelledby="titleId" @click="onBackdropClick" @keydown.stop>
      <div class="about">
        <h2 :id="titleId" class="about-title">{{ app.text.value.about.title }}</h2>
        <div class="about-text">
          <p v-for="paragraph in app.text.value.about.paragraphs" :key="paragraph">{{ paragraph }}</p>
          <p>
            {{ app.text.value.about.contact }}
            <a :href="FEEDBACK_URL" target="_blank" rel="noopener noreferrer">{{ app.text.value.about.contactLink }}</a>
          </p>
        </div>
        <div class="about-actions">
          <button type="button" class="close-button" @click="dialog?.close()">{{ app.text.value.close }}</button>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.about-button {
  display: grid;
  place-items: center;
  padding: 0.3rem 0.55rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: none;
  color: inherit;
  cursor: pointer;
}
.about-button:hover,
.about-button:focus-visible {
  /* Thicker outline without moving the neighbours. */
  box-shadow: inset 0 0 0 1px var(--border);
}
.about-button svg {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.about-dialog {
  width: min(30rem, calc(100% - 1.5rem));
  max-height: min(40rem, calc(100% - 1.5rem));
  box-sizing: border-box;
  padding: 0;
  border: 0;
  border-radius: 0.75rem;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow);
}
/* Only the text scrolls: the title and the close button stay in view. */
.about-dialog[open] {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.about-dialog::backdrop {
  background: rgb(0 0 0 / 0.4);
}
.about {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  padding: 1rem;
}
.about-title {
  margin: 0;
  font-size: 1.05rem;
}
.about-text {
  display: grid;
  gap: 0.6rem;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  font-size: 0.9rem;
  line-height: 1.45;
}
.about-text p {
  margin: 0;
}
.about-text a {
  color: var(--accent);
}
.about-actions {
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
</style>
