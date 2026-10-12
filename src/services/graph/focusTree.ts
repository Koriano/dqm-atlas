import type { Monster } from "../../domain/monster"
import type { ParentCondition, SynthesisRecipe } from "../../domain/synthesis"
import type { SynthesisEngine } from "../synthesis"

/** Deepest levels offered in the focus graph (measured on DQMJ2: 187 ancestors / 70 descendants at worst). */
export const MAX_PARENT_DEPTH = 5
export const MAX_CHILD_DEPTH = 2

/** Id of the tree's root node; ancestors are `root/<index>:<key>/…`, descendants `child:<index>:<monsterId>/…`. */
export const ROOT_ID = "root"

/** How one monster occurrence of the tree is obtained. Scouting and events end the tree there. */
export type NodeChoice =
  | { type: "scout"; locationId: string }
  | { type: "event"; eventId: string }
  /** `picks`: the monster chosen for a generic parent (family, group) of the recipe, by parent index. */
  | { type: "recipe"; recipeId: string; picks?: Readonly<Record<number, string>> }
  | { type: "normal"; parents: readonly [string | null, string | null] }

/** Explicit choices of the user, keyed by node id: every occurrence of a monster has its own. */
export type TreeChoices = Readonly<Record<string, NodeChoice>>

/** What a node of the focus graph stands for, before labels and layout. */
export type RelationItem =
  /** `recipe` is the recipe linking this parent to the node below it (for its conditions). */
  | { type: "monster"; monsterId: string; recipe: SynthesisRecipe | null }
  | { type: "condition"; condition: ParentCondition; recipe: SynthesisRecipe }
  /** A normal-synthesis parent still to be picked, among `options`. */
  | { type: "parentToChoose"; options: string[] }
  /** Normal-synthesis results of the root: they stay abstract. */
  | { type: "normalChildren"; resultCount: number }

/** A parent the user picks among several monsters: a generic recipe parent or a normal-synthesis parent. */
export interface ParentSlot {
  /** The node this parent belongs to, whose choice stores the pick, and the parent's index in it. */
  ownerId: string
  index: number
  options: string[]
  /** The recipe parent the slot stands for; absent for a normal-synthesis parent. */
  condition?: ParentCondition
}

export interface RelationNode {
  /** Unique within the graph: the same monster can appear on several branches. */
  id: string
  item: RelationItem
  /** Root and ancestors only: how this occurrence is obtained (explicit or default), null when it cannot be at all. */
  choice?: NodeChoice | null
  /** Root and ancestors only: whether `choice` was picked by the user. */
  explicit?: boolean
  /** Root and ancestors only: the choice has parents, hidden because the node is at the depth limit. */
  truncated?: boolean
  /** Set on a parent still to pick (condition, parent to choose) and on the monster picked for it. */
  slot?: ParentSlot
  /** Parents (root and ancestry side) or children (descendant side) of this node. */
  branches: RelationNode[]
}

export interface TreeSources {
  engine: SynthesisEngine
  monsters: Map<string, Monster>
  recipes: Map<string, SynthesisRecipe>
}

const itemKey = (item: RelationItem) => (item.type === "monster" ? item.monsterId : item.type)

/** Id of the parent at `index` of the node `ownerId`; `key` is the monster id, or the item type while abstract. */
export const parentNodeId = (ownerId: string, index: number, key: string) => `${ownerId}/${index}:${key}`

interface ParentItem {
  item: RelationItem
  /** Set when the parent is picked by the user. */
  slot?: Pick<ParentSlot, "options" | "condition">
}

function recipeParentItems(sources: TreeSources, recipe: SynthesisRecipe, picks: Readonly<Record<number, string>>): ParentItem[] {
  return recipe.parents.map((condition, index): ParentItem => {
    if (condition.type === "monster") return { item: { type: "monster", monsterId: condition.monsterId, recipe } }
    const options = sources.engine.conditionCandidates(condition)
    const picked = picks[index]
    const slot = { options, condition }
    if (picked !== undefined && options.includes(picked)) return { item: { type: "monster", monsterId: picked, recipe }, slot }
    return { item: { type: "condition", condition, recipe }, slot }
  })
}

/** Candidates for each normal-synthesis parent of `monsterId`, restricted by the parent picked on the other side. */
export function normalParentOptions(sources: TreeSources, monsterId: string, parents: readonly [string | null, string | null]): [string[], string[]] {
  const pairs = sources.engine.obtainMethods(monsterId).normal
  const [first, second] = parents
  return [sources.engine.partnerOptions(pairs, second ?? undefined), sources.engine.partnerOptions(pairs, first ?? undefined)]
}

export function isNormalPair(sources: TreeSources, monsterId: string, a: string, b: string): boolean {
  return sources.engine.obtainMethods(monsterId).normal.some(({ parentIds: [x, y] }) => (x === a && y === b) || (x === b && y === a))
}

/** Whether the monster can be obtained that way at all (picked parents are not checked). */
export function isAvailable(sources: TreeSources, monster: Monster, choice: NodeChoice): boolean {
  switch (choice.type) {
    case "scout":
      return monster.obtainments.some((obtainment) => obtainment.type === "scout" && obtainment.locationId === choice.locationId)
    case "event":
      return monster.obtainments.some((obtainment) => obtainment.type === "event" && obtainment.eventId === choice.eventId)
    case "recipe":
      return sources.recipes.get(choice.recipeId)?.result === monster.id
    case "normal":
      return sources.engine.obtainMethods(monster.id).normal.length > 0
  }
}

function firstObtainment(monster: Monster, type: "scout" | "event"): NodeChoice | null {
  const found = monster.obtainments.find((obtainment) => obtainment.type === type)
  if (!found) return null
  return found.type === "scout" ? { type: "scout", locationId: found.locationId } : { type: "event", eventId: found.eventId }
}

