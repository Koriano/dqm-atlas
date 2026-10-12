<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId } from "vue"

/**
 * A piece of text that reveals details on hover, focus or tap. The details describe the text (a tooltip): the pointer
 * can move onto them, to read them at leisure or scroll them, and Escape dismisses them.
 */
defineProps<{ label: string }>()

const trigger = ref<HTMLButtonElement>()
const popover = ref<HTMLElement>()
const open = ref(false)
const id = useId()
const style = ref<Record<string, string>>({})

const MARGIN = 8

/** Fixed to the viewport so the scrolling panel cannot clip it; flips above the text when there is no room below. */
function place() {
  const anchor = trigger.value?.getBoundingClientRect()
  const box = popover.value?.getBoundingClientRect()
  if (!anchor || !box) return
  const viewportWidth = document.documentElement.clientWidth
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight
  const left = Math.max(MARGIN, Math.min(anchor.left, viewportWidth - box.width - MARGIN))
  const below = viewportHeight - anchor.bottom - MARGIN
  const upwards = box.height + 4 > below && anchor.top > below
  const top = upwards ? Math.max(MARGIN, anchor.top - box.height - 4) : anchor.bottom + 4
  style.value = { left: `${left}px`, top: `${top}px`, maxHeight: `${viewportHeight - 2 * MARGIN}px`, visibility: "visible" }
}

const inside = (target: EventTarget | null) => target instanceof Node && (!!trigger.value?.contains(target) || !!popover.value?.contains(target))

function closeOnOutsidePress(event: PointerEvent) {
  if (!inside(event.target)) hide()
}

/** Scrolling the page moves the text away from its details; scrolling the details themselves does not. */
function closeOnScroll(event: Event) {
  if (event.target !== popover.value) hide()
}

/** Escape closes the details only: it must not reach the shell, which would close the tree on mobile. */
function closeOnEscape(event: KeyboardEvent) {
  if (event.key !== "Escape") return
  event.stopPropagation()
  hide()
}

// Leaving the text or its details closes them after a moment, long enough to cross the gap between the two.
let leaving: number | undefined
function stay() {
  window.clearTimeout(leaving)
}
function leave() {
  stay()
  leaving = window.setTimeout(hide, 150)
}

// A press on the details takes the focus from the text: they stay open until a press elsewhere.
let pressedDetails = false
function onDetailsPress() {
  pressedDetails = document.activeElement === trigger.value
}
function onBlur() {
  if (!pressedDetails) hide()
  pressedDetails = false
}

async function show() {
  stay()
  if (open.value) return
  open.value = true
  style.value = { visibility: "hidden" }
  document.addEventListener("pointerdown", closeOnOutsidePress)
  document.addEventListener("keydown", closeOnEscape)
  window.addEventListener("scroll", closeOnScroll, true)
  await nextTick()
  place()
}

function hide() {
  stay()
  open.value = false
  document.removeEventListener("pointerdown", closeOnOutsidePress)
  document.removeEventListener("keydown", closeOnEscape)
  window.removeEventListener("scroll", closeOnScroll, true)
}

onBeforeUnmount(hide)
</script>

<template>
  <button
    ref="trigger"
    type="button"
    class="info-trigger"
    :class="{ open }"
    :aria-describedby="open ? id : undefined"
    @mouseenter="show"
    @mouseleave="leave"
    @focus="show"
    @blur="onBlur"
    @click="show"
  >
    {{ label }}
  </button>
  <div v-if="open" :id="id" ref="popover" class="info-popover" role="tooltip" :style="style" @mouseenter="stay" @mouseleave="leave" @pointerdown="onDetailsPress">
    <slot />
  </div>
</template>

<style scoped>
.info-trigger {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  text-decoration: underline dotted var(--text-muted);
  text-underline-offset: 0.2em;
  cursor: help;
  -webkit-tap-highlight-color: transparent;
}
.info-trigger:hover,
.info-trigger.open {
  text-decoration-color: var(--accent);
}
.info-popover {
  position: fixed;
  z-index: 30;
  box-sizing: border-box;
  width: max-content;
  max-width: min(20rem, calc(100vw - 1rem));
  padding: 0.6rem 0.75rem;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
  box-shadow: var(--shadow);
  font-size: 0.85rem;
  line-height: 1.4;
}
</style>
