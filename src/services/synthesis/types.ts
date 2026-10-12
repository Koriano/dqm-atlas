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

export type NormalOutcome = Extract<SynthesisOutcome, { type: "normal" }>

export interface ParentPair {
  parentIds: [string, string]
  outcome: NormalOutcome
}

export interface ObtainMethods {
  fourWay: FourWaySynthesis[]
  special: SpecialSynthesis[]
  normal: ParentPair[]
}

export interface NormalChild {
  resultId: string
  partnerIds: string[]
}

export interface UsageMethods {
  recipes: SynthesisRecipe[]
  normal: NormalChild[]
}

export type RepresentativeOrigin = { type: "recipe"; recipe: SynthesisRecipe } | { type: "normal" } | null
