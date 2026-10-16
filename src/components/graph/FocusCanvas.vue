<script setup lang="ts">
import { Controls } from "@vue-flow/controls"
import { type Edge, Handle, type Node, Position, VueFlow } from "@vue-flow/core"
import { computed, nextTick, ref, watch } from "vue"

import { useAppContext } from "../../app/context"
import type { GameData } from "../../domain/game"
import { formatText } from "../../i18n"
import { type FocusLabels, type FocusNodeData, focusGraph, MONSTER_SCALE, ROOT_SCALE, SLOT_BOX } from "../../services/graph/focusGraph"
import { type ParentSlot, ROOT_ID } from "../../services/graph/focusTree"
import FamilyIcon from "../common/FamilyIcon.vue"
import { restoreFocus } from "../common/focus"
import { choiceHint, commonFamily, conditionDetail, conditionName, recipeConditionsText } from "../common/labels"
import MonsterIcon from "../common/MonsterIcon.vue"
import ObtainTag from "../common/ObtainTag.vue"
import { createLineCounter } from "../common/textLines"
import { useFocusViewport } from "./focusViewport"
import ParentPicker from "./ParentPicker.vue"
import TreeShareControls from "./TreeShareControls.vue"

const props = defineProps<{
  game: GameData
  /** Height hidden by an overlay at the bottom of the canvas (the mobile detail sheet). */
  bottomInset: number
}>()

const app = useAppContext()
const container = ref<HTMLElement>()

/** Font size of `.node-note`. */
const NOTE_FONT_SIZE = 11

/** How a parent slot is named, in its node and in the search picking its monster. */
function slotLabel(slot: ParentSlot) {
  const { condition, options } = slot
  if (!condition) {
    return { title: app.text.value.parentToChoose, detail: null, hint: choiceHint(app, options), familyId: commonFamily(app, options) }
  }
  // A condition is named after itself ("Incarnus", "Famille Nature"): its candidates are not a whole family.
  const title = conditionName(app, condition)
  const familyId = condition.type === "family" ? condition.familyId : commonFamily(app, options)
  return { title, detail: conditionDetail(app, condition), hint: formatText(app.text.value.slotChoice, { title, count: options.length }), familyId }
}

const labels: FocusLabels = {
  slot: slotLabel,
  recipeConditions: (recipe) => recipeConditionsText(app, recipe),
  normalChildren: (count) => ({ title: app.text.value.normal, detail: formatText(app.text.value.resultCount, { count }) }),
  noteLines: createLineCounter(NOTE_FONT_SIZE),
}

/** The tree placed by `focusGraph`, as Vue Flow nodes and edges. */
const graph = computed(() => {
  const { nodes, edges } = focusGraph({
    root: app.ancestryTree.value,
    children: app.descendantTree.value,
    monsters: app.monsters.value,
    selectedId: app.selectedNode.value?.id ?? null,
    labels,
  })
  return {
    nodes: nodes.map(
      (node): Node<FocusNodeData> => ({
        id: node.id,
        type: node.data.kind,
        position: { x: node.x, y: node.y },
        width: node.size.width,
        height: node.size.height,
        data: node.data,
        focusable: node.data.kind !== "abstract",
      }),
    ),
    edges: edges.map(
      (edge): Edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "default",
        selectable: false,
        focusable: false,
        style: edge.dashed ? { strokeDasharray: "6 5" } : undefined,
      }),
    ),
  }
})

const viewport = useFocusViewport({
  container,
  nodes: () => graph.value.nodes,
  rootId: () => app.state.tree?.rootId ?? null,
  anchorId: () => app.selectedNode.value?.id ?? ROOT_ID,
  bottomInset: () => props.bottomInset,
})

/** The open parent picker (see `ParentPicker.vue`) and the slot node it was opened from. */
const picker = ref<{
  nodeId: string
  options: string[]
  current: string | null
  title: string
  note: string | null
  placeholder: string
  top: string
} | null>(null)
watch(graph, () => (picker.value = null), { flush: "post" })

/** What had the focus when the picker opened (the slot's node, a picked monster's "Change…" button), to give it back. */
let pickerOpener: HTMLElement | null = null
/** The slot being picked: its node changes id once a monster is picked or the slot emptied. */
let pickerSlot: { ownerId: string; index: number } | null = null

