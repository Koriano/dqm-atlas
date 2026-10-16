import type { GameData } from "../../../domain/game"
import type { Monster } from "../../../domain/monster"
import type { NormalCandidate, NormalSlot } from "../types"
import { createFamilyTableSynthesis } from "./familyTable"
import { createLibraryOrderSynthesis } from "./libraryOrder"

export interface NormalSynthesisStrategy {
  /** Whether swapping the parents can change the candidates. */
  ordered: boolean
  candidates(a: Monster, b: Monster): NormalCandidate[]
  isReplacedBySpecialRecipe(slot: NormalSlot): boolean
}

export function createNormalSynthesis(game: GameData): NormalSynthesisStrategy {
  const rule = game.rules.normalSynthesis
  switch (rule.kind) {
    case "libraryOrder":
      return createLibraryOrderSynthesis(rule, game.monsters)
    case "familyTable":
      return createFamilyTableSynthesis(rule)
  }
}
