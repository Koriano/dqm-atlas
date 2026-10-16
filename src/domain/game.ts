import type { Monster, MonsterSize, MonsterStats, Rank } from "./monster"
import type { NormalSynthesisRule, SynthesisRecipe } from "./synthesis"

export type GameId = "dqmj2" | "dark_prince"

/** An entity the game declares so data can reference it by id and i18n can name it. */
export interface CatalogEntry {
  id: string
}

/** The family icon files of a game: their size, and the area holding the drawing, the only part shown. */
export interface FamilyIconFrame {
  /** @asType integer */
  width: number
  /** @asType integer */
  height: number
  drawn: {
    /** @asType integer */
    x: number
    /** @asType integer */
    y: number
    /** @asType integer */
    width: number
    /** @asType integer */
    height: number
  }
}

export interface Family extends CatalogEntry {
  /** File name, without extension, under `public/assets/<gameId>/families/`. */
  iconAssetKey: string
}
export interface EquipmentType extends CatalogEntry {
  /** File name, without extension, under `public/assets/<gameId>/equipment/`. */
  iconAssetKey: string
}
interface SkillTierBase {
  /**
   * Skill points to invest in the skill.
   * @asType integer
   * @minimum 1
   */
  points: number
}
export interface AbilityTier extends SkillTierBase {
  type: "ability"
  abilityId: string
}
export interface TraitTier extends SkillTierBase {
  type: "trait"
  traitId: string
}
/** What a skill unlocks at a points threshold: an ability (spell, technique) or a trait. */
export type SkillTier = AbilityTier | TraitTier

export interface Skill extends CatalogEntry {
  /** In unlocking order (ascending points; two tiers may share a threshold). @minItems 1 */
  tiers: SkillTier[]
}
/** What changes a monster's sheet: its maximum stats multiplied, its resistance values raised or lowered. */
export interface SheetEffect {
  statMultipliers?: Partial<MonsterStats>
  /** Added to the resistance value of each listed category. */
  resistanceBonus?: Record<string, number>
}

export type Ability = CatalogEntry
export interface Trait extends CatalogEntry {
  /** Absent when the trait does not change the sheet. */
  sheetEffect?: SheetEffect
}
export type ResistanceCategory = CatalogEntry
/** A stage of a game that gives resistances as values: the stage a value reaches is named, as in the game. */
export interface ResistanceStage extends CatalogEntry {
  /** Lowest value of the stage. */
  min: number
}
export interface Location extends CatalogEntry {
  /** The weathers the place can have in each season (season id → weather ids); absent when it has no seasons. */
  weathersBySeason?: Record<string, string[]>
}
export type TimeOfDay = CatalogEntry
/** A game whose screens show a weather or a season by its icon declares it, under `public/assets/<gameId>/<weathers|seasons>/`. */
export interface Weather extends CatalogEntry {
  iconAssetKey?: string
}
export interface Season extends CatalogEntry {
  iconAssetKey?: string
}
export type StoryStage = CatalogEntry
export type EggColour = CatalogEntry
export type EventKind = CatalogEntry
export type Region = CatalogEntry

export interface GameEvent extends CatalogEntry {
  kind: string
  /** Absent when the event is not tied to one release region. */
  regionId?: string
}

/** Monsters a recipe can accept interchangeably (e.g. the Incarnus forms). */
export interface MonsterGroup extends CatalogEntry {
  /** @minItems 2 */
  monsterIds: string[]
}

/** Another size any monster of the game can have, and what it changes on the sheet. */
export interface SizeVariant extends SheetEffect {
  size: MonsterSize
}

export interface GameRules {
  /** Lowest to highest. @minItems 1 */
  rankOrder: Rank[]
  normalSynthesis: NormalSynthesisRule
  /** Absent when every monster has one size, its own. */
  sizeVariants?: SizeVariant[]
}

export interface GameData {
  id: GameId
  families: Family[]
  familyIconFrame: FamilyIconFrame
  skills: Skill[]
  abilities: Ability[]
  traits: Trait[]
  equipmentTypes: EquipmentType[]
  resistanceCategories: ResistanceCategory[]
  /** Ascending `min`; empty when the game names each resistance directly. */
  resistanceStages: ResistanceStage[]
  locations: Location[]
  timesOfDay: TimeOfDay[]
  seasons: Season[]
  weathers: Weather[]
  storyStages: StoryStage[]
  eventKinds: EventKind[]
  regions: Region[]
  events: GameEvent[]
  eggColours: EggColour[]
  monsterGroups: MonsterGroup[]
  monsters: Monster[]
  recipes: SynthesisRecipe[]
  rules: GameRules
}
