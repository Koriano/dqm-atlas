import type { GameData } from "../../domain/game"
import type { Monster } from "../../domain/monster"
import type { FourWaySynthesis, ParentCondition, SpecialSynthesis } from "../../domain/synthesis"
import { createNormalSynthesis } from "./normal"
import { createRecipeMatcher } from "./recipes"
import type { ObtainMethods, ParentPair, RepresentativeOrigin, SynthesisOutcome, UsageMethods } from "./types"

export interface SynthesisEngine {
  /** Every monster the pair can produce. */
  synthesize(aId: string, bId: string): SynthesisOutcome[]
  /** How to obtain a monster; normal pairs never include the target itself as a parent. */
  obtainMethods(targetId: string): ObtainMethods
  /** What a monster can be used for; normal children never include one of the parents. */
  usages(monsterId: string): UsageMethods
  /** Parents usable on the other side of the pairs once `selectedId` is chosen, or on either side without a selection. */
  partnerOptions(pairs: ParentPair[], selectedId?: string): string[]
  /** Every monster accepted by a recipe's parent condition, in library order. */
  conditionCandidates(condition: ParentCondition): string[]
  /** Priority: four-way, then special, then normal synthesis. */
  representativeOrigin(targetId: string): RepresentativeOrigin
  /** Builds the reverse-lookup index now instead of on the first lookup. */
  prepareIndex(): void
}

interface SynthesisIndex {
  obtain: Map<string, ParentPair[]>
  children: Map<string, Map<string, Set<string>>>
}

export function createSynthesisEngine(game: GameData): SynthesisEngine {
  const monsters = new Map(game.monsters.map((monster) => [monster.id, monster]))
  const normal = createNormalSynthesis(game)
  const recipes = createRecipeMatcher(game)
  const specials = game.recipes.filter((recipe): recipe is SpecialSynthesis => recipe.type === "special")
  const fourWays = game.recipes.filter((recipe): recipe is FourWaySynthesis => recipe.type === "fourWay")
  const libraryOrder = (a: string, b: string) => monster(a).libraryId - monster(b).libraryId

  function monster(id: string): Monster {
    const found = monsters.get(id)
    if (!found) throw new Error(`Unknown monster "${id}" in game "${game.id}"`)
    return found
  }

  function synthesize(aId: string, bId: string): SynthesisOutcome[] {
    const a = monster(aId)
    const b = monster(bId)
    const matching = recipes.specialsFor(a, b)
    const unconditional = matching.some((recipe) => recipe.conditions.length === 0)
    const conditional = matching.find((recipe) => recipe.conditions.length > 0)
    // A conditional recipe (e.g. both parents level 20+) takes precedence over the pair's other outcomes when met.
    const outcomes: SynthesisOutcome[] = matching.map((recipe) =>
      recipe.conditions.length === 0 && conditional
        ? { type: "recipe", resultId: recipe.result, recipe, unlessRecipeId: conditional.id }
        : { type: "recipe", resultId: recipe.result, recipe },
    )

    for (const candidate of normal.candidates(a, b)) {
      if (outcomes.some((outcome) => outcome.resultId === candidate.resultId)) continue
      if (matching.length === 0 || !normal.isReplacedBySpecialRecipe(candidate.slot)) {
        outcomes.push({ type: "normal", ...candidate })
      } else if (!unconditional && conditional) {
        outcomes.push({ type: "normal", ...candidate, unlessRecipeId: conditional.id })
      }
    }
    return outcomes
  }

  // Built on first reverse lookup: every unordered pair of monsters, synthesized once.
  let index: SynthesisIndex | undefined
  function getIndex(): SynthesisIndex {
    if (index) return index
    const built: SynthesisIndex = { obtain: new Map(), children: new Map() }
    const addChild = (parentId: string, resultId: string, partnerId: string) => {
      const byResult = built.children.get(parentId) ?? new Map<string, Set<string>>()
      byResult.set(resultId, (byResult.get(resultId) ?? new Set()).add(partnerId))
      built.children.set(parentId, byResult)
    }
    const ids = game.monsters.map((m) => m.id)
    for (let i = 0; i < ids.length; i++) {
      for (let j = i; j < ids.length; j++) {
        const parentIds: [string, string] = [ids[i], ids[j]]
        for (const outcome of synthesize(...parentIds)) {
          if (outcome.type !== "normal" || parentIds.includes(outcome.resultId)) continue
          const pairs = built.obtain.get(outcome.resultId) ?? []
          pairs.push({ parentIds, outcome })
          built.obtain.set(outcome.resultId, pairs)
          addChild(parentIds[0], outcome.resultId, parentIds[1])
          addChild(parentIds[1], outcome.resultId, parentIds[0])
        }
      }
    }
    index = built
    return built
  }

  return {
    synthesize,

    obtainMethods(targetId) {
      monster(targetId)
      return {
        fourWay: fourWays.filter((recipe) => recipe.result === targetId),
        special: specials.filter((recipe) => recipe.result === targetId),
        normal: getIndex().obtain.get(targetId) ?? [],
      }
    },

    usages(monsterId) {
      const used = monster(monsterId)
      const children = getIndex().children.get(monsterId) ?? new Map<string, Set<string>>()
      return {
        recipes: game.recipes.filter((recipe) => recipe.parents.some((parent) => recipes.fits(parent, used))),
        normal: [...children]
          .map(([resultId, partners]) => ({ resultId, partnerIds: [...partners].sort(libraryOrder) }))
          .sort((x, y) => libraryOrder(x.resultId, y.resultId)),
      }
    },

    partnerOptions(pairs, selectedId) {
      const options = new Set<string>()
      for (const { parentIds: [a, b] } of pairs) {
        if (selectedId === undefined) {
          options.add(a).add(b)
        } else if (a === selectedId) {
          options.add(b)
        } else if (b === selectedId) {
          options.add(a)
        }
      }
      return [...options].sort(libraryOrder)
    },

    conditionCandidates(condition) {
      return game.monsters
        .filter((candidate) => recipes.fits(condition, candidate))
        .sort((a, b) => a.libraryId - b.libraryId)
        .map((candidate) => candidate.id)
    },

    representativeOrigin(targetId) {
      const methods = this.obtainMethods(targetId)
      const recipe = methods.fourWay[0] ?? methods.special[0]
      if (recipe) return { type: "recipe", recipe }
      return methods.normal.length > 0 ? { type: "normal" } : null
    },

    prepareIndex() {
      getIndex()
    },
  }
}
