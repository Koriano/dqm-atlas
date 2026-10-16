import type { AppContext } from "../../app/context"
import type { ScoutSituation } from "../../domain/monster"
import type { ParentCondition, SynthesisRecipe } from "../../domain/synthesis"
import { formatText } from "../../i18n"
import { situationIconUrl } from "../../services/assets"

export function conditionName(app: AppContext, condition: ParentCondition): string {
  if (condition.type === "monster") return app.entityName("monsters", condition.monsterId)
  if (condition.type === "group") return app.entityName("monsterGroups", condition.groupId)
  return formatText(app.text.value.familyCondition, { family: app.entityName("families", condition.familyId) })
}

/** Rank bounds of a family condition, e.g. "rang ≤ A". */
export function conditionDetail(app: AppContext, condition: ParentCondition): string | null {
  if (condition.type !== "family") return null
  const bounds = [
    condition.minRank !== undefined && formatText(app.text.value.minRank, { rank: condition.minRank }),
    condition.maxRank !== undefined && formatText(app.text.value.maxRank, { rank: condition.maxRank }),
  ].filter((bound): bound is string => typeof bound === "string")
  return bounds.length > 0 ? bounds.join(", ") : null
}

export function recipeConditionsText(app: AppContext, recipe: SynthesisRecipe): string | null {
  const texts = recipe.conditions.map((condition) => formatText(app.text.value.minimumLevel, { level: condition.value }))
  return texts.length > 0 ? texts.join(", ") : null
}

/** The family every candidate belongs to, or null when they differ (or there are none). */
export function commonFamily(app: AppContext, monsterIds: string[]): string | null {
  const families = new Set(monsterIds.map((id) => app.monsters.value.get(id)?.familyId))
  const [family] = families
  return families.size === 1 && family ? family : null
}

/** "Famille Dragon · 12 choix" when every candidate shares a family, otherwise "12 choix". */
export function choiceHint(app: AppContext, monsterIds: string[]): string {
  const family = commonFamily(app, monsterIds)
  if (family) return formatText(app.text.value.familyChoice, { family: app.entityName("families", family), count: monsterIds.length })
  return formatText(app.text.value.choiceCount, { count: monsterIds.length })
}

/** A part of a note: a word, or one of the game's icons standing for a weather or a season. */
export type NotePart = { text: string } | { icon: string; label: string }

/** A weather or a season as the game shows it: its icon when it has one, its name otherwise. */
function situationPart(app: AppContext, kind: "weathers" | "seasons", id: string): NotePart {
  const label = app.entityName(kind, id)
  const iconAssetKey = app.game.value?.[kind].find((entry) => entry.id === id)?.iconAssetKey
  return iconAssetKey ? { icon: situationIconUrl(app.state.gameId, kind, iconAssetKey), label } : { text: label }
}

/**
 * One line per scout situation, e.g. "Jour · Beau temps", for a game without seasons. Situations that only differ by
 * their weather share a line, and the weather is left out once the line covers every weather of the game ("Nuit").
 */
export function situationLines(app: AppContext, situations: ScoutSituation[]): NotePart[][] {
  const weatherCount = app.game.value?.weathers.length ?? 0
  const groups = new Map<string, { situation: ScoutSituation; weathers: Set<string>; anyWeather: boolean }>()
  for (const situation of situations) {
    const key = `${situation.timeOfDay ?? ""}|${situation.storyStage ?? ""}`
    const group = groups.get(key) ?? { situation, weathers: new Set<string>(), anyWeather: false }
    if (situation.weather) group.weathers.add(situation.weather)
    else group.anyWeather = true
    groups.set(key, group)
  }
  return [...groups.values()].map(({ situation, weathers, anyWeather }) => {
    const parts: NotePart[] = []
    if (situation.timeOfDay) parts.push({ text: app.entityName("timesOfDay", situation.timeOfDay) })
    if (!anyWeather && weathers.size < weatherCount) parts.push(...[...weathers].map((weather) => situationPart(app, "weathers", weather)))
    if (situation.storyStage) parts.push({ text: app.entityName("storyStages", situation.storyStage) })
    return parts
  })
}

/** One season of a scout location: whether the monster appears then, and in which weathers when not in all of them. */
export interface SeasonCell {
  season: NotePart
  available: boolean
  /** Empty when the monster appears in every weather of that season. */
  weathers: NotePart[]
  /** The whole cell in words, for screen readers. */
  description: string
}

/**
 * The situations of a scout location as one row of the game's seasons per story stage (the row without a stage
 * first), for a game with seasons.
 */
export function seasonRows(app: AppContext, situations: ScoutSituation[], locationId: string): { stage: string | null; cells: SeasonCell[] }[] {
  const game = app.game.value
  if (!game) return []
  const placeWeathers = game.locations.find((location) => location.id === locationId)?.weathersBySeason ?? {}
  const stages = [...new Set(situations.map((situation) => situation.storyStage ?? null))].sort((a, b) => (a === null ? -1 : b === null ? 1 : 0))
  const weatherOrder = game.weathers.map((weather) => weather.id)
  return stages.map((stage) => {
    const ofStage = situations.filter((situation) => (situation.storyStage ?? null) === stage)
    const cells = game.seasons.map((season): SeasonCell => {
      const inSeason = ofStage.filter((situation) => situation.season === undefined || situation.season === season.id)
      const anyWeather = inSeason.some((situation) => situation.weather === undefined)
      const weathers = [...new Set(inSeason.flatMap((situation) => (situation.weather ? [situation.weather] : [])))]
      const every = anyWeather || (placeWeathers[season.id] ?? []).every((weather) => weathers.includes(weather))
      const shown = every ? [] : weathers.sort((a, b) => weatherOrder.indexOf(a) - weatherOrder.indexOf(b))
      const available = inSeason.length > 0
      const detail = !available
        ? app.text.value.notInSeason
        : shown.length === 0
          ? app.text.value.anyWeather
          : shown.map((weather) => app.entityName("weathers", weather)).join(", ")
      return {
        season: situationPart(app, "seasons", season.id),
        available,
        weathers: shown.map((weather) => situationPart(app, "weathers", weather)),
        description: formatText(app.text.value.seasonSituation, { season: app.entityName("seasons", season.id), detail }),
      }
    })
    return { stage: stage && app.entityName("storyStages", stage), cells }
  })
}
