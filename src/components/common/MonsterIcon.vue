<script setup lang="ts">
import { computed } from "vue"

import type { GameId } from "../../domain/game"
import type { Monster } from "../../domain/monster"
import { monsterIconSize, monsterIconUrl } from "../../services/assets"
import { setIconRendering } from "./iconRendering"

const props = withDefaults(defineProps<{ gameId: GameId; monster: Monster; alt: string; scale?: number }>(), { scale: 1 })

const size = computed(() => monsterIconSize(props.monster.size, props.scale))
</script>

<template>
  <img
    class="monster-icon"
    :src="monsterIconUrl(gameId, monster.iconAssetKey)"
    :alt="alt"
    :width="size.width"
    :height="size.height"
    draggable="false"
    @load="setIconRendering"
  />
</template>
