import { computed, inject, type InjectionKey, provide, reactive, readonly, ref, shallowRef, watch } from "vue"

import { loadGame, type UpcomingGameId } from "../data"
import type { GameData, GameId } from "../domain/game"
import {
  ancestry,
  descendants,
  indexNodes,
  isNormalPair,
  MAX_CHILD_DEPTH,
  MAX_PARENT_DEPTH,
  type NodeChoice,
  parentNodeId,
  ROOT_ID,
  type TreeChoices,
  type TreeSources,
} from "../services/graph/focusTree"
import { decodeTree, encodeTree } from "../services/graph/treeCode"
import { appText, type GameNames, type Language, LANGUAGES, loadGameNames } from "../i18n"
import { statMaxima } from "../services/stats"
import { createSynthesisEngine, type SynthesisEngine } from "../services/synthesis"

/** The synthesis tree being explored: its root, the user's choice per node and the node whose sheet is open. */
export interface TreeState {
  rootId: string
  choices: TreeChoices
  selectedId: string
}

export type DetailTab = "obtainment" | "stats" | "resistances"

export interface AppState {
  gameId: GameId
  language: Language
  /** Null while the atlas is shown. */
  tree: TreeState | null
  showParents: boolean
  showChildren: boolean
  /** Levels of ancestors / descendants shown around the focused monster. */
  parentDepth: number
  childDepth: number
  leftPanelOpen: boolean
  /** Kept from one sheet to the next, so several monsters can be compared on the same tab. */
  detailTab: DetailTab
}

const engines = new WeakMap<GameData, SynthesisEngine>()

function engineFor(game: GameData): SynthesisEngine {
  let engine = engines.get(game)
  if (!engine) {
    engine = createSynthesisEngine(game)
    engines.set(game, engine)
    const engineToPrepare = engine
    // The reverse index takes ~0.3 s on desktop and ~1 s on slow phones: build it while the page is idle.
    const whenIdle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 200))
    whenIdle(() => engineToPrepare.prepareIndex())
  }
  return engine
}

