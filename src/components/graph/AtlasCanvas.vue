<script setup lang="ts">
import { Controls } from "@vue-flow/controls"
import { type Node, type VueFlowStore, VueFlow } from "@vue-flow/core"
import { computed, ref } from "vue"

import { useAppContext } from "../../app/context"
import type { GameData } from "../../domain/game"
import type { Monster } from "../../domain/monster"
import { MONSTER_ICON_SLOT, MONSTER_ICON_SLOTS } from "../../services/assets"
import { type AtlasOptions, atlasLayout } from "../../services/graph/atlasLayout"
import FamilyIcon from "../common/FamilyIcon.vue"
import MonsterIcon from "../common/MonsterIcon.vue"
import TreeShareControls from "./TreeShareControls.vue"

const props = defineProps<{ game: GameData }>()

const app = useAppContext()

const ATLAS: AtlasOptions = {
  slot: MONSTER_ICON_SLOT,
  slotsBySize: MONSTER_ICON_SLOTS,
  perRow: 4,
  gap: 8,
  columnGap: 40,
  rowGap: 28,
  headerHeight: 44,
  sideWidth: 48,
}

type AtlasNodeData =
  | { kind: "monster"; monster: Monster }
  | { kind: "family"; familyId: string }
  | { kind: "rank"; rank: string }
  | { kind: "grid"; rows: number[]; columns: number[]; width: number; height: number }

const layout = computed(() => atlasLayout(props.game, ATLAS))

const nodes = computed<Node<AtlasNodeData>[]>(() => {
  const { monsters: boxes, families, ranks, rowDividers, columnDividers, width, height } = layout.value
  return [
    {
      id: "grid",
      type: "grid",
      position: { x: 0, y: 0 },
      width,
      height,
      data: { kind: "grid", rows: rowDividers, columns: columnDividers, width, height },
      focusable: false,
      zIndex: -1,
    },
    ...families.map((box): Node<AtlasNodeData> => ({
      id: `family:${box.familyId}`,
      type: "family",
      position: { x: box.x, y: box.y },
      width: box.width,
      height: box.height,
      data: { kind: "family", familyId: box.familyId },
      focusable: false,
    })),
    ...ranks.map((box): Node<AtlasNodeData> => ({
      id: `rank:${box.rank}`,
      type: "rank",
      position: { x: box.x, y: box.y },
      width: box.width,
      height: box.height,
      data: { kind: "rank", rank: box.rank },
      focusable: false,
    })),
    ...boxes.map((box): Node<AtlasNodeData> => ({
      id: box.monsterId,
      type: "monster",
      position: { x: box.x, y: box.y },
      width: box.width,
      height: box.height,
      data: { kind: "monster", monster: app.monsters.value.get(box.monsterId) as Monster },
    })),
  ]
})

const container = ref<HTMLElement>()

// The whole atlas when it stays readable, otherwise its top-left corner at a comfortable zoom.
function showInitialView(flow: VueFlowStore) {
  const element = container.value
  if (!element) return
  // Keep 64 px free on the right for the zoom controls.
  const width = element.clientWidth - 64
  const fitZoom = Math.min(width / layout.value.width, element.clientHeight / layout.value.height)
  if (fitZoom >= 0.35) {
    const zoom = fitZoom * 0.96
    void flow.setViewport({ x: (width - layout.value.width * zoom) / 2, y: (element.clientHeight - layout.value.height * zoom) / 2, zoom })
  }
  else void flow.setViewport({ x: 12, y: 60, zoom: 0.75 })
}

function selectFrom(target: EventTarget | null) {
  const node = (target as HTMLElement | null)?.closest<HTMLElement>(".vue-flow__node-monster")
  const id = node?.dataset.id
  if (id) app.openTree(id)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== "Enter" && event.key !== " ") return
  event.preventDefault()
  selectFrom(event.target)
}
</script>

<template>
  <div ref="container" class="atlas" @keydown="onKeydown">
    <VueFlow
      id="atlas"
      :nodes="nodes"
      :min-zoom="0.1"
      :max-zoom="3"
      :nodes-draggable="false"
      :nodes-connectable="false"
      :elements-selectable="false"
      :zoom-on-double-click="false"
      @pane-ready="showInitialView"
      @node-click="({ node }) => node.type === 'monster' && app.openTree(node.id)"
    >
      <template #node-monster="{ data }">
        <div
          class="atlas-monster"
          :class="{ selected: app.state.tree?.rootId === data.monster.id }"
          :title="app.entityName('monsters', data.monster.id)"
        >
          <MonsterIcon :game-id="game.id" :monster="data.monster" :alt="app.entityName('monsters', data.monster.id)" />
        </div>
      </template>
      <template #node-grid="{ data }">
        <svg class="atlas-grid" :width="data.width" :height="data.height" aria-hidden="true">
          <line v-for="y in data.rows" :key="`r${y}`" x1="0" :x2="data.width" :y1="y" :y2="y" />
          <line v-for="x in data.columns" :key="`c${x}`" :x1="x" :x2="x" y1="0" :y2="data.height" />
        </svg>
      </template>
      <template #node-family="{ data }">
        <div class="atlas-family">
          <FamilyIcon :family-id="data.familyId" />
          <span>{{ app.entityName("families", data.familyId) }}</span>
        </div>
      </template>
      <template #node-rank="{ data }">
        <div class="atlas-rank">{{ data.rank }}</div>
      </template>
      <Controls position="top-right" :show-interactive="false">
        <TreeShareControls />
      </Controls>
    </VueFlow>
  </div>
</template>

<style scoped>
.atlas {
  position: absolute;
  inset: 0;
}
.atlas-monster {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  cursor: pointer;
}
.atlas-monster:hover {
  outline: 2px solid var(--border);
}
.atlas-monster.selected {
  outline: 3px solid var(--accent);
  outline-offset: 1px;
}
.atlas-family {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 6px;
  height: 100%;
  padding-bottom: 8px;
  box-sizing: border-box;
  font-weight: 700;
  font-size: 15px;
  color: var(--text);
}
.atlas-rank {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  height: 100%;
  padding-top: 8px;
  box-sizing: border-box;
  font-weight: 700;
  font-size: 18px;
  color: var(--text-muted);
}
.atlas-grid {
  display: block;
  overflow: visible;
}
.atlas-grid line {
  stroke: var(--border);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
:deep(.vue-flow__node-grid),
:deep(.vue-flow__node-family),
:deep(.vue-flow__node-rank) {
  pointer-events: none;
}
:deep(.vue-flow__node-monster:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 4px;
}
:deep(.vue-flow__controls) {
  box-shadow: var(--shadow);
}
</style>
