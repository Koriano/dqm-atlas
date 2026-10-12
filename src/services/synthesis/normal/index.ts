import type { GameData } from "../../../domain/game"
import type { Monster } from "../../../domain/monster"
import type { NormalCandidate, NormalSlot } from "../types"
import { createLibraryOrderSynthesis } from "./libraryOrder"

export interface NormalSynthesisStrategy {
  candidates(a: Monster, b: Monster): NormalCandidate[]
  isReplacedBySpecialRecipe(slot: NormalSlot): boolean
}

export function createNormalSynthesis(game: GameData): NormalSynthesisStrategy {
  const rule = game.rules.normalSynthesis
  switch (rule.kind) {
    case "libraryOrder":
      return createLibraryOrderSynthesis(rule, game.monsters)
  }
}
