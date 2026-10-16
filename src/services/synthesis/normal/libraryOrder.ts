import type { Monster } from "../../../domain/monster"
import type { LibraryOrderSynthesisRule } from "../../../domain/synthesis"
import type { NormalCandidate, NormalSlot } from "../types"
import type { NormalSynthesisStrategy } from "./index"

const familyPairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

export function createLibraryOrderSynthesis(rule: LibraryOrderSynthesisRule, monsters: Monster[]): NormalSynthesisStrategy {
  const eligible = new Set(rule.resultMonsterIds)
  const eligibleByFamily = new Map<string, Monster[]>()
  for (const monster of [...monsters].sort((x, y) => x.libraryId - y.libraryId)) {
    if (!eligible.has(monster.id)) continue
    const family = eligibleByFamily.get(monster.familyId) ?? []
    family.push(monster)
    eligibleByFamily.set(monster.familyId, family)
  }
  const familyMix = new Map(rule.familyMix.map((entry) => [familyPairKey(...entry.families), entry.result]))

  // Past the family's last eligible monster, the chain stays on that last monster.
  const nextInFamily = (familyId: string, after: number): string | undefined => {
    const family = eligibleByFamily.get(familyId)
    if (!family) return undefined
    return (family.find((monster) => monster.libraryId > after) ?? family[family.length - 1]).id
  }

  return {
    ordered: false,

    candidates(a, b) {
      if (a.id === b.id) return [{ resultId: a.id, slot: "identicalParents" }]

      const highest = Math.max(a.libraryId, b.libraryId)
      const lowest = Math.min(a.libraryId, b.libraryId)
      const candidates: NormalCandidate[] = []
      const add = (resultId: string | undefined, slot: NormalSlot) => {
        if (resultId !== undefined && !candidates.some((candidate) => candidate.resultId === resultId)) candidates.push({ resultId, slot })
      }

      // A parent whose family has no eligible monster (e.g. ???) is offered back as-is.
      add(nextInFamily(a.familyId, highest) ?? a.id, "parentFamily")
      add(nextInFamily(b.familyId, highest) ?? b.id, "parentFamily")
      const mixedFamily = a.familyId === b.familyId ? undefined : familyMix.get(familyPairKey(a.familyId, b.familyId))
      if (mixedFamily !== undefined) add(nextInFamily(mixedFamily, lowest), "familyMix")
      return candidates
    },

    isReplacedBySpecialRecipe: (slot) => rule.specialRecipeReplaces === "allCandidates" || slot !== "parentFamily",
  }
}