function openPicker(nodeId: string) {
  const slotNode = app.treeNodes.value.get(nodeId)?.node
  const slot = slotNode?.slot
  if (!slot) return
  const focused = document.activeElement
  pickerOpener = focused instanceof HTMLElement && container.value?.contains(focused) ? focused : null
  pickerSlot = { ownerId: slot.ownerId, index: slot.index }
  const { title, detail, hint } = slotLabel(slot)
  picker.value = {
    nodeId,
    options: slot.options,
    current: slotNode.item.type === "monster" ? slotNode.item.monsterId : null,
    title,
    note: detail,
    placeholder: hint,
    // High enough for the list to open below, above the mobile sheet.
    top: `${Math.round(Math.min(120, Math.max(12, viewport.visibleHeight() * 0.15)))}px`,
  }
}

/** Null (the field's clear button) empties the slot again. */
function pick(monsterId: string | null) {
  const slotId = picker.value?.nodeId
  if (!slotId) return
  const pickedId = app.pickParent(slotId, monsterId)
  if (pickedId) viewport.replace(slotId, pickedId)
}

/**
 * Closing removes the focused field: the focus goes back to what opened the picker or, when the slot's node was
 * replaced (a monster picked, the slot emptied), to the node now filling that slot. A focus the user put elsewhere
 * meanwhile (a click outside the canvas) is left alone.
 */
function closePicker() {
  if (!picker.value) return
  picker.value = null
  const opener = pickerOpener
  pickerOpener = null
  const slot = pickerSlot
  const target = () => {
    if (opener?.isConnected) return opener
    const nodeId = [...app.treeNodes.value].find(([, { node }]) => slot && node.slot?.ownerId === slot.ownerId && node.slot.index === slot.index)?.[0]
    return nodeId ? container.value?.querySelector<HTMLElement>(`.vue-flow__node[data-id="${CSS.escape(nodeId)}"]`) : null
  }
  void nextTick(() => restoreFocus(target))
}

function open(nodeId: string) {
  const value = graph.value.nodes.find((node) => node.id === nodeId)?.data
  if (!value || value.kind === "abstract") return
  if (value.kind === "slot") openPicker(nodeId)
  else app.selectNode(nodeId)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== "Enter" && event.key !== " ") return
  const id = (event.target as HTMLElement | null)?.closest<HTMLElement>(".vue-flow__node")?.dataset.id
  if (!id) return
  event.preventDefault()
  open(id)
}
</script>

<template>
  <div ref="container" class="focus-canvas" :aria-label="formatText(app.text.value.focusGraph, { name: app.entityName('monsters', app.state.tree?.rootId ?? '') })" @keydown="onKeydown">
    <div class="focus-toolbar">
      <button type="button" class="back-button" @click="app.openTree(null)">
        <span aria-hidden="true">←</span> {{ app.text.value.backToAtlas }}
      </button>
    </div>
    <VueFlow
      id="focus"
      :nodes="graph.nodes"
      :edges="graph.edges"
      :min-zoom="0.2"
      :max-zoom="3"
      :nodes-draggable="false"
      :nodes-connectable="false"
      :elements-selectable="false"
      :edges-focusable="false"
      :zoom-on-double-click="false"
      @nodes-initialized="viewport.onInitialized"
      @move="viewport.onMove"
      @node-click="({ node }) => open(node.id)"
    >
      <template #node-focus="{ data }">
        <div class="node focus-node" :class="{ selected: data.selected }">
          <Handle type="target" :position="Position.Top" :connectable="false" />
          <MonsterIcon :game-id="game.id" :monster="data.monster" :alt="app.entityName('monsters', data.monster.id)" :scale="ROOT_SCALE" />
          <strong class="node-name">{{ app.entityName("monsters", data.monster.id) }}</strong>
          <ObtainTag v-if="data.tag" :type="data.tag" class="node-tag" />
          <Handle type="source" :position="Position.Bottom" :connectable="false" />
        </div>
      </template>
      <template #node-monster="{ id, data }">
        <div class="node monster-node" :class="{ selected: data.selected }" :title="app.entityName('monsters', data.monster.id)">
          <Handle type="target" :position="Position.Top" :connectable="false" />
          <MonsterIcon :game-id="game.id" :monster="data.monster" :alt="app.entityName('monsters', data.monster.id)" :scale="MONSTER_SCALE" />
          <span class="node-name">{{ app.entityName("monsters", data.monster.id) }}</span>
          <ObtainTag v-if="data.tag" :type="data.tag" class="node-tag" />
          <span v-if="data.note" class="node-note">{{ data.note }}</span>
          <button v-if="data.picked" type="button" class="slot-field nodrag nopan" @click.stop="openPicker(id)" @keydown.stop>
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3.5 3.5" /></svg>
            {{ app.text.value.change }}
          </button>
          <Handle type="source" :position="Position.Bottom" :connectable="false" />
        </div>
      </template>
      <template #node-slot="{ data }">
        <div class="node slot-node">
          <Handle type="target" :position="Position.Top" :connectable="false" />
          <span class="slot-box" :class="{ unknown: !data.familyId }" :style="{ width: `${SLOT_BOX}px`, height: `${SLOT_BOX}px` }">
            <FamilyIcon v-if="data.familyId" :family-id="data.familyId" :scale="2" />
            <span v-else aria-hidden="true">?</span>
          </span>
          <span v-if="data.title" class="node-name">{{ data.title }}</span>
          <span v-if="data.note" class="node-note">{{ data.note }}</span>
          <span class="slot-field">
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3.5 3.5" /></svg>
            {{ app.text.value.choose }}
          </span>
          <Handle type="source" :position="Position.Bottom" :connectable="false" />
        </div>
      </template>
      <template #node-abstract="{ data }">
        <div class="node abstract-node">
          <Handle type="target" :position="Position.Top" :connectable="false" />
          <span class="abstract-title">{{ data.title }}</span>
          <span v-if="data.detail" class="node-note">{{ data.detail }}</span>
          <span v-if="data.note" class="node-note">{{ data.note }}</span>
          <Handle type="source" :position="Position.Bottom" :connectable="false" />
        </div>
      </template>
      <Controls position="top-right" :show-interactive="false">
        <TreeShareControls />
      </Controls>
    </VueFlow>
    <ParentPicker
      v-if="picker"
      :key="picker.nodeId"
      :options="picker.options"
      :current="picker.current"
      :title="picker.title"
      :note="picker.note"
      :placeholder="picker.placeholder"
      :top="picker.top"
      @pick="pick"
      @close="closePicker"
    />
  </div>
