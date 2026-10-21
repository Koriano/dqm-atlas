import type { Monster } from "../../domain/monster"
import type { SynthesisRecipe } from "../../domain/synthesis"
import { MONSTER_ICON_SLOT, monsterIconSize } from "../assets"
import { type FocusSize, type FocusTree, type PlacedItem, focusLayout } from "./focusLayout"
import { type DirectChoice, isDirect, type ParentSlot, type RelationItem, type RelationNode } from "./focusTree"

/** Scale of the monster icons in the tree: the root's, and everyone else's. */
export const ROOT_SCALE = 2
export const MONSTER_SCALE = 1.5
/** Side of the box standing in for the monster of a parent slot. */
export const SLOT_BOX = MONSTER_ICON_SLOT * MONSTER_SCALE

const NODE_WIDTH = 100
const ROOT_WIDTH = 150
const ABSTRACT = { width: 170, height: 64 }
const GAPS = { gapX: 20, gapY: 90 }
/** Room under an icon for the name, then for each line of the note. */
const NAME_ROOM = 32
const NOTE_LINE = 14
const ROOT_NAME_ROOM = 40
const TAG_ROW = 20
/** The "choose" field of a parent slot, with the gap above it. */
const FIELD_HEIGHT = 24
const FIELD_ROW = FIELD_HEIGHT + 4

/** `tag`: the node is obtained by scouting or an event (its chosen method), shown under its name. */
export type ObtainTagType = DirectChoice["type"] | null

export type FocusNodeData =
  | { kind: "focus"; monster: Monster; selected: boolean; tag: ObtainTagType }
  /** `picked`: the monster was picked by the user for a parent slot; the slot's field stays under it to change it. */
  | { kind: "monster"; monster: Monster; note: string | null; selected: boolean; tag: ObtainTagType; picked: boolean }
  /**
   * A parent slot still to pick (a generic recipe parent or a normal-synthesis parent), drawn like a monster: a
   * monster-sized box holding the family icon when every candidate shares one, then its field. A recipe parent is
   * named, with its conditions as a note; a normal-synthesis parent shows no text but keeps the room of the name.
   */
  | { kind: "slot"; familyId: string | null; title: string | null; note: string | null }
  | { kind: "abstract"; title: string; detail: string | null; note: string | null }

/** The texts of the graph, in the interface language, and how much room they take. */
export interface FocusLabels {
  /** Name of a parent slot, its rank bounds, and the family every candidate shares (null when they differ). */
  slot(slot: ParentSlot): { title: string; detail: string | null; familyId: string | null }
  recipeConditions(recipe: SynthesisRecipe): string | null
  normalChildren(resultCount: number): { title: string; detail: string }
  /** Lines a note takes once wrapped in a node of this width. */
  noteLines(note: string, width: number): number
}

export interface FocusGraphNode extends PlacedItem {
  data: FocusNodeData
}

export interface FocusGraphEdge {
  id: string
  source: string
  target: string
  /** Leads to something still undetermined: a parent to choose, the normal-synthesis results. */
  dashed: boolean
}

export interface FocusGraph {
  nodes: FocusGraphNode[]
  edges: FocusGraphEdge[]
}

export interface FocusGraphInput {
  root: RelationNode | null
  children: RelationNode[]
  monsters: Map<string, Monster>
  /** The occurrence whose sheet is open. */
  selectedId: string | null
  labels: FocusLabels
}

const DASHED: ReadonlySet<RelationItem["type"]> = new Set(["parentToChoose", "normalChildren"])

function sizeOf(data: FocusNodeData, labels: FocusLabels): FocusSize {
  if (data.kind === "abstract") return ABSTRACT
  const noteRoom = (note: string | null) => NAME_ROOM + (note ? NOTE_LINE * Math.max(1, labels.noteLines(note, NODE_WIDTH)) : 0)
  if (data.kind === "slot") return { width: NODE_WIDTH, height: SLOT_BOX + noteRoom(data.note) + FIELD_ROW }
  const iconHeight = monsterIconSize(data.monster.size, data.kind === "focus" ? ROOT_SCALE : MONSTER_SCALE).height
  const tagHeight = data.tag ? TAG_ROW : 0
  if (data.kind === "focus") return { width: ROOT_WIDTH, height: iconHeight + ROOT_NAME_ROOM + tagHeight }
  // The field needs its full distance to the bottom to line up with its neighbours: a tag and a note are a bit taller
  // than the room the other nodes give them.
  const fieldHeight = data.picked ? FIELD_ROW + (data.tag ? 6 : 0) + (data.note ? 4 : 0) : 0
  return { width: NODE_WIDTH, height: iconHeight + noteRoom(data.note) + tagHeight + fieldHeight }
}

/** The synthesis tree as placed nodes and edges, ready to be drawn: nothing here depends on how it is rendered. */
export function focusGraph({ root, children, monsters, selectedId, labels }: FocusGraphInput): FocusGraph {
  const data = new Map<string, FocusNodeData>()
  const edges: FocusGraphEdge[] = []
  if (!root) return { nodes: [], edges }

  function nodeData(node: RelationNode, side: "root" | "parent" | "child"): FocusNodeData {
    const item = node.item
    const selected = selectedId === node.id
    const tag = node.choice && isDirect(node.choice) ? node.choice.type : null
    switch (item.type) {
      case "monster": {
        const monster = monsters.get(item.monsterId)
        const note = item.recipe ? labels.recipeConditions(item.recipe) : null
        if (!monster) return { kind: "abstract", title: item.monsterId, detail: null, note }
        return side === "root" ? { kind: "focus", monster, selected, tag } : { kind: "monster", monster, note, selected, tag, picked: !!node.slot }
      }
      case "condition":
      case "parentToChoose": {
        if (!node.slot) return { kind: "abstract", title: item.type, detail: null, note: null }
        const { title, detail, familyId } = labels.slot(node.slot)
        if (item.type === "parentToChoose") return { kind: "slot", familyId, title: null, note: null }
        // Rank bounds of the condition and level condition of the recipe.
        const notes = [detail, labels.recipeConditions(item.recipe)]
        return { kind: "slot", familyId, title, note: notes.filter((part): part is string => !!part).join(" · ") || null }
      }
      case "normalChildren":
        return { kind: "abstract", ...labels.normalChildren(item.resultCount), note: null }
    }
  }

  const edge = (source: RelationNode, target: RelationNode): FocusGraphEdge => ({
    id: `${source.id}->${target.id}`,
    source: source.id,
    target: target.id,
    dashed: DASHED.has(source.item.type) || DASHED.has(target.item.type),
  })
  // Parents sit above the node they belong to (edge parent → node), children below (edge node → child).
  const toTree = (node: RelationNode, relative: RelationNode, side: "parent" | "child"): FocusTree => {
    const value = nodeData(node, side)
    data.set(node.id, value)
    edges.push(side === "parent" ? edge(node, relative) : edge(relative, node))
    return { id: node.id, size: sizeOf(value, labels), branches: node.branches.map((branch) => toTree(branch, node, side)) }
  }
  const rootData = nodeData(root, "root")
  data.set(root.id, rootData)
  const parentTrees = root.branches.map((node) => toTree(node, root, "parent"))
  const childTrees = children.map((node) => toTree(node, root, "child"))

  const placed = focusLayout(parentTrees, { id: root.id, size: sizeOf(rootData, labels) }, childTrees, GAPS)
  return { nodes: placed.map((item) => ({ ...item, data: data.get(item.id) as FocusNodeData })), edges }
}
