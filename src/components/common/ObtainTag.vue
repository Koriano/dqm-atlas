<script setup lang="ts">
import { useAppContext } from "../../app/context"
import type { DirectChoice } from "../../services/graph/focusTree"

const props = defineProps<{ type: DirectChoice["type"] }>()

const app = useAppContext()
</script>

<!-- Green "recruitable" / amber "egg" / blue "event" tag: the tree node is obtained this way, without synthesis. -->
<template>
  <span class="obtain-tag" :class="type">{{ { scout: app.text.value.recruitable, egg: app.text.value.egg, event: app.text.value.event }[props.type] }}</span>
</template>

<style scoped>
.obtain-tag {
  display: inline-block;
  padding: 0.1em 0.5em;
  border: 1px solid color-mix(in srgb, var(--tag-color) 45%, transparent);
  border-radius: 999px;
  background: var(--tag-soft);
  color: var(--tag-color);
  font-size: 0.72em;
  font-weight: 700;
  line-height: 1.4;
  white-space: nowrap;
}
.scout {
  --tag-color: var(--success);
  --tag-soft: var(--success-soft);
}
.egg {
  --tag-color: var(--warning);
  --tag-soft: var(--warning-soft);
}
.event {
  --tag-color: var(--info);
  --tag-soft: var(--info-soft);
}
</style>
