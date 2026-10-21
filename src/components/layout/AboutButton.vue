<script setup lang="ts">
import { ref } from "vue"

import { useAppContext } from "../../app/context"
import AppDialog from "../common/AppDialog.vue"

/** Header icon button opening the legal notice: unofficial fan site, owners of the game's content, feedback form. */
const FEEDBACK_URL = "https://docs.google.com/forms/d/e/1FAIpQLSck6BCBlOkD8g_sH_vWesZZz8seK4vCd2eC7pRh5rN9teLDMA/viewform"

const app = useAppContext()
const dialog = ref<InstanceType<typeof AppDialog>>()
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
  <AppDialog ref="dialog" :title="app.text.value.about.title" max-width="30rem">
    <div class="about-text">
      <p v-for="paragraph in app.text.value.about.paragraphs" :key="paragraph">{{ paragraph }}</p>
      <p>
        {{ app.text.value.about.contact }}
        <a :href="FEEDBACK_URL" target="_blank" rel="noopener noreferrer">{{ app.text.value.about.contactLink }}</a>
      </p>
    </div>
  </AppDialog>
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
</style>