/**
 * Same priority as the sheet — recruitment, then synthesis, then events — except for the root, which starts on its
 * representative synthesis since the tree is opened to see it. Scouting and events need no parents, so they end the
 * branch.
 */
function defaultChoice(sources: TreeSources, monster: Monster, isRoot: boolean): NodeChoice | null {
  const scout = firstObtainment(monster, "scout")
  const event = firstObtainment(monster, "event")
  const origin = sources.engine.representativeOrigin(monster.id)
  const synthesis: NodeChoice | null =
    origin?.type === "recipe" ? { type: "recipe", recipeId: origin.recipe.id } : origin?.type === "normal" ? { type: "normal", parents: [null, null] } : null
  return isRoot ? (synthesis ?? scout ?? event) : (scout ?? synthesis ?? event)
}

function parentItems(sources: TreeSources, monsterId: string, choice: NodeChoice | null): ParentItem[] {
  if (choice?.type === "recipe") {
    const recipe = sources.recipes.get(choice.recipeId)
    return recipe ? recipeParentItems(sources, recipe, choice.picks ?? {}) : []
  }
  if (choice?.type === "normal") {
    const options = normalParentOptions(sources, monsterId, choice.parents)
    return ([0, 1] as const).map((index): ParentItem => {
      const picked = choice.parents[index]
      // A picked parent can be changed for any other one: the other parent is dropped if the pair no longer works.
      if (picked) return { item: { type: "monster", monsterId: picked, recipe: null }, slot: { options: normalParentOptions(sources, monsterId, [null, null])[index] } }
      return { item: { type: "parentToChoose", options: options[index] }, slot: { options: options[index] } }
    })
  }
  return []
}

/**
 * Builds the root and its ancestry. Each occurrence uses its explicit choice, or its default. Only nodes within
 * `depth` levels are expanded, even when the user chose their synthesis; that limit alone ends recipes that need each
 * other (a monster repeated on its own branch is expanded like any other). `depth` 0 shows the root alone.
 */
export function ancestry(sources: TreeSources, rootId: string, choices: TreeChoices, depth: number): RelationNode | null {
  const build = (item: Extract<RelationItem, { type: "monster" }>, id: string, level: number): RelationNode => {
    const monster = sources.monsters.get(item.monsterId)
    if (!monster) return { id, item, choice: null, explicit: false, branches: [] }
    const chosen = choices[id]
    const explicit = chosen !== undefined && isAvailable(sources, monster, chosen)
    const choice = explicit ? chosen : defaultChoice(sources, monster, level === 0)
    const hasParents = choice?.type === "recipe" || choice?.type === "normal"
    const withinDepth = level < depth
    if (!hasParents || !withinDepth) {
      return { id, item, choice, explicit, truncated: hasParents && !withinDepth && depth > 0, branches: [] }
    }
    const branches = parentItems(sources, monster.id, choice).map(({ item: parent, slot }, index): RelationNode => {
      const parentId = parentNodeId(id, index, itemKey(parent))
      const node: RelationNode = parent.type === "monster" ? build(parent, parentId, level + 1) : { id: parentId, item: parent, branches: [] }
      return slot ? { ...node, slot: { ownerId: id, index, ...slot } } : node
    })
    return { id, item, choice, explicit, branches }
  }
  if (!sources.monsters.has(rootId)) return null
  return build({ type: "monster", monsterId: rootId, recipe: null }, ROOT_ID, 0)
}

/**
 * Builds the descendants through stored recipes up to `depth` levels; normal-synthesis results of the root stay one
 * abstract node. A monster already on its own branch is not repeated.
 */
export function descendants(sources: TreeSources, rootId: string, depth: number): RelationNode[] {
  const build = (monsterId: string, level: number, prefix: string, branch: Set<string>): RelationNode[] => {
    const usages = sources.engine.usages(monsterId)
    const children = [...new Set(usages.recipes.map((recipe) => recipe.result))]
      .filter((id) => !branch.has(id))
      .map((id) => sources.monsters.get(id))
      .filter((monster): monster is Monster => monster !== undefined)
      .sort((a, b) => a.libraryId - b.libraryId)
    const nodes: RelationNode[] = children.map((child, index) => {
      const id = `${prefix}${index}:${child.id}`
      const branches = level < depth ? build(child.id, level + 1, `${id}/`, new Set(branch).add(child.id)) : []
      return { id, item: { type: "monster", monsterId: child.id, recipe: null }, branches }
    })
    if (level === 1 && usages.normal.length > 0) {
      nodes.push({ id: `${prefix}normalChildren`, item: { type: "normalChildren", resultCount: usages.normal.length }, branches: [] })
    }
    return nodes
  }
  return depth > 0 ? build(rootId, 1, "child:", new Set([rootId])) : []
}

export type NodeSide = "root" | "parent" | "child"

export interface IndexedNode {
  node: RelationNode
  side: NodeSide
  /** The node this one is linked to towards the root: the node below a parent, the node above a child. */
  relative: RelationNode | null
}

/** Every node of the graph by id, with its side and the node it hangs from. */
export function indexNodes(root: RelationNode | null, children: RelationNode[]): Map<string, IndexedNode> {
  const index = new Map<string, IndexedNode>()
  const visit = (node: RelationNode, side: NodeSide, relative: RelationNode | null) => {
    index.set(node.id, { node, side, relative })
    for (const branch of node.branches) visit(branch, side === "root" ? "parent" : side, node)
  }
  if (root) {
    visit(root, "root", null)
    for (const child of children) visit(child, "child", root)
  }
  return index
}
