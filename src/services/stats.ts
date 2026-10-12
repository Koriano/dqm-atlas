import type { Monster, MonsterStats } from "../domain/monster"

/** Display order of the stats. */
export const STAT_KEYS = ["hp", "mp", "attack", "defence", "agility", "wisdom"] as const satisfies readonly (keyof MonsterStats)[]

/** Highest value of each stat among the game's monsters: the scale of the stat gauges, never a hard-coded cap. */
export function statMaxima(monsters: readonly Monster[]): MonsterStats {
  const maxima: MonsterStats = { hp: 0, mp: 0, attack: 0, defence: 0, agility: 0, wisdom: 0 }
  for (const monster of monsters) {
    for (const key of STAT_KEYS) maxima[key] = Math.max(maxima[key], monster.maxStats[key])
  }
  return maxima
}
