import type { AppContext } from "../../app/context"
import type { ScoutSituation } from "../../domain/monster"
import type { ParentCondition, SynthesisRecipe } from "../../domain/synthesis"
import { formatText } from "../../i18n"

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

/**
 * One line per scout situation, e.g. "Jour · Beau temps". Situations that only differ by their weather share a line,
 * and the weather is left out once the line covers every weather of the game ("Nuit").
 */
export function situationLines(app: AppContext, situations: ScoutSituation[]): string[] {
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
    const everyWeather = anyWeather || weathers.size === weatherCount
    return [
      situation.timeOfDay && app.entityName("timesOfDay", situation.timeOfDay),
      !everyWeather && [...weathers].map((weather) => app.entityName("weathers", weather)).join(", "),
      situation.storyStage && app.entityName("storyStages", situation.storyStage),
    ]
      .filter((part): part is string => !!part)
      .join(" · ")
  })
}
