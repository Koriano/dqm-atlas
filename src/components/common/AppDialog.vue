<script setup lang="ts">
import { ref, useId } from "vue"

import { useAppContext } from "../../app/context"

/** A modal dialog with its title, its content and a row of actions (a close button by default). */
const props = defineProps<{
  title: string
  /** Widest the dialog gets; it always leaves a margin around it on a narrow screen. */
  maxWidth: string
}>()

const app = useAppContext()
const dialog = ref<HTMLDialogElement>()
const titleId = useId()
const width = `min(${props.maxWidth}, calc(100% - 1.5rem))`

function onBackdropClick(event: MouseEvent) {
  if (event.target === dialog.value) dialog.value?.close()
}

defineExpose({
  showModal: () => dialog.value?.showModal(),
  close: () => dialog.value?.close(),
})
</script>

<template>
  <Teleport to="body">
    <!-- Escape closes the dialog only: it must not reach the shell, which would close the tree on mobile. -->
    <dialog ref="dialog" class="dialog" :aria-labelledby="titleId" @click="onBackdropClick" @keydown.stop>
      <h2 :id="titleId" class="dialog-title">{{ title }}</h2>
      <slot />
      <div class="dialog-actions">
        <slot name="actions">
          <button type="button" class="text-button" @click="dialog?.close()">{{ app.text.value.close }}</button>
        </slot>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.dialog {
  width: v-bind(width);
  max-height: min(40rem, calc(100% - 1.5rem));
  box-sizing: border-box;
  padding: 1rem;
  border: 0;
  border-radius: 0.75rem;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow);
}
/* Only the content scrolls: the title and the actions stay in view. */
.dialog[open] {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow: hidden;
}
.dialog::backdrop {
  background: rgb(0 0 0 / 0.4);
}
.dialog-title {
  margin: 0;
  font-size: 1.05rem;
}
.dialog-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
