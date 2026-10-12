<script setup lang="ts">
import { computed } from "vue"

import { useAppContext } from "../../app/context"
import { GAME_IDS, UPCOMING_GAME_IDS } from "../../data"
import type { GameId } from "../../domain/game"
import { type Language, LANGUAGES } from "../../i18n"
import MonsterCombobox from "../common/MonsterCombobox.vue"
import AboutButton from "./AboutButton.vue"
import ChangelogButton from "./ChangelogButton.vue"

const app = useAppContext()
/** Languages by their own name ("English", "Français"), in alphabetical order. */
const languages = computed(() => {
  const names = app.text.value.languages
  return [...LANGUAGES].sort((a, b) => names[a].localeCompare(names[b]))
})
const allMonsterIds = computed(() => (app.game.value?.monsters ?? []).map((monster) => monster.id))
</script>

<template>
  <header class="app-header">
    <!-- The game on the left, the search in the middle, the app's own controls on the right. -->
    <div class="header-side">
      <h1 class="app-title">{{ app.text.value.appTitle }}</h1>
      <label class="control game-control">
        <span class="control-label">{{ app.text.value.game }}</span>
        <select :value="app.state.gameId" @change="app.setGame(($event.target as HTMLSelectElement).value as GameId)">
          <option v-for="gameId in GAME_IDS" :key="gameId" :value="gameId">{{ app.gameName(gameId) }}</option>
          <optgroup :label="app.text.value.upcomingGames">
            <option v-for="gameId in UPCOMING_GAME_IDS" :key="gameId" disabled>{{ app.gameName(gameId) }}</option>
          </optgroup>
        </select>
      </label>
    </div>
    <MonsterCombobox
      class="search"
      :monster-ids="allMonsterIds"
      :model-value="null"
      :label="app.text.value.searchMonster"
      :placeholder="app.text.value.searchPlaceholder"
      reset-on-select
      @update:model-value="$event && app.openTree($event)"
    />
    <div class="header-side header-end">
      <!-- Wrappers: these components have two roots (button and teleported dialog), so they take no class. -->
      <div class="changelog-control"><ChangelogButton /></div>
      <label class="control language-control">
        <select
          :value="app.state.language"
          :aria-label="app.text.value.language"
          @change="app.setLanguage(($event.target as HTMLSelectElement).value as Language)"
        >
          <option v-for="language in languages" :key="language" :value="language">{{ app.text.value.languages[language] }}</option>
        </select>
      </label>
      <div class="about-control"><AboutButton /></div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: grid;
  /* Equal sides keep the search centred; on a narrow window they keep their content and the search shrinks. */
  grid-template-columns: minmax(max-content, 1fr) minmax(10rem, 20rem) minmax(max-content, 1fr);
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.header-side {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.header-end {
  justify-content: flex-end;
}
.app-title {
  margin: 0;
  font-size: 1.1rem;
  white-space: nowrap;
}
.control {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  min-width: 0;
}
.control select {
  min-width: 0;
}
.game-control {
  padding-left: 1rem;
  border-left: 1px solid var(--border);
}
.game-control select {
  max-width: 16rem;
}
.search {
  width: 100%;
}
/* Narrow screen: the sides dissolve, their controls wrap as direct items of the header. */
.app-shell:not(.wide) .app-header {
  display: flex;
  flex-wrap: wrap;
}
.app-shell:not(.wide) .header-side {
  display: contents;
}
.app-shell:not(.wide) .language-control {
  margin-left: auto;
}
/* Second row: too wide for the first one, the search leaves the rest of its row to the app's buttons. */
.app-shell:not(.wide) .search {
  order: 1;
  flex: 1 0 60%;
  width: auto;
  margin-left: 0;
}
.app-shell:not(.wide) .changelog-control {
  order: 2;
}
.app-shell:not(.wide) .about-control {
  order: 3;
}
@media (max-width: 600px) {
  .app-header {
    gap: 0.6rem;
    padding: 0.85rem 0.75rem;
  }
  .game-control {
    padding-left: 0.6rem;
    flex: 1;
  }
  .game-control select {
    max-width: 100%;
    width: 100%;
  }
  .control-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
}
</style>
