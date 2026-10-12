<script setup lang="ts">
import { computed } from "vue"

import { useAppContext } from "../../app/context"
import { FAMILY_ICON_CROP, familyIconUrl } from "../../services/assets"

/** `scale` is an integer so the pixel art stays crisp. */
const props = withDefaults(defineProps<{ familyId: string; scale?: number }>(), { scale: 1 })

const app = useAppContext()
const family = computed(() => app.game.value?.families.find((candidate) => candidate.id === props.familyId))

// Only the drawn area of the icon is shown, enlarged.
const frame = computed(() => ({ width: `${FAMILY_ICON_CROP.width * props.scale}px`, height: `${FAMILY_ICON_CROP.height * props.scale}px` }))
const image = computed(() => ({
  width: `${48 * props.scale}px`,
  height: `${49 * props.scale}px`,
  left: `${-FAMILY_ICON_CROP.x * props.scale}px`,
  top: `${-FAMILY_ICON_CROP.y * props.scale}px`,
}))
</script>

<!-- Decorative: the family name is always written next to it. -->
<template>
  <span v-if="family" class="family-icon" :style="frame" aria-hidden="true">
    <img :src="familyIconUrl(app.state.gameId, family.iconAssetKey)" alt="" :style="image" draggable="false" />
  </span>
</template>

<style scoped>
.family-icon {
  position: relative;
  display: inline-block;
  flex: none;
  overflow: hidden;
}
.family-icon img {
  position: absolute;
  max-width: none;
  image-rendering: pixelated;
}
</style>
