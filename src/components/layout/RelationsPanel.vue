<script setup lang="ts">
import { useAppContext } from "../../app/context"
import { MAX_CHILD_DEPTH, MAX_PARENT_DEPTH } from "../../services/graph/focusTree"
import PanelToggleIcon from "../common/PanelToggleIcon.vue"

const emit = defineEmits<{ close: [] }>()

const app = useAppContext()
const levels = (max: number) => Array.from({ length: max }, (_, index) => index + 1)
</script>

<template>
  <section class="relations-panel" :aria-label="app.text.value.relations">
    <header class="panel-header">
      <h2 class="panel-title">{{ app.text.value.relations }}</h2>
      <button
        type="button"
        class="icon-button"
        aria-expanded="true"
        aria-controls="relations-panel"
        :aria-label="app.text.value.closeRelations"
        :title="app.text.value.closeRelations"
        @click="emit('close')"
      >
        <PanelToggleIcon direction="close" />
      </button>
    </header>
    <label class="toggle">
      <input type="checkbox" :checked="app.state.showParents" @change="app.setShowParents(($event.target as HTMLInputElement).checked)" />
      {{ app.text.value.showParents }}
    </label>
    <label class="depth">
      {{ app.text.value.parentDepth }}
      <select :value="app.state.parentDepth" :disabled="!app.state.showParents" @change="app.setParentDepth(Number(($event.target as HTMLSelectElement).value))">
        <option v-for="level in levels(MAX_PARENT_DEPTH)" :key="level" :value="level">{{ level }}</option>
      </select>
    </label>
    <label class="toggle">
      <input type="checkbox" :checked="app.state.showChildren" @change="app.setShowChildren(($event.target as HTMLInputElement).checked)" />
      {{ app.text.value.showChildren }}
    </label>
    <label class="depth">
      {{ app.text.value.childDepth }}
      <select :value="app.state.childDepth" :disabled="!app.state.showChildren" @change="app.setChildDepth(Number(($event.target as HTMLSelectElement).value))">
        <option v-for="level in levels(MAX_CHILD_DEPTH)" :key="level" :value="level">{{ level }}</option>
      </select>
    </label>
  </section>
</template>

<style scoped>
.relations-panel {
  padding: 0.75rem 1rem 1rem;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.panel-title {
  margin: 0;
  font-size: 1rem;
}
.toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0;
  font-size: 0.9rem;
  cursor: pointer;
}
.depth {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.15rem 0 0.5rem 1.6rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}
</style>
