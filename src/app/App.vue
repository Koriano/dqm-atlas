<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, watchEffect } from "vue"

import { restoreFocus } from "../components/common/focus"
import LoadingIndicator from "../components/common/LoadingIndicator.vue"
import PanelToggleIcon from "../components/common/PanelToggleIcon.vue"
import AtlasCanvas from "../components/graph/AtlasCanvas.vue"
import FocusCanvas from "../components/graph/FocusCanvas.vue"
import AppHeader from "../components/layout/AppHeader.vue"
import RelationsPanel from "../components/layout/RelationsPanel.vue"
import MonsterDetailPanel from "../components/monster/MonsterDetailPanel.vue"
import { GAME_IDS } from "../data"
import { detectLanguage } from "../i18n"
import { ROOT_ID } from "../services/graph/focusTree"
import { createAppContext, provideAppContext } from "./context"
import { readRoute, routeHash } from "./route"

// The only place that knows the breakpoint: styles elsewhere follow the shell's `wide` class.
const WIDE_SCREEN = "(min-width: 900px)"
const wideQuery = window.matchMedia(WIDE_SCREEN)
const wide = ref(wideQuery.matches)
const onWidthChange = (event: MediaQueryListEvent) => (wide.value = event.matches)
onMounted(() => wideQuery.addEventListener("change", onWidthChange))
onUnmounted(() => wideQuery.removeEventListener("change", onWidthChange))

const app = createAppContext({ gameId: readRoute()?.gameId ?? GAME_IDS[0], language: detectLanguage(), leftPanelOpen: wide.value })
provideAppContext(app)

// The address names the game and the root of the open tree, so a tree can be linked to and Back returns to the atlas.
const currentHash = () => routeHash({ gameId: app.state.gameId, monsterId: app.state.tree?.rootId ?? null })
function applyRoute() {
  const route = readRoute()
  app.setGame(route?.gameId ?? GAME_IDS[0])
  const monsterId = route?.monsterId ?? null
  if ((app.state.tree?.rootId ?? null) !== monsterId) app.openTree(monsterId)
  // An address without a known game (the bare site address among them) is replaced by the one of the game shown.
  if (window.location.hash !== currentHash()) window.history.replaceState(null, "", currentHash())
}
applyRoute()
onMounted(() => window.addEventListener("hashchange", applyRoute))
onUnmounted(() => window.removeEventListener("hashchange", applyRoute))
// Set while an address naming nothing is being corrected: the correction takes its place in the history instead of
// adding an entry, otherwise Back would land on the bad address again and be sent forward each time.
let correctingAddress = false
watch(currentHash, (hash) => {
  const method = correctingAddress ? "replaceState" : "pushState"
  correctingAddress = false
  if (window.location.hash !== hash) window.history[method](null, "", hash)
})
// A linked monster that does not exist in the game falls back to the atlas.
watch(
  () => app.status.value === "ready" && app.state.tree !== null && !app.treeRoot.value,
  (unknown) => {
    if (!unknown) return
    correctingAddress = true
    app.openTree(null)
  },
)

// Opening a tree hides or removes what had the focus (the atlas, the search list, the sheet's "View" button), and
// leaving it removes its "back" button: the focus then goes to the tree's root, or back to that monster in the atlas.
// A tree already named by the address on arrival takes no focus.
watch(
  () => app.state.tree?.rootId ?? null,
  (rootId, previousId) => {
    const selector = rootId ? `.focus-canvas .vue-flow__node[data-id="${ROOT_ID}"]` : previousId && `.atlas .vue-flow__node[data-id="${CSS.escape(previousId)}"]`
    if (selector) restoreFocus(() => document.querySelector<HTMLElement>(selector))
  },
  { flush: "post" },
)

watchEffect(() => {
  document.documentElement.lang = app.state.language
  // An open tree is named first, so its tab, bookmark and history entry can be told apart.
  const root = app.treeRoot.value
  document.title = root ? `${app.entityName("monsters", root.id)} - ${app.text.value.appTitle}` : app.text.value.pageTitle
  document.querySelector('meta[name="description"]')?.setAttribute("content", app.text.value.pageDescription)
})

const drawerOpen = computed(() => !wide.value && app.state.leftPanelOpen)
const sheetOpen = computed(() => !wide.value && app.state.tree !== null)

// The mobile drawer is modal: the rest of the page is inert meanwhile, the focus enters it and, once it is closed,
// goes back to the button that opens it.
watch(
  drawerOpen,
  (isOpen) => {
    if (isOpen) document.querySelector<HTMLElement>("#relations-panel button")?.focus()
    else restoreFocus(() => document.querySelector<HTMLElement>(".floating-toggle"))
  },
  { flush: "post" },
)

// The focus graph must fit above the mobile bottom sheet, whose height follows its content.
const detailPanel = ref<HTMLElement>()
const sheetHeight = ref(0)
const sheetObserver = new ResizeObserver(([entry]) => (sheetHeight.value = entry ? entry.contentRect.height : 0))
watch(detailPanel, (element, previous) => {
  if (previous) sheetObserver.unobserve(previous)
  if (element) sheetObserver.observe(element)
})
onUnmounted(() => sheetObserver.disconnect())
const bottomInset = computed(() => (sheetOpen.value ? sheetHeight.value : 0))

function onKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape" || wide.value) return
  if (drawerOpen.value) app.setLeftPanelOpen(false)
  else if (sheetOpen.value) app.openTree(null)
}
onMounted(() => window.addEventListener("keydown", onKeydown))
onUnmounted(() => window.removeEventListener("keydown", onKeydown))
</script>

<template>
  <div
    class="app-shell"
    :class="{ wide, 'left-open': app.state.leftPanelOpen, 'sheet-open': sheetOpen, 'detail-collapsed': !app.state.detailExpanded }"
  >
    <AppHeader class="shell-header" :inert="drawerOpen || undefined" />
    <aside
      v-if="app.state.leftPanelOpen || wide"
      id="relations-panel"
      class="shell-left"
      :role="drawerOpen ? 'dialog' : undefined"
      :aria-modal="drawerOpen || undefined"
      :aria-label="drawerOpen ? app.text.value.relations : undefined"
    >
      <RelationsPanel v-if="app.state.leftPanelOpen" @close="app.setLeftPanelOpen(false)" />
      <button
        v-else
        type="button"
        class="icon-button rail-toggle"
        aria-expanded="false"
        aria-controls="relations-panel"
        :aria-label="app.text.value.openRelations"
        :title="app.text.value.openRelations"
        @click="app.setLeftPanelOpen(true)"
      >
        <PanelToggleIcon direction="open" />
      </button>
    </aside>
    <div v-if="drawerOpen" class="shell-backdrop" aria-hidden="true" @click="app.setLeftPanelOpen(false)" />
    <main class="shell-canvas" :class="{ 'with-floating-toggle': !wide && !app.state.leftPanelOpen }" :inert="drawerOpen || undefined">
      <button
        v-if="!wide && !app.state.leftPanelOpen"
        type="button"
        class="icon-button floating-toggle"
        aria-expanded="false"
        aria-controls="relations-panel"
        :aria-label="app.text.value.openRelations"
        :title="app.text.value.openRelations"
        @click="app.setLeftPanelOpen(true)"
      >
        <PanelToggleIcon direction="open" />
      </button>
      <LoadingIndicator
        v-if="app.status.value === 'loading'"
        :label="app.loadProgress.value ? app.text.value.loadingIcons : app.text.value.loading"
        :progress="app.loadProgress.value"
      />
      <p v-else-if="app.status.value === 'error'" class="canvas-message" role="alert">{{ app.text.value.loadError }}</p>
      <template v-else-if="app.game.value">
        <!-- The atlas stays mounted while a monster is focused so its viewport is kept. -->
        <AtlasCanvas v-show="!app.treeRoot.value" :key="app.game.value.id" :game="app.game.value" />
        <FocusCanvas v-if="app.treeRoot.value" :game="app.game.value" :bottom-inset="bottomInset" />
      </template>
    </main>
    <aside id="detail-panel" ref="detailPanel" class="shell-detail" :hidden="!wide && !sheetOpen" :inert="drawerOpen || undefined">
      <MonsterDetailPanel />
    </aside>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    "header"
    "canvas";
  height: 100dvh;
}
.shell-header {
  grid-area: header;
}
.shell-canvas {
  grid-area: canvas;
  position: relative;
  display: grid;
  place-items: center;
  min-width: 0;
  background: var(--canvas);
}
.shell-canvas.with-floating-toggle {
  --canvas-toolbar-left: 3.75rem;
}
.canvas-message {
  margin: 0;
  padding: 1rem;
  color: var(--text-muted);
  text-align: center;
}
.shell-left,
.shell-detail {
  background: var(--surface);
  overflow-y: auto;
}
.rail-toggle {
  margin: 0.75rem auto 0;
  display: grid;
}
.floating-toggle {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  /* Not above the tree's parent-picker backdrop, which is at the same level and comes later. */
  z-index: 5;
  box-shadow: var(--shadow);
}

/* Wide screens: left column (full or collapsed to a rail), persistent right column (full or collapsed to the heading). */
.app-shell.wide {
  --left-width: 3.25rem;
  --detail-width: 23rem;
  grid-template-columns: var(--left-width) minmax(0, 1fr) var(--detail-width);
  grid-template-areas:
    "header header header"
    "left canvas detail";
}
.app-shell.wide.left-open {
  --left-width: 17rem;
}
.app-shell.wide.detail-collapsed {
  --detail-width: 8rem;
}
.app-shell.wide .shell-left {
  grid-area: left;
  border-right: 1px solid var(--border);
}
.app-shell.wide .shell-detail {
  grid-area: detail;
  border-left: 1px solid var(--border);
}

/* Narrow screens: the canvas keeps the whole area; the left panel is a drawer, details a bottom sheet. */
.app-shell:not(.wide) .shell-left {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 20;
  width: min(20rem, 85vw);
  box-shadow: var(--shadow);
}
.shell-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
  background: rgb(0 0 0 / 0.35);
}
.app-shell:not(.wide) .shell-detail {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 5;
  max-height: 55dvh;
  border-top: 1px solid var(--border);
  border-radius: 0.75rem 0.75rem 0 0;
  box-shadow: var(--shadow);
}
</style>
