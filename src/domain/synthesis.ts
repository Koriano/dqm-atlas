import type { Rank } from "./monster"

export type ParentCondition =
  | { type: "monster"; monsterId: string }
  | { type: "family"; familyId: string; minRank?: Rank; maxRank?: Rank }
  | { type: "group"; groupId: string }

export type SynthesisCondition = {
  type: "minimumLevel"
  value: number
}

interface RecipeBase {
  id: string
  result: string
  conditions: SynthesisCondition[]
}

export interface SpecialSynthesis extends RecipeBase {
  type: "special"
  parents: [ParentCondition, ParentCondition]
}

export interface FourWaySynthesis extends RecipeBase {
  type: "fourWay"
  parents: [ParentCondition, ParentCondition, ParentCondition, ParentCondition]
}

/** Fixed recipes stored as data; normal synthesis is computed from `GameRules.normalSynthesis`. */
export type SynthesisRecipe = SpecialSynthesis | FourWaySynthesis

export interface FamilyMixEntry {
  families: [string, string]
  result: string
}

/**
 * Candidates follow library order within a family (DQMJ2).
 * Pairs of families absent from `familyMix` get no family-mix candidate.
 */
export interface LibraryOrderSynthesisRule {
  kind: "libraryOrder"
  /** @minItems 1 */
  resultMonsterIds: string[]
  familyMix: FamilyMixEntry[]
  specialRecipeReplaces: "familyMixCandidate" | "allCandidates"
}

export interface FamilyTableEntry {
  families: [string, string]
  /** The child for each rank of the second parent; a rank absent from the row gives none. */
  results: Record<Rank, string>
}

/**
 * Candidates read from a table of ordered family pairs (The Dark Prince): parents of two different families give the
 * child of each order of their families, at the rank of the second parent, so the order of the parents matters. A
 * child identical to a parent is not offered; parents of the same family, or of a family absent from the table, give
 * none. Special recipes add their result to these candidates.
 */
export interface FamilyTableSynthesisRule {
  kind: "familyTable"
  /** @minItems 1 */
  table: FamilyTableEntry[]
}

export type NormalSynthesisRule = LibraryOrderSynthesisRule | FamilyTableSynthesisRule
