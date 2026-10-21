import type { FourWaySynthesis, SpecialSynthesis, SynthesisRecipe } from "../../domain/synthesis"

export type NormalSlot = "parentFamily" | "familyMix" | "identicalParents"

export interface NormalCandidate {
  resultId: string
  slot: NormalSlot
}

interface OutcomeBase {
  resultId: string
  /** Only happens when the conditions of this matching recipe are not met. */
  unlessRecipeId?: string
}

export type SynthesisOutcome =
  | (OutcomeBase & { type: "recipe"; recipe: SpecialSynthesis })
  | (OutcomeBase & { type: "normal"; slot: NormalSlot })

export interface ParentPair {
  parentIds: [string, string]
}

export interface ObtainMethods {
  fourWay: FourWaySynthesis[]
  special: SpecialSynthesis[]
  normal: ParentPair[]
}

export interface UsageMethods {
  recipes: SynthesisRecipe[]
  /** Every monster a normal synthesis with this one can give, in library order. */
  normal: string[]
}

export type RepresentativeOrigin = { type: "recipe"; recipe: SynthesisRecipe } | { type: "normal" } | null
