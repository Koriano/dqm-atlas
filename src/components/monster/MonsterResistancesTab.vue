<script setup lang="ts">
import { computed } from "vue"

import { useAppContext } from "../../app/context"
import type { Monster } from "../../domain/monster"
import { formatText } from "../../i18n"

const props = defineProps<{ monster: Monster }>()

const app = useAppContext()

/** Every category of the game's catalog, in its order; one without a stored value is a normal resistance. */
const resistances = computed(() =>
  (app.game.value?.resistanceCategories ?? []).map((category) => {
    const resistance = props.monster.resistances[category.id] ?? ("normal" as const)
    const levels = app.text.value.resistanceLevels
    return typeof resistance === "string"
      ? { id: category.id, level: resistance, label: levels[resistance] }
      : { id: category.id, level: resistance.level, label: formatText(levels.resistant, { percent: resistance.percent }) }
  }),
)
</script>

<template>
  <dl class="resistances">
    <div v-for="resistance in resistances" :key="resistance.id" class="resistance">
      <dt>{{ app.entityName("resistanceCategories", resistance.id) }}</dt>
      <dd :class="resistance.level">{{ resistance.label }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.resistances {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: 0 1.25rem;
  margin: 0.75rem 0 0;
}
.resistance {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.3rem 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.9rem;
}
.resistance dd {
  margin: 0;
  font-weight: 600;
}
.resistance dd.normal {
  color: var(--text-muted);
  font-weight: 400;
}
.resistance dd.weak {
  color: var(--danger);
}
.resistance dd.resistant,
.resistance dd.immune {
  color: var(--success);
}
.resistance dd.absorb,
.resistance dd.reflect {
  color: var(--info);
}
</style>
