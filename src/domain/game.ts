import type { Monster, Rank } from "./monster"
import type { NormalSynthesisRule, SynthesisRecipe } from "./synthesis"

export type GameId = "dqmj2"

/** An entity the game declares so data can reference it by id and i18n can name it. */
export interface CatalogEntry {
  id: string
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
export type Ability = CatalogEntry
export type Trait = CatalogEntry
export type ResistanceCategory = CatalogEntry
export type Location = CatalogEntry
export type TimeOfDay = CatalogEntry
export type Weather = CatalogEntry
export type StoryStage = CatalogEntry
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

export interface GameRules {
  /** Lowest to highest. @minItems 1 */
  rankOrder: Rank[]
  normalSynthesis: NormalSynthesisRule
}

export interface GameData {
  id: GameId
  families: Family[]
  skills: Skill[]
  abilities: Ability[]
  traits: Trait[]
  equipmentTypes: EquipmentType[]
  resistanceCategories: ResistanceCategory[]
  locations: Location[]
  timesOfDay: TimeOfDay[]
  weathers: Weather[]
  storyStages: StoryStage[]
  eventKinds: EventKind[]
  regions: Region[]
  events: GameEvent[]
  monsterGroups: MonsterGroup[]
  monsters: Monster[]
  recipes: SynthesisRecipe[]
  rules: GameRules
}
