import type { GameId } from "../domain/game"
import type { MonsterSize } from "../domain/monster"

/** Monster icon files are one slot wide and one, two or three slots tall, depending on the monster's size. */
export const MONSTER_ICON_SLOT = 40
export const MONSTER_ICON_SLOTS: Record<MonsterSize, number> = { S: 1, M: 2, G: 3 }

export function monsterIconSize(size: MonsterSize, scale = 1): { width: number; height: number } {
  return { width: MONSTER_ICON_SLOT * scale, height: MONSTER_ICON_SLOT * MONSTER_ICON_SLOTS[size] * scale }
}

export function monsterIconUrl(gameId: GameId, iconAssetKey: string): string {
  return `${import.meta.env.BASE_URL}assets/${gameId}/monsters/${iconAssetKey}.png`
}

/** Height of a family icon's drawing at scale 1, whatever the game: the game's `familyIconFrame` says where it is. */
export const FAMILY_ICON_HEIGHT = 20

/** Native size of the equipment icons. */
export const EQUIPMENT_ICON_SIZE = { width: 12, height: 16 } as const

export function equipmentIconUrl(gameId: GameId, iconAssetKey: string): string {
  return `${import.meta.env.BASE_URL}assets/${gameId}/equipment/${iconAssetKey}.png`
}

/** Icon of a weather or a season, for the games whose screens show them that way. */
export function situationIconUrl(gameId: GameId, kind: "weathers" | "seasons", iconAssetKey: string): string {
  return `${import.meta.env.BASE_URL}assets/${gameId}/${kind}/${iconAssetKey}.png`
}

export function familyIconUrl(gameId: GameId, iconAssetKey: string): string {
  return `${import.meta.env.BASE_URL}assets/${gameId}/families/${iconAssetKey}.png`
}
