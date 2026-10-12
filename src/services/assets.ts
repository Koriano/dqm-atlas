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

/**
 * The family icons are drawn in a 14×20 area of a transparent 48×49 canvas; they are cropped to it when shown
 * (measured on every provided file).
 */
export const FAMILY_ICON_CROP = { x: 17, y: 14, width: 14, height: 20 } as const

/** Native size of the equipment icons. */
export const EQUIPMENT_ICON_SIZE = { width: 12, height: 16 } as const

export function equipmentIconUrl(gameId: GameId, iconAssetKey: string): string {
  return `${import.meta.env.BASE_URL}assets/${gameId}/equipment/${iconAssetKey}.png`
}

export function familyIconUrl(gameId: GameId, iconAssetKey: string): string {
  return `${import.meta.env.BASE_URL}assets/${gameId}/families/${iconAssetKey}.png`
}
