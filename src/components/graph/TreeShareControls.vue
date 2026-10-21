<script setup lang="ts">
import { ControlButton } from "@vue-flow/controls"
import { computed, ref } from "vue"

import { useAppContext } from "../../app/context"
import AppDialog from "../common/AppDialog.vue"

/** Tree buttons for the canvas controls: reset to the defaults, export / import with their dialog. */
const app = useAppContext()
const hasChoices = computed(() => Object.keys(app.state.tree?.choices ?? {}).length > 0)
const dialog = ref<InstanceType<typeof AppDialog>>()
const field = ref<HTMLTextAreaElement>()
const mode = ref<"export" | "import">("export")
const code = ref("")
const error = ref<string | null>(null)
const copied = ref(false)

function show(next: "export" | "import") {
  mode.value = next
  code.value = ""
  error.value = null
  copied.value = false
  dialog.value?.showModal()
}

async function openExport() {
  show("export")
  const exported = await app.exportTree()
  if (exported) code.value = exported
  else error.value = app.text.value.exportError
}

async function copy() {
  field.value?.select()
  try {
    await navigator.clipboard.writeText(code.value)
    copied.value = true
  } catch {
    // Clipboard access refused: the code stays selected, ready to be copied by hand.
  }
}

async function submit() {
  const text = app.text.value
  const result = await app.importTree(code.value)
  if (result === "ok") dialog.value?.close()
  else error.value = { invalid: text.importInvalid, otherGame: text.importOtherGame, mismatch: text.importMismatch }[result]
}
</script>

<template>
  <ControlButton v-if="app.treeRoot.value" :title="app.text.value.resetTree" :aria-label="app.text.value.resetTree" :disabled="!hasChoices" @click="app.resetTree()">
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8a5 5 0 1 0 1.6-3.7M3 2.5v2.8h2.8" /></svg>
  </ControlButton>
  <ControlButton v-if="app.treeRoot.value" :title="app.text.value.exportTree" :aria-label="app.text.value.exportTree" @click="openExport">
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 10.5V2M4.5 5.5 8 2l3.5 3.5M2 10.5V14h12v-3.5" /></svg>
  </ControlButton>
  <ControlButton :title="app.text.value.importTree" :aria-label="app.text.value.importTree" @click="show('import')">
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8.5M4.5 7 8 10.5 11.5 7M2 10.5V14h12v-3.5" /></svg>
  </ControlButton>
  <AppDialog ref="dialog" :title="mode === 'export' ? app.text.value.exportTree : app.text.value.importTree" max-width="26rem">
    <div class="share-form">
      <p class="share-hint">{{ mode === "export" ? app.text.value.exportHint : app.text.value.importHint }}</p>
      <textarea
        ref="field"
        v-model="code"
        class="share-code"
        :class="{ invalid: error }"
        rows="5"
        spellcheck="false"
        autocomplete="off"
        :readonly="mode === 'export'"
        :aria-label="app.text.value.treeCode"
        :aria-invalid="error !== null"
        aria-describedby="share-error"
        @focus="mode === 'export' && field?.select()"
        @input="error = null"
      />
      <p v-if="error" id="share-error" class="share-error" role="alert">
        <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M8 4.5v4M8 11.2v.1" /></svg>
        {{ error }}
      </p>
    </div>
    <template #actions>
      <span v-if="copied" class="share-copied" role="status">{{ app.text.value.copied }}</span>
      <button type="button" class="text-button" @click="dialog?.close()">{{ app.text.value.close }}</button>
      <button v-if="mode === 'export'" type="button" class="text-button primary" :disabled="!code" @click="copy">{{ app.text.value.copy }}</button>
      <button v-else type="button" class="text-button primary" :disabled="!code.trim()" @click="submit">{{ app.text.value.import }}</button>
    </template>
  </AppDialog>
</template>

<style scoped>
/* The control buttons keep Vue Flow's light background in both themes: same black as its own icons. */
.vue-flow__controls-button svg {
  stroke: #000;
}
.vue-flow__controls-button:disabled svg {
  stroke-opacity: 0.4;
}
svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.share-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.share-hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.9rem;
}
.share-code {
  box-sizing: border-box;
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--canvas);
  color: var(--text);
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
  overflow-wrap: anywhere;
  resize: vertical;
}
.share-code.invalid {
  border-color: var(--danger);
  outline: 1px solid var(--danger);
}
.share-error {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  margin: -0.25rem 0 0;
  color: var(--danger);
  font-size: 0.85rem;
}
.share-error svg {
  flex: none;
  width: 1rem;
  height: 1rem;
  margin-top: 0.05rem;
}
.share-copied {
  margin-right: auto;
  color: var(--success);
  font-size: 0.85rem;
  font-weight: 600;
}
.text-button.primary {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--surface);
  font-weight: 600;
}
.text-button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
