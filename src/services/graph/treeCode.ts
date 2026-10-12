import type { GameId } from "../../domain/game"
import type { Monster } from "../../domain/monster"
import {
  isAvailable,
  isNormalPair,
  MAX_PARENT_DEPTH,
  type NodeChoice,
  normalParentOptions,
  parentNodeId,
  type RelationNode,
  ROOT_ID,
  type TreeChoices,
  type TreeSources,
} from "./focusTree"

/**
 * Shareable code of a synthesis tree: a snapshot of the choice of every displayed occurrence, defaults included, so
 * the tree read back does not depend on the default-choice rules. Layout is not part of it.
 *
 * `dqm1.` + base64url(deflate(JSON `{ g: gameId, d: parentDepth, t: node }`)), a node being
 * `[monsterId]` (cannot be obtained), `[monsterId, "s", locationId]`, `[monsterId, "e", eventId]`,
 * `[monsterId, "r", recipeId, parents?]` or `[monsterId, "n", parents?]`; `parents` lists one node per parent (null
 * for a slot left empty) and is absent when the parents are not displayed.
 */
const PREFIX = "dqm1."
const MAX_CODE_LENGTH = 20000

type EncodedNode = (string | (EncodedNode | null)[])[]

export type DecodedTree =
  /** `mismatch`: a well-formed code that does not fit the game data (wrong recipe, parent, location…). */
  { ok: true; rootId: string; choices: TreeChoices; depth: number } | { ok: false; error: "invalid" | "otherGame" | "mismatch" }

function encodeNode(node: RelationNode): EncodedNode | null {
  if (node.item.type !== "monster") return null
  const id = node.item.monsterId
  const choice = node.choice
  if (!choice) return [id]
  if (choice.type === "scout") return [id, "s", choice.locationId]
  if (choice.type === "event") return [id, "e", choice.eventId]
  const parents = node.branches.length > 0 ? [node.branches.map(encodeNode)] : []
  return choice.type === "recipe" ? [id, "r", choice.recipeId, ...parents] : [id, "n", ...parents]
}

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer())
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return bytes
}

/** `depth` is the number of parent levels displayed (0 when parents are hidden). */
export async function encodeTree(gameId: GameId, root: RelationNode, depth: number): Promise<string> {
  const json = JSON.stringify({ g: gameId, d: depth, t: encodeNode(root) })
  return PREFIX + toBase64Url(await pipe(new TextEncoder().encode(json), new CompressionStream("deflate-raw")))
}

/**
 * Reads a code back into explicit choices. The code is untrusted: everything is checked against the game data, and a
 * single choice that does not fit rejects the whole code rather than restoring part of the tree.
 */
export async function decodeTree(code: string, sources: TreeSources, gameId: GameId): Promise<DecodedTree> {
  const invalid: DecodedTree = { ok: false, error: "invalid" }
  const trimmed = code.replace(/\s+/g, "")
  if (!trimmed.startsWith(PREFIX) || trimmed.length > MAX_CODE_LENGTH) return invalid
  let payload: unknown
  try {
    const bytes = await pipe(fromBase64Url(trimmed.slice(PREFIX.length)), new DecompressionStream("deflate-raw"))
    payload = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return invalid
  }
  if (typeof payload !== "object" || payload === null) return invalid
  const { g, d, t } = payload as Record<string, unknown>
  if (typeof g !== "string" || typeof d !== "number" || !Array.isArray(t)) return invalid
  if (g !== gameId) return { ok: false, error: "otherGame" }
  const root = sources.monsters.get(String(t[0]))
  if (!root) return invalid
  const depth = Math.min(MAX_PARENT_DEPTH, Math.max(0, Math.trunc(d) || 0))

  const choices: Record<string, NodeChoice> = {}
  let mismatch = false
  /** The monster of a parent entry, when the entry is a node of one of `allowed`. */
  const parentMonster = (entry: unknown, allowed: readonly string[]): Monster | null => {
    if (entry === null) return null
    const monster = Array.isArray(entry) && typeof entry[0] === "string" && allowed.includes(entry[0]) ? sources.monsters.get(entry[0]) : undefined
    if (!monster) mismatch = true
    return monster ?? null
  }
  const visit = (entry: unknown[], monster: Monster, id: string, level: number): void => {
    const [, kind, first, second] = entry
    if (kind === undefined) return
    const choice: NodeChoice | null =
      kind === "s" && typeof first === "string"
        ? { type: "scout", locationId: first }
        : kind === "e" && typeof first === "string"
          ? { type: "event", eventId: first }
          : kind === "r" && typeof first === "string"
            ? { type: "recipe", recipeId: first }
            : kind === "n"
              ? { type: "normal", parents: [null, null] }
              : null
    if (!choice || !isAvailable(sources, monster, choice)) {
      mismatch = true
      return
    }
    const entries = choice.type === "recipe" ? second : first
    if (choice.type === "scout" || choice.type === "event" || !Array.isArray(entries)) {
      // Scouting and events have no parents; a synthesis has none listed at the depth limit only.
      if (choice.type === "recipe" || choice.type === "normal") mismatch ||= level < depth
      choices[id] = choice
      return
    }
    const recipe = choice.type === "recipe" ? sources.recipes.get(choice.recipeId) : undefined
    if (level >= MAX_PARENT_DEPTH || entries.length !== (recipe ? recipe.parents.length : 2)) {
      mismatch = true
      return
    }
    const parents: (Monster | null)[] = []
    if (choice.type === "recipe") {
      const picks: Record<number, string> = {}
      recipe?.parents.forEach((condition, index) => {
        const allowed = condition.type === "monster" ? [condition.monsterId] : sources.engine.conditionCandidates(condition)
        const parent = parentMonster(entries[index], allowed)
        // Only a slot can be left empty.
        if (!parent && condition.type === "monster") mismatch = true
        if (parent && condition.type !== "monster") picks[index] = parent.id
        parents.push(parent)
      })
      choices[id] = { ...choice, picks }
    } else {
      const options = normalParentOptions(sources, monster.id, [null, null])
      parents.push(parentMonster(entries[0], options[0]), parentMonster(entries[1], options[1]))
      const [first, second] = parents
      if (first && second && !isNormalPair(sources, monster.id, first.id, second.id)) mismatch = true
      choices[id] = { type: "normal", parents: [first?.id ?? null, second?.id ?? null] }
    }
    parents.forEach((parent, index) => {
      if (parent) visit(entries[index] as unknown[], parent, parentNodeId(id, index, parent.id), level + 1)
    })
  }
  visit(t, root, ROOT_ID, 0)
  if (mismatch) return { ok: false, error: "mismatch" }
  return { ok: true, rootId: root.id, choices, depth }
}
