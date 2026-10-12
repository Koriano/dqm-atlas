<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useId, watch } from "vue"

import { useAppContext } from "../../app/context"
import type { Monster } from "../../domain/monster"
import { formatText } from "../../i18n"
import { monsterIconUrl } from "../../services/assets"
import { matchesSearch } from "../../services/search"

const props = withDefaults(
  defineProps<{
    monsterIds: string[]
    modelValue: string | null
    label: string
    placeholder: string
    /** Empties the field after a pick (global search) instead of showing the picked monster. */
    resetOnSelect?: boolean
    /** Focuses the field, which opens the list, as soon as the component appears. */
    autofocus?: boolean
  }>(),
  { resetOnSelect: false, autofocus: false },
)
const emit = defineEmits<{ "update:modelValue": [monsterId: string | null]; close: [] }>()

const MAX_SHOWN = 80

const app = useAppContext()
const id = useId()
const listId = `${id}-list`
const root = ref<HTMLElement>()
const input = ref<HTMLInputElement>()
const list = ref<HTMLElement>()
const query = ref("")
const open = ref(false)
const activeIndex = ref(0)

const name = (monsterId: string) => app.entityName("monsters", monsterId)

const matches = computed(() =>
  props.monsterIds
    .filter((monsterId) => matchesSearch(query.value, [name(monsterId), ...app.searchKeys(monsterId)]))
    .map((monsterId) => app.monsters.value.get(monsterId))
    .filter((monster): monster is Monster => monster !== undefined),
)
const shown = computed(() => matches.value.slice(0, MAX_SHOWN))

const displayedValue = computed(() => (open.value || !props.modelValue ? query.value : name(props.modelValue)))

watch(matches, () => (activeIndex.value = 0))

// The list is positioned against the viewport so scrolling panels (e.g. the mobile bottom sheet) cannot clip it,
// and it opens upwards when there is not enough room below the field.
const listStyle = ref<Record<string, string>>({})
function placeList() {
  const field = input.value
  if (!field) return
  const rect = field.getBoundingClientRect()
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight
  const below = viewportHeight - rect.bottom - 8
  const above = rect.top - 8
  const upwards = below < 220 && above > below
  const maxHeight = Math.max(120, Math.min(320, (upwards ? above : below) - 4))
  listStyle.value = {
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: `${maxHeight}px`,
    ...(upwards ? { top: "auto", bottom: `${viewportHeight - rect.top + 4}px` } : { top: `${rect.bottom + 4}px`, bottom: "auto" }),
  }
}
watch(open, (isOpen) => {
  if (isOpen) {
    void nextTick(placeList)
    window.addEventListener("resize", placeList)
    window.addEventListener("scroll", placeList, true)
  } else {
    window.removeEventListener("resize", placeList)
    window.removeEventListener("scroll", placeList, true)
  }
})
onMounted(() => {
  if (props.autofocus) input.value?.focus({ preventScroll: true })
})
onUnmounted(() => {
  window.removeEventListener("resize", placeList)
  window.removeEventListener("scroll", placeList, true)
})

function openList() {
  if (!open.value) query.value = ""
  open.value = true
}

function close() {
  open.value = false
  query.value = ""
  emit("close")
}

/** The list closes once the focus leaves the whole component: the clear button stays reachable with Tab. */
function onFocusOut(event: FocusEvent) {
  if (event.relatedTarget instanceof Node && root.value?.contains(event.relatedTarget)) return
  if (open.value) close()
}

function pick(monster: Monster) {
  emit("update:modelValue", monster.id)
  close()
  if (props.resetOnSelect) input.value?.blur()
}

function clear() {
  emit("update:modelValue", null)
  close()
  input.value?.focus()
}

function move(delta: number) {
  if (!open.value) openList()
  const count = shown.value.length
  if (count === 0) return
  activeIndex.value = (activeIndex.value + delta + count) % count
  void nextTick(() => list.value?.querySelector(`#${CSS.escape(`${id}-option-${activeIndex.value}`)}`)?.scrollIntoView({ block: "nearest" }))
}

function onKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case "ArrowDown":
      event.preventDefault()
      move(1)
      break
    case "ArrowUp":
      event.preventDefault()
      move(-1)
      break
    case "Home":
    case "End":
      if (!open.value) return
      event.preventDefault()
      activeIndex.value = event.key === "Home" ? 0 : Math.max(0, shown.value.length - 1)
      break
    case "Enter": {
      const monster = shown.value[activeIndex.value]
      if (open.value && monster) {
        event.preventDefault()
        pick(monster)
      }
      break
    }
    case "Escape":
      if (open.value) {
        event.preventDefault()
        event.stopPropagation()
        close()
      }
      break
  }
}

function onInput(event: Event) {
  query.value = (event.target as HTMLInputElement).value
  open.value = true
}
</script>

<template>
  <div ref="root" class="combobox" :class="{ open }" @focusout="onFocusOut">
    <div class="field">
      <svg class="field-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3.5 3.5" /></svg>
      <input
        :id="id"
        ref="input"
        class="field-input"
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        aria-autocomplete="list"
        :aria-label="label"
        :aria-expanded="open"
        :aria-controls="listId"
        :aria-activedescendant="open && shown.length > 0 ? `${id}-option-${activeIndex}` : undefined"
        :placeholder="placeholder"
        :value="displayedValue"
        @focus="openList"
        @click="openList"
        @input="onInput"
        @keydown="onKeydown"
      />
      <button v-if="modelValue && !resetOnSelect" type="button" class="clear" :aria-label="app.text.value.clear" @mousedown.prevent @click="clear">
        <span aria-hidden="true">✕</span>
      </button>
    </div>
    <!--
      Out of the Tab order: a scrollable list is focusable by default, and hiding it once focused would drop the focus
      on the page. A press on it (padding, scrollbar) must not take the focus from the field either.
    -->
    <ul v-show="open" :id="listId" ref="list" class="options" role="listbox" tabindex="-1" :aria-label="label" :style="listStyle" @mousedown.prevent>
      <li
        v-for="(monster, index) in shown"
        :id="`${id}-option-${index}`"
        :key="monster.id"
        class="option"
        :class="{ active: index === activeIndex, selected: monster.id === modelValue }"
        role="option"
        :aria-selected="monster.id === modelValue"
        @mouseenter="activeIndex = index"
        @click="pick(monster)"
      >
        <span class="option-icon" aria-hidden="true">
          <img :src="monsterIconUrl(app.state.gameId, monster.iconAssetKey)" alt="" />
        </span>
        <span class="option-name">{{ name(monster.id) }}</span>
        <span class="option-meta">{{ app.entityName("families", monster.familyId) }} · {{ monster.rank }}</span>
      </li>
      <li v-if="shown.length === 0" class="note" role="presentation">{{ app.text.value.noResults }}</li>
      <li v-else-if="matches.length > shown.length" class="note" role="presentation">
        {{ formatText(app.text.value.moreResults, { count: matches.length - shown.length }) }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.combobox {
  position: relative;
  min-width: 0;
}
.field {
  position: relative;
  display: flex;
  align-items: center;
}
.field-input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 0.45rem 2rem 0.45rem 2rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
  color: var(--text);
  /* 16 px keeps mobile browsers from zooming into the field. */
  font: inherit;
  font-size: 16px;
}
.app-shell.wide .field-input {
  font-size: 0.9rem;
}
.field-icon {
  position: absolute;
  left: 0.6rem;
  fill: none;
  stroke: var(--text-muted);
  stroke-width: 1.5;
  stroke-linecap: round;
  pointer-events: none;
}
.clear {
  position: absolute;
  right: 0.3rem;
  display: grid;
  place-items: center;
  width: 1.6rem;
  height: 1.6rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}
.options {
  position: fixed;
  z-index: 30;
  box-sizing: border-box;
  margin: 0;
  padding: 0.25rem;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
  box-shadow: var(--shadow);
  list-style: none;
}
.option {
  display: grid;
  grid-template-columns: 1.75rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.4rem;
  border-radius: 0.35rem;
  cursor: pointer;
}
.option.active {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
}
.option.selected .option-name {
  font-weight: 700;
}
.option-icon {
  width: 1.75rem;
  height: 1.75rem;
  overflow: hidden;
  border-radius: 0.25rem;
}
.option-icon img {
  width: 100%;
  height: auto;
  image-rendering: pixelated;
  display: block;
}
.option-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.option-meta {
  color: var(--text-muted);
  font-size: 0.8rem;
  white-space: nowrap;
}
.note {
  padding: 0.4rem 0.5rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}
</style>
