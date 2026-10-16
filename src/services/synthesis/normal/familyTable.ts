import type { FamilyTableSynthesisRule } from "../../../domain/synthesis"
import type { NormalCandidate } from "../types"
import type { NormalSynthesisStrategy } from "./index"

export function createFamilyTableSynthesis(rule: FamilyTableSynthesisRule): NormalSynthesisStrategy {
  const rows = new Map(rule.table.map((entry) => [`${entry.families[0]}|${entry.families[1]}`, entry.results]))

  return {
    ordered: true,

    candidates(a, b) {
      if (a.familyId === b.familyId) return []
      const candidates: NormalCandidate[] = []
      // Each order of the families gives its child, at the rank of the second parent.
      for (const [first, second] of [[a.familyId, b.familyId], [b.familyId, a.familyId]]) {
        const resultId = rows.get(`${first}|${second}`)?.[b.rank]
        if (resultId === undefined || resultId === a.id || resultId === b.id) continue
        if (!candidates.some((candidate) => candidate.resultId === resultId)) candidates.push({ resultId, slot: "parentFamily" })
      }
      return candidates
    },

    isReplacedBySpecialRecipe: () => false,
  }
}
