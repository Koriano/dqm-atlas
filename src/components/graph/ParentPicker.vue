<script setup lang="ts">
import MonsterCombobox from "../common/MonsterCombobox.vue"

/**
 * The search picking the monster of a parent slot. The node only shows a field-like hint: a real field would shrink
 * with the zoom, so the search opens in a dialog centred over the canvas, which is dimmed and out of reach meanwhile.
 */
defineProps<{
  options: string[]
  current: string | null
  title: string
  note: string | null
  placeholder: string
  /** Distance to the top of the canvas, as a CSS length. */
  top: string
}>()
/** `pick`: null (the field's clear button) empties the slot again. */
defineEmits<{ pick: [monsterId: string | null]; close: [] }>()

/** The picker is modal: Tab stays among its own controls (the field, its clear button). */
function onTab(event: KeyboardEvent) {
  const controls = [...((event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("input, button") ?? [])]
  if (controls.length === 0) return
  event.preventDefault()
  const index = controls.indexOf(document.activeElement as HTMLElement)
  controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus()
}
</script>

<template>
  <!-- Leaving the field (a click on the backdrop, Escape) closes the dialog. -->
  <div class="slot-backdrop" />
  <div class="slot-picker" role="dialog" aria-modal="true" :aria-label="title" :style="{ top }" @keydown.tab="onTab">
    <p class="slot-picker-title" @mousedown.prevent>
      <strong>{{ title }}</strong>
      <span v-if="note" class="slot-picker-note">{{ note }}</span>
    </p>
    <MonsterCombobox
      autofocus
      :monster-ids="options"
      :model-value="current"
      :label="title"
      :placeholder="placeholder"
      @update:model-value="$emit('pick', $event)"
      @close="$emit('close')"
    />
  </div>
</template>

<style scoped>
/*
 * Same level as the mobile detail sheet, which comes later in the page and so stays clear above the backdrop; the
 * dialog is one level higher so its list can open over the sheet.
 */
.slot-backdrop {
  position: absolute;
  inset: 0;
  z-index: 5;
  background: rgb(0 0 0 / 0.4);
}
.slot-picker {
  /* Centred without a transform, which would capture the list's fixed positioning. */
  position: absolute;
  right: 0;
  left: 0;
  z-index: 6;
  width: min(22rem, calc(100% - 1.5rem));
  margin-inline: auto;
  box-sizing: border-box;
  padding: 0.75rem;
  border-radius: 0.75rem;
  background: var(--surface);
  box-shadow: var(--shadow);
}
.slot-picker-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.15rem 0.5rem;
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
}
.slot-picker-note {
  color: var(--text-muted);
  font-size: 0.8rem;
}
</style>
