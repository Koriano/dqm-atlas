<script setup lang="ts">
import { computed } from "vue"

import { useAppContext } from "../../app/context"
import type { Monster } from "../../domain/monster"
import { EQUIPMENT_ICON_SIZE, equipmentIconUrl } from "../../services/assets"
import { sheetStats, STAT_KEYS } from "../../services/stats"

const props = defineProps<{ monster: Monster }>()

const app = useAppContext()

/** In the game's catalog order, so the types line up from one monster to the next. */
const equipment = computed(() => {
  const carried = props.monster.equipment
  return carried ? (app.game.value?.equipmentTypes ?? []).filter((type) => carried.includes(type.id)) : null
})

const stats = computed(() => {
  const game = app.game.value
  const values = game ? sheetStats(props.monster, game, app.sheetSizeOf(props.monster)) : props.monster.maxStats
  return STAT_KEYS.map((key) => {
    const value = values[key]
    const max = app.statMaxima.value?.[key] ?? 0
    return { key, value, ratio: max > 0 ? value / max : 0 }
  })
})
</script>

<template>
  <div>
    <section v-if="equipment" class="block">
      <h3 class="section-title">{{ app.text.value.equipment }}</h3>
      <ul class="equipment">
        <li v-for="type in equipment" :key="type.id" class="equipment-type">
          <img
            class="equipment-icon"
            :src="equipmentIconUrl(app.state.gameId, type.iconAssetKey)"
            :width="EQUIPMENT_ICON_SIZE.width * 2"
            :height="EQUIPMENT_ICON_SIZE.height * 2"
            alt=""
            draggable="false"
          />
          {{ app.entityName("equipmentTypes", type.id) }}
        </li>
      </ul>
    </section>
    <section class="block">
      <h3 class="section-title">{{ app.text.value.maxStats }}</h3>
      <dl class="stats">
        <div v-for="stat in stats" :key="stat.key" class="stat">
          <dt>{{ app.text.value.stats[stat.key] }}</dt>
          <dd>{{ stat.value }}</dd>
          <span class="gauge" aria-hidden="true"><span class="gauge-fill" :style="{ width: `${stat.ratio * 100}%` }" /></span>
        </div>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.block {
  margin-top: 1.25rem;
}
.section-title {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
}
.equipment {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.equipment-icon {
  flex: none;
  image-rendering: pixelated;
}
.equipment-type {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
  font-size: 0.85rem;
}
.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem 1rem;
  margin: 0;
}
.stat {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.25rem 0.5rem;
  font-size: 0.9rem;
}
.stat dt {
  color: var(--text-muted);
}
.stat dd {
  margin: 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.gauge {
  grid-column: 1 / -1;
  height: 0.35rem;
  border-radius: 0.2rem;
  background: var(--border);
  overflow: hidden;
}
.gauge-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
}
</style>