export function createAppContext(initial: Pick<AppState, "gameId" | "language" | "leftPanelOpen">) {
  const state = reactive<AppState>({
    ...initial,
    tree: null,
    showParents: true,
    showChildren: true,
    parentDepth: 1,
    childDepth: 1,
    detailTab: "obtainment",
  })

  const game = shallowRef<GameData | null>(null)
  const names = shallowRef<GameNames | null>(null)
  const status = ref<"loading" | "ready" | "error">("loading")

  watch(
    () => [state.gameId, state.language] as const,
    async ([gameId, language], _previous, onCleanup) => {
      let cancelled = false
      onCleanup(() => (cancelled = true))
      if (game.value?.id !== gameId) status.value = "loading"
      try {
        const [data, gameNames] = await Promise.all([game.value?.id === gameId ? game.value : loadGame(gameId), loadGameNames(gameId, language)])
        if (cancelled) return
        game.value = data
        names.value = gameNames
        status.value = "ready"
      } catch (error) {
        if (cancelled) return
        console.error(error)
        status.value = "error"
      }
    },
    { immediate: true },
  )

  // Monster names in every language, so search finds a monster whatever the interface language.
  const searchNames = shallowRef<GameNames[]>([])
  watch(
    () => state.gameId,
    async (gameId, _previous, onCleanup) => {
      let cancelled = false
      onCleanup(() => (cancelled = true))
      try {
        const all = await Promise.all(LANGUAGES.map((language) => loadGameNames(gameId, language)))
        if (!cancelled) searchNames.value = all
      } catch (error) {
        console.error(error)
      }
    },
    { immediate: true },
  )

  const text = computed(() => appText(state.language).ui)
  const engine = computed(() => (game.value ? engineFor(game.value) : null))
  const monsters = computed(() => new Map((game.value?.monsters ?? []).map((monster) => [monster.id, monster])))
  const sources = computed<TreeSources | null>(() => {
    if (!game.value || !engine.value) return null
    return {
      engine: engine.value,
      monsters: monsters.value,
      recipes: new Map(game.value.recipes.map((recipe) => [recipe.id, recipe])),
    }
  })
  const maxima = computed(() => (game.value ? statMaxima(game.value.monsters) : null))
  const treeRoot = computed(() => (state.tree && sources.value ? (sources.value.monsters.get(state.tree.rootId) ?? null) : null))
  const ancestryTree = computed(() => {
    const tree = state.tree
    if (!tree || !sources.value) return null
    return ancestry(sources.value, tree.rootId, tree.choices, state.showParents ? state.parentDepth : 0)
  })
  const descendantTree = computed(() => {
    const tree = state.tree
    if (!tree || !sources.value || !state.showChildren) return []
    return descendants(sources.value, tree.rootId, state.childDepth)
  })
  const treeNodes = computed(() => indexNodes(ancestryTree.value, descendantTree.value))

  /** The monster occurrence whose sheet is open; falls back to the root when its node left the graph. */
  const selectedNode = computed(() => {
    const tree = state.tree
    const found = tree ? (treeNodes.value.get(tree.selectedId) ?? treeNodes.value.get(ROOT_ID)) : undefined
    const item = found?.node.item
    const monster = item?.type === "monster" ? sources.value?.monsters.get(item.monsterId) : undefined
    if (!found || !monster || !sources.value) return null
    const relativeItem = found.relative?.item
    const choice = found.node.choice ?? null
    return {
      id: found.node.id,
      monster,
      side: found.side,
      relativeMonsterId: relativeItem?.type === "monster" ? relativeItem.monsterId : null,
      /** Descendants only show how they are obtained: their choice would not change the tree. */
      editable: found.side !== "child",
      choice: found.side === "child" ? null : choice,
      truncated: found.node.truncated ?? false,
      obtainMethods: sources.value.engine.obtainMethods(monster.id),
    }
  })

  function setChoice(nodeId: string, choice: NodeChoice) {
    if (!state.tree) return
    state.tree.choices = { ...state.tree.choices, [nodeId]: choice }
  }

  /** Picking a parent drops the other one when the two no longer form a valid pair. */
  function setNormalParent(nodeId: string, index: 0 | 1, monsterId: string | null) {
    const node = treeNodes.value.get(nodeId)?.node
    const item = node?.item
    if (!sources.value || item?.type !== "monster" || node?.choice?.type !== "normal") return
    const next: [string | null, string | null] = [...node.choice.parents]
    next[index] = monsterId
    const other = next[1 - index]
    if (monsterId && other && !isNormalPair(sources.value, item.monsterId, monsterId, other)) next[1 - index] = null
    setChoice(nodeId, { type: "normal", parents: next })
  }

  return {
    state: readonly(state),
    text,
    game,
    /** The monsters of the game by id. */
    monsters,
    status,
    engine,
    statMaxima: maxima,
    treeRoot,
    ancestryTree,
    descendantTree,
    treeNodes,
    selectedNode,
    searchKeys: (monsterId: string) => searchNames.value.map((names) => names.monsters?.[monsterId]).filter((name): name is string => !!name),
    gameName: (gameId: GameId | UpcomingGameId) => appText(state.language).games[gameId],
    entityName: (section: string, id: string) => names.value?.[section]?.[id] ?? id,

    setGame(gameId: GameId) {
      if (state.gameId === gameId) return
      state.gameId = gameId
      state.tree = null
    },
    setLanguage(language: Language) {
      state.language = language
    },
    /** Opens a new synthesis tree rooted on the monster, or goes back to the atlas with null. */
    openTree(monsterId: string | null) {
      if (state.tree?.rootId === monsterId && state.tree.selectedId === ROOT_ID) return
      state.tree = monsterId ? { rootId: monsterId, choices: {}, selectedId: ROOT_ID } : null
    },
    /** Drops every choice of the open tree, back to the default obtainment of each monster. */
    resetTree() {
      if (state.tree) state.tree = { rootId: state.tree.rootId, choices: {}, selectedId: ROOT_ID }
    },
    selectNode(nodeId: string) {
      if (state.tree) state.tree.selectedId = nodeId
    },
    setChoice,
    /**
     * Picks the monster of a parent slot (a generic recipe parent or a normal-synthesis parent), or empties the slot
     * with null. The picked monster's sheet opens; emptying a slot whose branch held the open sheet opens its owner's.
     * Returns the id of the node now standing in the slot.
     */
    pickParent(slotNodeId: string, monsterId: string | null): string | null {
      const slot = treeNodes.value.get(slotNodeId)?.node.slot
      const owner = slot && treeNodes.value.get(slot.ownerId)?.node
      const choice = owner?.choice
      if (!state.tree || !slot || !choice) return null
      if (monsterId !== null && !slot.options.includes(monsterId)) return null
      if (choice.type === "normal" && (slot.index === 0 || slot.index === 1)) {
        setNormalParent(slot.ownerId, slot.index, monsterId)
      } else if (choice.type === "recipe") {
        const picks = { ...choice.picks }
        if (monsterId === null) delete picks[slot.index]
        else picks[slot.index] = monsterId
        setChoice(slot.ownerId, { type: "recipe", recipeId: choice.recipeId, picks })
      } else return null
      if (monsterId !== null) {
        state.tree.selectedId = parentNodeId(slot.ownerId, slot.index, monsterId)
        return state.tree.selectedId
      }
      const selectedId = state.tree.selectedId
      if (selectedId === slotNodeId || selectedId.startsWith(`${slotNodeId}/`)) state.tree.selectedId = slot.ownerId
      return null
    },
    /** The shareable code of the tree as displayed (see `treeCode.ts`), or null when it cannot be produced. */
    async exportTree(): Promise<string | null> {
      if (!ancestryTree.value) return null
      try {
        return await encodeTree(state.gameId, ancestryTree.value, state.showParents ? state.parentDepth : 0)
      } catch (error) {
        console.error(error)
        return null
      }
    },
    /** Opens the tree of a shared code, with the parent depth it was exported at. */
    async importTree(code: string): Promise<"ok" | "invalid" | "otherGame" | "mismatch"> {
      if (!sources.value) return "invalid"
      const decoded = await decodeTree(code, sources.value, state.gameId)
      if (!decoded.ok) return decoded.error
      state.tree = { rootId: decoded.rootId, choices: decoded.choices, selectedId: ROOT_ID }
      state.showParents = decoded.depth > 0
      if (decoded.depth > 0) state.parentDepth = decoded.depth
      return "ok"
    },
    setShowParents(show: boolean) {
      state.showParents = show
    },
    setShowChildren(show: boolean) {
      state.showChildren = show
    },
    setParentDepth(depth: number) {
      state.parentDepth = Math.min(MAX_PARENT_DEPTH, Math.max(1, depth))
    },
    setChildDepth(depth: number) {
      state.childDepth = Math.min(MAX_CHILD_DEPTH, Math.max(1, depth))
    },
    setDetailTab(tab: DetailTab) {
      state.detailTab = tab
    },
    setLeftPanelOpen(open: boolean) {
      state.leftPanelOpen = open
    },
  }
}

export type AppContext = ReturnType<typeof createAppContext>

const appContextKey: InjectionKey<AppContext> = Symbol("appContext")

export function provideAppContext(context: AppContext): void {
  provide(appContextKey, context)
}

export function useAppContext(): AppContext {
  const context = inject(appContextKey)
  if (!context) throw new Error("useAppContext() called outside of the app")
  return context
}
