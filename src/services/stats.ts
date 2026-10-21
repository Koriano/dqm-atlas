import type { GameData, ResistanceStage, SheetEffect } from "../domain/game"
import type { Monster, MonsterSize, MonsterStats, MonsterTrait, ResistanceMap } from "../domain/monster"

/** Display order of the stats. */
export const STAT_KEYS = ["hp", "mp", "attack", "defence", "agility", "wisdom"] as const satisfies readonly (keyof MonsterStats)[]

/**
 * Immunity: a bonus never raises a resistance above this value, and a value already above it (an absorption) keeps
 * its own.
 */
const RESISTANCE_BONUS_CAP = 100

/** The sizes a monster's sheet can show: its own, then the other sizes the game gives every monster. */
export function monsterSizes(monster: Monster, game: GameData): MonsterSize[] {
  const others = (game.rules.sizeVariants ?? []).map((variant) => variant.size).filter((size) => size !== monster.size)
  return [monster.size, ...others]
}

/** Whether the monster has the trait in a size: a trait of every size, or one of that size only. */
export function hasTraitInSize(trait: MonsterTrait, size: MonsterSize): boolean {
  return trait.size === undefined || trait.size === size
}

/** The monster's traits in a size. */
export function traitsInSize(monster: Monster, size: MonsterSize): MonsterTrait[] {
  return monster.traits.filter((trait) => hasTraitInSize(trait, size))
}

/** What changes the sheet in a size: the size itself when it is not the monster's own, then its traits, in order. */
function sheetEffects(monster: Monster, game: GameData, size: MonsterSize): SheetEffect[] {
  const variant = size === monster.size ? undefined : game.rules.sizeVariants?.find((entry) => entry.size === size)
  const fromTraits = traitsInSize(monster, size).flatMap((trait) => game.traits.find((entry) => entry.id === trait.traitId)?.sheetEffect ?? [])
  return variant ? [variant, ...fromTraits] : fromTraits
}

/** Maximum stats shown in a size: every multiplier applied to the stored value, rounded once at the end. */
export function sheetStats(monster: Monster, game: GameData, size: MonsterSize): MonsterStats {
  const effects = sheetEffects(monster, game, size)
  const stats = { ...monster.maxStats }
  for (const key of STAT_KEYS) {
    const factor = effects.reduce((product, effect) => product * (effect.statMultipliers?.[key] ?? 1), 1)
    stats[key] = Math.round(monster.maxStats[key] * factor)
  }
  return stats
}

/**
 * Resistances shown in a size. Only resistance values change: every bonus is added to the stored value (0 when
 * absent), without going above the cap. A named resistance is shown as stored.
 */
export function sheetResistances(monster: Monster, game: GameData, size: MonsterSize): ResistanceMap {
  const effects = sheetEffects(monster, game, size)
  if (game.resistanceStages.length === 0 || effects.every((effect) => !effect.resistanceBonus)) return monster.resistances
  const resistances: ResistanceMap = { ...monster.resistances }
  for (const category of game.resistanceCategories) {
    const stored = monster.resistances[category.id] ?? 0
    if (typeof stored !== "number") continue
    const bonus = effects.reduce((sum, effect) => sum + (effect.resistanceBonus?.[category.id] ?? 0), 0)
    if (bonus === 0) continue
    resistances[category.id] = bonus > 0 ? Math.min(stored + bonus, Math.max(stored, RESISTANCE_BONUS_CAP)) : stored + bonus
  }
  return resistances
}

/** The level of a resistance value: below zero, zero, a reduction up to immunity, beyond it. */
export function resistanceLevel(value: number): "weak" | "normal" | "resistant" | "absorb" {
  return value < 0 ? "weak" : value === 0 ? "normal" : value <= RESISTANCE_BONUS_CAP ? "resistant" : "absorb"
}

/** The stage a resistance value reaches: the last one whose minimum it reaches, or the first. */
export function resistanceStage(stages: readonly ResistanceStage[], value: number): ResistanceStage | undefined {
  let reached = stages[0]
  for (const stage of stages) if (value >= stage.min) reached = stage
  return reached
}

/** Highest value of each stat among the game's monsters, in every size: the scale of the stat gauges, never a hard-coded cap. */
export function statMaxima(game: GameData): MonsterStats {
  const maxima: MonsterStats = { hp: 0, mp: 0, attack: 0, defence: 0, agility: 0, wisdom: 0 }
  for (const monster of game.monsters) {
    for (const size of monsterSizes(monster, game)) {
      const stats = sheetStats(monster, game, size)
      for (const key of STAT_KEYS) maxima[key] = Math.max(maxima[key], stats[key])
    }
  }
  return maxima
}
