<script setup lang="ts">
import { computed, nextTick, ref, useId } from "vue"

import { type DetailTab, useAppContext } from "../../app/context"
import { formatText } from "../../i18n"
import { monsterSizes } from "../../services/stats"
import InfoPopover from "../common/InfoPopover.vue"
import MonsterIcon from "../common/MonsterIcon.vue"
import MonsterResistancesTab from "./MonsterResistancesTab.vue"
import MonsterStatsTab from "./MonsterStatsTab.vue"
import ObtainmentOptions from "./ObtainmentOptions.vue"

const app = useAppContext()
const node = computed(() => app.selectedNode.value)
/** What the selected monster's skill unlocks, in the game's order. */
const skillTiers = computed(() => {
  const skillId = node.value?.monster.skillId
  const tiers = app.game.value?.skills.find((skill) => skill.id === skillId)?.tiers ?? []
  return tiers.map((tier) =>
    tier.type === "ability"
      ? { key: `ability:${tier.abilityId}`, points: tier.points, name: app.entityName("abilities", tier.abilityId) }
      : { key: `trait:${tier.traitId}`, points: tier.points, name: app.entityName("traits", tier.traitId) },
  )
})
/** The sizes the sheet can show; a single one means the game gives every monster its own size only. */
const sizes = computed(() => (node.value && app.game.value ? monsterSizes(node.value.monster, app.game.value) : []))
const shownSize = computed(() => (node.value ? app.sheetSizeOf(node.value.monster) : null))
const tabsId = useId()
const tabList = ref<HTMLElement>()

/** Arrow keys move along the tabs and open the one reached, as in the tabs pattern; only the open tab is a Tab stop. */
function onTabKeydown(event: KeyboardEvent) {
  const ids = tabs.value.map((tab) => tab.id)
  const index = ids.indexOf(app.state.detailTab)
  const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: ids.length - 1 }
  const target = moves[event.key]
  if (target === undefined) return
  event.preventDefault()
  app.setDetailTab(ids[(target + ids.length) % ids.length] ?? "obtainment")
  void nextTick(() => tabList.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus())
}

const tabs = computed<{ id: DetailTab; label: string }[]>(() => [
  { id: "obtainment", label: app.text.value.tabObtainment },
  { id: "stats", label: app.text.value.tabStats },
  { id: "resistances", label: app.text.value.tabResistances },
])
</script>

