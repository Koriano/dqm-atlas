<script setup lang="ts">
import { computed } from "vue"

import { useAppContext } from "../../app/context"
import { FAMILY_ICON_HEIGHT, familyIconUrl } from "../../services/assets"

const props = withDefaults(defineProps<{ familyId: string; scale?: number }>(), { scale: 1 })

const app = useAppContext()
const family = computed(() => app.game.value?.families.find((candidate) => candidate.id === props.familyId))

// Only the drawn area of the icon is shown, brought to the same height in every game.
const factor = computed(() => {
  const frame = app.game.value?.familyIconFrame
  return frame ? (FAMILY_ICON_HEIGHT * props.scale) / frame.drawn.height : 0
})
const frame = computed(() => {
  const drawn = app.game.value?.familyIconFrame.drawn
  return drawn ? { width: `${drawn.width * factor.value}px`, height: `${drawn.height * factor.value}px` } : {}
})
const image = computed(() => {
  const frame = app.game.value?.familyIconFrame
  if (!frame) return {}
  return {
    width: `${frame.width * factor.value}px`,
    height: `${frame.height * factor.value}px`,
    left: `${-frame.drawn.x * factor.value}px`,
    top: `${-frame.drawn.y * factor.value}px`,
  }
})
// Pixel art stays crisp only when each pixel becomes a whole number of pixels; any other size is smoothed.
const pixelated = computed(() => Number.isInteger(factor.value) && factor.value >= 1)
</script>

<!-- Decorative: the family name is always written next to it. -->
<template>
  <span v-if="family" class="family-icon" :style="frame" aria-hidden="true">
    <img :src="familyIconUrl(app.state.gameId, family.iconAssetKey)" alt="" :class="{ pixelated }" :style="image" draggable="false" />
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
}
.family-icon img.pixelated {
  image-rendering: pixelated;
}
</style>
