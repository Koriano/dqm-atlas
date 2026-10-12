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

export type NormalSynthesisRule = LibraryOrderSynthesisRule
