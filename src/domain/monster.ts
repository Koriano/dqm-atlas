/** Declared per game in `GameRules.rankOrder`. */
export type Rank = string

export type MonsterSize = "S" | "M" | "G"

export interface MonsterStats {
  hp: number
  mp: number
  attack: number
  defence: number
  agility: number
  wisdom: number
}

/** The game has three degrees of resistance: damage (or the chance of a status) cut by a quarter, a half or three quarters. */
export interface PartialResistance {
  level: "resistant"
  percent: 25 | 50 | 75
}

export type Resistance = "weak" | "immune" | "absorb" | "reflect" | PartialResistance

export type ResistanceMap = Record<string, Resistance>

/** @minProperties 1 */
export interface ScoutSituation {
  timeOfDay?: string
  weather?: string
  storyStage?: string
}

export type Obtainment =
  | {
      type: "scout"
      locationId: string
      /** Absent when the monster appears in every situation. @minItems 1 */
      when?: ScoutSituation[]
    }
  | { type: "event"; eventId: string }

export interface Monster {
  id: string
  libraryId: number
  familyId: string
  rank: Rank
  size: MonsterSize
  maxStats: MonsterStats
  /** @minItems 1 */
  equipment: string[]
  skillId: string
  traitIds: string[]
  resistances: ResistanceMap
  obtainments: Obtainment[]
  iconAssetKey: string
}
