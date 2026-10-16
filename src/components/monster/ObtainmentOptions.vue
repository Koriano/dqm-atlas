<script setup lang="ts">
import { computed } from "vue"

import { useAppContext } from "../../app/context"
import type { Monster } from "../../domain/monster"
import type { ParentCondition, SynthesisRecipe } from "../../domain/synthesis"
import { formatText } from "../../i18n"
import type { NodeChoice } from "../../services/graph/focusTree"
import { MONSTER_ICON_SLOT, monsterIconUrl } from "../../services/assets"
import FamilyIcon from "../common/FamilyIcon.vue"
import { setIconRendering } from "../common/iconRendering"
import {
  commonFamily,
  conditionDetail,
  conditionName,
  type NotePart,
  recipeConditionsText,
  type SeasonCell,
  seasonRows,
  situationLines,
} from "../common/labels"

const app = useAppContext()
const iconSlot = `${MONSTER_ICON_SLOT}px`

/** A recipe parent: a monster with its icon, or a generic condition drawn like the tree's parent slot. */
interface Parent {
  name: string
  note: string | null
  monster: Monster | null
  /** Family shared by every candidate of a generic condition; null shows a "?". */
  familyId: string | null
}

interface Option {
  key: string
  choice: NodeChoice
  /** Parents of a recipe, shown with their icons above the lines. */
  parents: Parent[]
  /** Main lines of the card, each with its muted notes, one per row. */
  lines: { text: string | null; notes: NotePart[][] }[]
  /** A game with seasons: when the monster appears, one row of seasons per story stage. */
  seasons?: { stage: string | null; cells: SeasonCell[] }[]
}

const textNote = (text: string): NotePart[] => [{ text }]

const node = computed(() => app.selectedNode.value)

/** One option per scouting location, each with its situations. */
const recruitment = computed<Option[]>(() =>
  (node.value?.monster.obtainments ?? []).flatMap((obtainment): Option[] => {
    if (obtainment.type !== "scout") return []
    const choice: NodeChoice = { type: "scout", locationId: obtainment.locationId }
    const text = app.entityName("locations", obtainment.locationId)
    const when = obtainment.when ?? []
    if ((app.game.value?.seasons.length ?? 0) > 0) {
      // Without a condition the monster is there all year: every season is shown, active.
      const seasons = seasonRows(app, when.length > 0 ? when : [{}], obtainment.locationId)
      return [{ key: `scout:${obtainment.locationId}`, choice, parents: [], lines: [{ text, notes: [] }], seasons }]
    }
    return [{ key: `scout:${obtainment.locationId}`, choice, parents: [], lines: [{ text, notes: situationLines(app, when) }] }]
  }),
)

/** One option per region where the monster hatches from an egg, with the egg colours and when it is found. */
const eggs = computed<Option[]>(() =>
  (node.value?.monster.obtainments ?? []).flatMap((obtainment): Option[] => {
    if (obtainment.type !== "egg") return []
    const colours = obtainment.eggColours.map((colour) => app.entityName("eggColours", colour)).join(", ")
    const notes = [textNote(colours), ...(obtainment.storyStage ? [textNote(app.entityName("storyStages", obtainment.storyStage))] : [])]
    const choice: NodeChoice = { type: "egg", locationId: obtainment.locationId }
    return [{ key: `egg:${obtainment.locationId}`, choice, parents: [], lines: [{ text: app.entityName("locations", obtainment.locationId), notes }] }]
  }),
)

/** One option per event. Event names already say what they are (e.g. "Battle reward (10)"): only a region lock is added. */
const events = computed<Option[]>(() => {
  const catalog = new Map((app.game.value?.events ?? []).map((event) => [event.id, event]))
  return (node.value?.monster.obtainments ?? []).flatMap((obtainment): Option[] => {
    if (obtainment.type !== "event") return []
    const regionId = catalog.get(obtainment.eventId)?.regionId
    const note = regionId ? formatText(app.text.value.regionOnly, { region: app.entityName("regions", regionId) }) : null
    const choice: NodeChoice = { type: "event", eventId: obtainment.eventId }
    return [{ key: `event:${obtainment.eventId}`, choice, parents: [], lines: [{ text: app.entityName("events", obtainment.eventId), notes: note ? [textNote(note)] : [] }] }]
  })
})