</template>

<style scoped>
.focus-canvas {
  position: absolute;
  inset: 0;
}
.focus-toolbar {
  position: absolute;
  top: 0.75rem;
  left: var(--canvas-toolbar-left, 0.75rem);
  z-index: 5;
}
.back-button {
  padding: 0.45rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
  box-shadow: var(--shadow);
  cursor: pointer;
}
.node {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  text-align: center;
  color: var(--text);
}
.focus-node .node-name {
  font-size: 14px;
}
.monster-node,
.focus-node,
.slot-node {
  cursor: pointer;
}
/*
 * Looks like a search field; the real one opens over the canvas on click. It sits at a fixed distance from the bottom
 * of its node, so the fields of one (bottom-aligned) level line up whatever is written above them.
 */
.slot-field {
  display: flex;
  flex: none;
  margin-top: auto;
  margin-bottom: 12px;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: 24px;
  box-sizing: border-box;
  padding: 0 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.slot-field svg {
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
}
.slot-node:hover .slot-field,
button.slot-field:hover {
  border-color: var(--text);
}
.monster-node:hover :deep(.monster-icon),
.focus-node:hover :deep(.monster-icon) {
  outline: 2px solid var(--border);
  outline-offset: 2px;
}
/* The occurrence whose sheet is open. */
.node.selected :deep(.monster-icon),
.node.selected:hover :deep(.monster-icon) {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
  border-radius: 4px;
}
.node.selected .node-name {
  color: var(--accent);
  font-weight: 700;
}
.node-name {
  font-size: 12px;
  line-height: 1.2;
  overflow-wrap: anywhere;
}
.node-tag {
  font-size: 13px;
}
.node-note {
  font-size: 11px;
  color: var(--text-muted);
}
.abstract-node {
  justify-content: center;
  padding: 6px 10px;
  border: 1px dashed var(--text-muted);
  border-radius: 10px;
  background: var(--surface);
}
/*
 * A family parent is its family's icon on its own, at the bottom of the icon's place so its name sits as close as a
 * monster's; a dashed box stands for a parent of no known family.
 */
.slot-box {
  display: grid;
  place-items: end center;
  box-sizing: border-box;
}
.slot-box.unknown {
  place-items: center;
  border: 1px dashed var(--text-muted);
  background: var(--surface);
  color: var(--text-muted);
  font-size: 24px;
  font-weight: 600;
}
.abstract-title {
  font-size: 13px;
  font-weight: 600;
}
:deep(.vue-flow__handle) {
  opacity: 0;
  pointer-events: none;
}
:deep(.vue-flow__edge) {
  pointer-events: none;
}
:deep(.vue-flow__edge-path) {
  stroke: var(--text-muted);
  stroke-width: 1.5;
}
:deep(.vue-flow__node:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 6px;
}
:deep(.vue-flow__controls) {
  box-shadow: var(--shadow);
}
</style>