<template>
  <section class="detail-panel" :aria-label="app.text.value.details">
    <template v-if="node">
      <header class="detail-header">
        <div class="detail-portrait">
          <MonsterIcon :game-id="app.state.gameId" :monster="node.monster" :alt="app.entityName('monsters', node.monster.id)" :scale="2" />
          <button v-if="node.side !== 'root'" type="button" class="view-button" @click="app.openTree(node.monster.id)">
            {{ app.text.value.view }}
          </button>
        </div>
        <div class="detail-heading">
          <h2 class="detail-name">{{ app.entityName("monsters", node.monster.id) }}</h2>
          <p class="detail-number">{{ formatText(app.text.value.libraryNumber, { number: node.monster.libraryId }) }}</p>
        </div>
      </header>
      <dl class="facts">
        <dt>{{ app.text.value.family }}</dt>
        <dd>{{ app.entityName("families", node.monster.familyId) }}</dd>
        <dt>{{ app.text.value.rank }}</dt>
        <dd>{{ node.monster.rank }}</dd>
        <dt>{{ app.text.value.size }}</dt>
        <dd>
          <div v-if="sizes.length > 1" class="size-switch" role="group" :aria-label="app.text.value.sheetSize">
            <button
              v-for="size in sizes"
              :key="size"
              type="button"
              class="size-button"
              :aria-pressed="size === shownSize"
              @click="app.setSheetSize(size)"
            >
              {{ size }}
            </button>
          </div>
          <template v-else>{{ node.monster.size }}</template>
        </dd>
        <dt>{{ app.text.value.skill }}</dt>
        <dd>
          <InfoPopover :label="app.entityName('skills', node.monster.skillId)">
            <table class="tiers">
              <thead>
                <tr>
                  <th scope="col">{{ app.text.value.skillPoints }}</th>
                  <th scope="col">{{ app.text.value.skillUnlocks }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tier in skillTiers" :key="tier.key">
                  <td class="tier-points">{{ tier.points }}</td>
                  <td>{{ tier.name }}</td>
                </tr>
              </tbody>
            </table>
          </InfoPopover>
        </dd>
        <template v-if="node.monster.traits.length > 0">
          <dt>{{ app.text.value.traits }}</dt>
          <dd>
            <!-- Every trait is listed, whatever the size shown; one the monster lacks in that size is dimmed. -->
            <ul class="traits">
              <li
                v-for="trait in node.monster.traits"
                :key="`${trait.traitId} ${trait.level ?? ''} ${trait.size ?? ''}`"
                class="trait"
                :class="{ absent: trait.size !== undefined && trait.size !== shownSize }"
              >
                <span v-if="trait.level" class="trait-level">{{ formatText(app.text.value.traitLevel, { level: trait.level }) }}</span>
                <InfoPopover :label="app.entityName('traits', trait.traitId)">{{ app.entityName("traitDescriptions", trait.traitId) }}</InfoPopover>
                <span v-if="trait.size" class="trait-size" :title="formatText(app.text.value.traitSizeOnly, { size: trait.size })">
                  <span aria-hidden="true">{{ trait.size }}</span><span class="visually-hidden">{{ formatText(app.text.value.traitSizeOnly, { size: trait.size }) }}</span>
                </span>
              </li>
            </ul>
          </dd>
        </template>
      </dl>
      <div ref="tabList" class="tabs" role="tablist" :aria-label="app.text.value.detailTabs" @keydown="onTabKeydown">
        <button
          v-for="tab in tabs"
          :id="`${tabsId}-${tab.id}`"
          :key="tab.id"
          type="button"
          role="tab"
          class="tab"
          :class="{ active: app.state.detailTab === tab.id }"
          :aria-selected="app.state.detailTab === tab.id"
          :aria-controls="`${tabsId}-panel`"
          :tabindex="app.state.detailTab === tab.id ? 0 : -1"
          @click="app.setDetailTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>
      <!-- One panel, filled by the open tab. Focusable, since the stats and resistances have nothing to tab to. -->
      <div :id="`${tabsId}-panel`" class="tab-panel" role="tabpanel" :aria-labelledby="`${tabsId}-${app.state.detailTab}`" tabindex="0">
        <MonsterStatsTab v-if="app.state.detailTab === 'stats'" :monster="node.monster" />
        <MonsterResistancesTab v-else-if="app.state.detailTab === 'resistances'" :monster="node.monster" />
        <ObtainmentOptions v-else />
      </div>
    </template>
    <p v-else class="placeholder">{{ app.text.value.noSelection }}</p>
  </section>
</template>

<style scoped>
.detail-panel {
  padding: 1rem;
}
.detail-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}
.detail-portrait {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.detail-heading {
  flex: 1;
  min-width: 0;
}
.detail-name {
  margin: 0;
  font-size: 1.15rem;
  overflow-wrap: break-word;
}
.detail-number {
  margin: 0.2rem 0 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}
.view-button {
  padding: 0.35rem 1.1rem;
  border: 1px solid var(--accent);
  border-radius: 0.5rem;
  background: var(--accent);
  color: var(--surface);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.35rem 1rem;
  margin: 1rem 0 0;
}
.facts dt {
  color: var(--text-muted);
}
.facts dd {
  margin: 0;
}
.traits {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
/* Positioned so the hidden size text stays within the scrolling panel. */
.trait {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem;
}
/* Only the trait itself is dimmed: its open details stay fully readable. */
.trait.absent > :deep(:not(.info-popover)) {
  opacity: 0.55;
}
.trait-level {
  color: var(--text-muted);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
.trait-size {
  padding: 0 0.35rem;
  border-radius: 0.25rem;
  background: var(--info-soft);
  color: var(--info);
  font-size: 0.75rem;
  font-weight: 700;
}
/* Read by screen readers only: the tag itself just shows the size. */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.size-switch {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 0.4rem;
  overflow: hidden;
}
.size-button {
  min-width: 2.25rem;
  padding: 0.1rem 0.6rem;
  border: 0;
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.size-button + .size-button {
  border-left: 1px solid var(--border);
}
.size-button[aria-pressed="true"] {
  background: var(--accent);
  color: var(--surface);
}
.size-button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -3px;
}
.tiers {
  border-collapse: collapse;
}
.tiers th {
  padding: 0 0 0.3rem;
  color: var(--text-muted);
  font-weight: 600;
  text-align: left;
}
.tiers td {
  padding: 0.15rem 0;
}
.tiers th:first-child,
.tiers .tier-points {
  padding-right: 0.9rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.tabs {
  display: flex;
  margin-top: 1rem;
  border-bottom: 1px solid var(--border);
}
/* Equal widths whatever the label: the detail panel is wide enough for the longest one. */
.tab {
  flex: 1 1 0;
  min-width: 0;
  margin-bottom: -1px;
  padding: 0.45rem 0.1rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--text-muted);
  /* Shrinks on narrow phones, where a third of the sheet is less than the longest label. */
  font-size: clamp(0.8rem, 3.8vw, 1rem);
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.tab.active {
  border-bottom-color: var(--accent);
  color: var(--text);
}
.tab-panel:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
  border-radius: 0.25rem;
}
.placeholder {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.9rem;
}
</style>