function parentOf(condition: ParentCondition): Parent {
  const name = conditionName(app, condition)
  const note = conditionDetail(app, condition)
  if (condition.type === "monster") return { name, note, monster: app.monsters.value.get(condition.monsterId) ?? null, familyId: null }
  if (condition.type === "family") return { name, note, monster: null, familyId: condition.familyId }
  return { name, note, monster: null, familyId: commonFamily(app, app.engine.value?.conditionCandidates(condition) ?? []) }
}

function recipeOption(recipe: SynthesisRecipe): Option {
  const note = recipeConditionsText(app, recipe)
  return {
    key: recipe.id,
    choice: { type: "recipe", recipeId: recipe.id },
    parents: recipe.parents.map(parentOf),
    lines: note ? [{ text: null, notes: [textNote(note)] }] : [],
  }
}

const syntheses = computed<Option[]>(() => {
  const methods = node.value?.obtainMethods
  if (!methods) return []
  const options = [...methods.fourWay, ...methods.special].map(recipeOption)
  if (methods.normal.length > 0) {
    const text = formatText(app.text.value.pairCount, { count: methods.normal.length })
    options.push({ key: "normal", choice: { type: "normal", parents: [null, null] }, parents: [], lines: [{ text, notes: [] }] })
  }
  return options
})

const sections = computed(() =>
  [
    { key: "scout", title: app.text.value.recruitment, options: recruitment.value },
    { key: "egg", title: app.text.value.eggs, options: eggs.value },
    { key: "synthesis", title: app.text.value.obtainMethods, options: syntheses.value },
    { key: "event", title: app.text.value.events, options: events.value },
  ].filter((section) => section.options.length > 0),
)

function typeLabel(choice: NodeChoice): string | null {
  if (choice.type === "recipe") return app.text.value.special
  if (choice.type === "normal") return app.text.value.normal
  return null
}

function isActive(choice: NodeChoice): boolean {
  const active = node.value?.choice
  if (!active || active.type !== choice.type) return false
  if (active.type === "recipe") return choice.type === "recipe" && active.recipeId === choice.recipeId
  if (active.type === "scout" || active.type === "egg") return choice.type === active.type && active.locationId === choice.locationId
  if (active.type === "event") return choice.type === "event" && active.eventId === choice.eventId
  return true
}

function choose(choice: NodeChoice) {
  // Re-selecting the active normal synthesis must keep the parents already picked.
  if (!node.value || isActive(choice)) return
  app.setChoice(node.value.id, choice)
}
</script>

