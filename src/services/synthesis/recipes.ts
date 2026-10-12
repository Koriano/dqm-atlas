import type { GameData } from "../../domain/game"
import type { Monster, Rank } from "../../domain/monster"
import type { ParentCondition, SpecialSynthesis } from "../../domain/synthesis"

export function createRecipeMatcher(game: GameData) {
  const rankIndex = new Map(game.rules.rankOrder.map((rank, index) => [rank, index]))
  const rankOf = (rank: Rank) => rankIndex.get(rank) ?? -1
  const specials = game.recipes.filter((recipe): recipe is SpecialSynthesis => recipe.type === "special")
  const specificity = (recipe: SpecialSynthesis) => recipe.parents.filter((parent) => parent.type === "monster").length

  const groups = new Map(game.monsterGroups.map((group) => [group.id, new Set(group.monsterIds)]))

  const fits = (condition: ParentCondition, monster: Monster): boolean => {
    if (condition.type === "monster") return condition.monsterId === monster.id
    if (condition.type === "group") return groups.get(condition.groupId)?.has(monster.id) ?? false
    return (
      condition.familyId === monster.familyId &&
      (condition.minRank === undefined || rankOf(monster.rank) >= rankOf(condition.minRank)) &&
      (condition.maxRank === undefined || rankOf(monster.rank) <= rankOf(condition.maxRank))
    )
  }

  const specialsByMonster = new Map(
    game.monsters.map((monster) => [monster.id, specials.filter((recipe) => recipe.parents.some((parent) => fits(parent, monster)))]),
  )

  return {
    fits,

    /** Special recipes matching the pair in either order; a recipe naming more exact monsters wins over broader ones. */
    specialsFor(a: Monster, b: Monster): SpecialSynthesis[] {
      const matching = (specialsByMonster.get(a.id) ?? []).filter(
        ({ parents: [p, q] }) => (fits(p, a) && fits(q, b)) || (fits(p, b) && fits(q, a)),
      )
      const best = Math.max(...matching.map(specificity))
      return matching.filter((recipe) => specificity(recipe) === best)
    },
  }
}
