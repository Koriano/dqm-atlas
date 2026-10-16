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

/**
 * A named resistance, for a game that shows each one directly; or the game's resistance value, for a game that
 * declares `resistanceStages` and names a value by the stage it reaches.
 */
export type Resistance = "weak" | "immune" | "absorb" | "reflect" | PartialResistance | number

export type ResistanceMap = Record<string, Resistance>

/** @minProperties 1 */
export interface ScoutSituation {
  timeOfDay?: string
  season?: string
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
  | {
      type: "egg"
      /** The region where the egg is found. */
      locationId: string
      /** The colours of egg it can hatch from. @minItems 1 */
      eggColours: string[]
      /** Absent when the egg is found from the start. */
      storyStage?: string
    }
  | { type: "event"; eventId: string }

export interface MonsterTrait {
  traitId: string
  /**
   * Level at which the monster gains the trait; absent when it has it from the start.
   * @asType integer
   * @minimum 2
   */
  level?: number
  /** The only size in which the monster has the trait; absent when it has it in every size. */
  size?: MonsterSize
}

export interface Monster {
  id: string
  libraryId: number
  familyId: string
  rank: Rank
  size: MonsterSize
  maxStats: MonsterStats
  /** Absent in a game where monsters carry no equipment. @minItems 1 */
  equipment?: string[]
  skillId: string
  traits: MonsterTrait[]
  resistances: ResistanceMap
  obtainments: Obtainment[]
  iconAssetKey: string
}