<template>
  <div v-if="node">
    <p v-if="sections.length === 0" class="empty">{{ app.text.value.noObtainment }}</p>
    <section v-for="section in sections" :key="section.key" class="obtainments">
      <h3 class="section-title">{{ section.title }}</h3>
      <ul class="option-list">
        <li v-for="option in section.options" :key="option.key">
          <component
            :is="node.editable ? 'button' : 'div'"
            :type="node.editable ? 'button' : undefined"
            class="option"
            :class="{ editable: node.editable, active: node.editable && isActive(option.choice) }"
            :aria-pressed="node.editable ? isActive(option.choice) : undefined"
            @click="node.editable && choose(option.choice)"
          >
            <span v-if="typeLabel(option.choice)" class="option-type">{{ typeLabel(option.choice) }}</span>
            <span v-if="option.parents.length > 0" class="parents">
              <span v-for="(parent, index) in option.parents" :key="index" class="parent">
                <!-- Like the search results: only the top slot of a tall icon, at its native size. -->
                <span v-if="parent.monster" class="parent-icon" aria-hidden="true">
                  <img :src="monsterIconUrl(app.state.gameId, parent.monster.iconAssetKey)" alt="" draggable="false" @load="setIconRendering" />
                </span>
                <span v-else class="parent-icon slot" :class="{ unknown: !parent.familyId }" aria-hidden="true">
                  <FamilyIcon v-if="parent.familyId" :family-id="parent.familyId" />
                  <template v-else>?</template>
                </span>
                <span class="parent-text">
                  <span class="option-text">{{ parent.name }}</span>
                  <span v-if="parent.note" class="option-note">{{ parent.note }}</span>
                </span>
              </span>
            </span>
            <span v-for="(line, index) in option.lines" :key="index" class="option-line">
              <span v-if="line.text" class="option-text">{{ line.text }}</span>
              <span v-for="(note, noteIndex) in line.notes" :key="noteIndex" class="option-note">
                <template v-for="(part, partIndex) in note" :key="partIndex">
                  <img v-if="'icon' in part" class="situation-icon" :src="part.icon" :alt="part.label" :title="part.label" draggable="false" />
                  <template v-else>{{ partIndex > 0 ? " · " : "" }}{{ part.text }}{{ partIndex < note.length - 1 && "icon" in note[partIndex + 1]! ? " · " : "" }}</template>
                </template>
              </span>
            </span>
            <span v-for="(row, rowIndex) in option.seasons ?? []" :key="`seasons-${rowIndex}`" class="season-block">
              <span v-if="row.stage" class="option-note">{{ row.stage }}</span>
              <!-- One column per season: its icon, dimmed when the monster is absent, then the weathers it needs. -->
              <span class="season-row">
                <span v-for="(cell, cellIndex) in row.cells" :key="cellIndex" class="season-cell" :class="{ absent: !cell.available }">
                  <span class="visually-hidden">{{ cell.description }}</span>
                  <span class="season-icons" aria-hidden="true">
                    <img v-if="'icon' in cell.season" class="season-icon" :src="cell.season.icon" alt="" :title="cell.season.label" draggable="false" />
                    <span v-else class="season-name">{{ cell.season.text }}</span>
                    <span v-if="cell.weathers.length > 0" class="season-weathers">
                      <template v-for="(weather, weatherIndex) in cell.weathers" :key="weatherIndex">
                        <img v-if="'icon' in weather" class="weather-icon" :src="weather.icon" alt="" :title="weather.label" draggable="false" />
                        <span v-else class="season-name">{{ weather.text }}</span>
                      </template>
                    </span>
                  </span>
                </span>
              </span>
            </span>
          </component>
          <p v-if="node.truncated && isActive(option.choice)" class="depth-note">{{ app.text.value.depthLimit }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.obtainments {
  margin-top: 1.25rem;
}
.section-title {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
}
.empty {
  margin: 1.25rem 0 0;
  color: var(--text-muted);
  font-size: 0.9rem;
}
.option-list {
  display: grid;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.option {
  display: grid;
  gap: 0.3rem;
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
  color: inherit;
  font: inherit;
  text-align: left;
}
.option.editable {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.option.active {
  border-color: var(--accent);
  box-shadow: inset 3px 0 0 var(--accent);
}
.depth-note {
  margin: 0.3rem 0 0;
  color: var(--text-muted);
  font-size: 0.8rem;
}
.option-type {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
/* Two parents per row: a four-way synthesis takes two rows, and a narrow sheet falls back to one parent per row. */
.parents {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 0.4rem 0.6rem;
}
.parent {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
.parent-icon {
  flex: none;
  width: v-bind(iconSlot);
  height: v-bind(iconSlot);
  overflow: hidden;
}
.parent-icon img {
  display: block;
  width: v-bind(iconSlot);
}
/* Same look as the tree's parent slot: the family icon on its own, a dashed box when no family is known. */
.parent-icon.slot {
  display: grid;
  place-items: center;
  box-sizing: border-box;
}
/* Only as wide as the icon, so the family's name follows it closely. */
.parent-icon.slot:not(.unknown) {
  width: auto;
}
.parent-icon.slot.unknown {
  border: 1px dashed var(--text-muted);
  background: var(--surface);
  color: var(--text-muted);
  font-size: 1rem;
  font-weight: 600;
}
.parent-text {
  display: grid;
  gap: 0.1rem;
  min-width: 0;
  overflow-wrap: anywhere;
}
.option-line {
  display: grid;
  gap: 0.1rem;
}
.option-text {
  font-size: 0.9rem;
}
/* Seasons of a scout location: four equal columns, the season above the weathers it needs. */
.season-block {
  display: grid;
  gap: 0.2rem;
  margin-top: 0.35rem;
}
.season-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.25rem;
}
/* Holds its hidden description: without it, the description would follow the page instead of the scrolling panel. */
.season-cell {
  position: relative;
}
.season-icons {
  display: grid;
  justify-items: center;
  gap: 0.2rem;
}
.season-cell.absent .season-icons {
  opacity: 0.25;
}
.season-icon {
  width: 2rem;
  height: 2rem;
}
.season-weathers {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.15rem;
}
.weather-icon {
  width: 1.5rem;
  height: 1.5rem;
}
.season-name {
  color: var(--text-muted);
  font-size: 0.75rem;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
/* The game's own weather and season icons, at the height of the text. */
.situation-icon {
  width: 1.35em;
  height: 1.35em;
  margin-right: 0.15em;
  vertical-align: -0.35em;
}
.option-note {
  font-size: 0.8rem;
  color: var(--text-muted);
}
</style>
