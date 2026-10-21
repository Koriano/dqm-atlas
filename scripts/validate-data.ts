import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import Ajv from "ajv"
import { createGenerator } from "ts-json-schema-generator"

import type { GameData, SheetEffect } from "../src/domain/game"

const DATA_DIR = process.argv[2] ?? "src/data"
const I18N_DIR = "src/i18n"
const ASSET_DIR = "public/assets"

const FILE_TYPES = {
  "game.json": "GameFile",
  "monsters.json": "MonstersFile",
  "recipes.json": "RecipesFile",
  "skills.json": "SkillsFile",
} as const

const CATALOG_KEYS = [
  "families",
  "skills",
  "abilities",
  "traits",
  "equipmentTypes",
  "resistanceCategories",
  "resistanceStages",
  "locations",
  "timesOfDay",
  "seasons",
  "weathers",
  "storyStages",
  "eventKinds",
  "regions",
  "events",
  "eggColours",
  "monsterGroups",
] as const
type CatalogKey = (typeof CATALOG_KEYS)[number]

type Schema = Record<string, unknown>

// Unions discriminated by `type` become oneOf + discriminator so errors only report the matching branch.
function useTypeDiscriminators(node: unknown, definitions: Record<string, Schema>): void {
  if (typeof node !== "object" || node === null) return
  for (const child of Object.values(node)) useTypeDiscriminators(child, definitions)

  const schema = node as Schema
  const branches = schema.anyOf
  if (!Array.isArray(branches)) return

  const resolve = (branch: Schema): Schema =>
    typeof branch.$ref === "string"
      ? (definitions[decodeURIComponent(branch.$ref.replace("#/definitions/", ""))] ?? {})
      : branch
  const isTagged = (branch: Schema): boolean => {
    const properties = resolve(branch).properties as Record<string, Schema> | undefined
    return properties?.type?.const !== undefined
  }

  if (branches.every(isTagged)) {
    delete schema.anyOf
    schema.type = "object"
    schema.oneOf = branches
    schema.discriminator = { propertyName: "type" }
  }
}

const generator = createGenerator({
  path: "scripts/data-schema.ts",
  tsconfig: "tsconfig.json",
  skipTypeCheck: true,
})

const ajv = new Ajv({ allErrors: true, discriminator: true })
const validators = Object.fromEntries(
  Object.entries(FILE_TYPES).map(([file, type]) => {
    const schema = generator.createSchema(type)
    useTypeDiscriminators(schema, (schema.definitions ?? {}) as Record<string, Schema>)
    return [file, ajv.compile(schema)]
  }),
)

const errors: string[] = []
const warnings: string[] = []

function locate(data: unknown, instancePath: string): string {
  const [index] = instancePath.split("/").slice(1)
  if (!Array.isArray(data) || index === undefined) return instancePath || "/"
  const id = (data[Number(index)] as { id?: unknown } | undefined)?.id
  return typeof id === "string" ? `${instancePath} (id: ${id})` : instancePath
}

function duplicates<T>(values: T[]): T[] {
  const seen = new Set<T>()
  const repeated = new Set<T>()
  for (const value of values) (seen.has(value) ? repeated : seen).add(value)
  return [...repeated]
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"))
}

function checkReferences(dir: string, game: GameData): void {
  const at = (file: string, id?: string) => `${join(dir, file)}${id ? ` (id: ${id})` : ""}`
  const catalogs = Object.fromEntries(CATALOG_KEYS.map((key) => [key, new Set(game[key].map((entry) => entry.id))])) as Record<CatalogKey, Set<string>>
  const used = Object.fromEntries(CATALOG_KEYS.map((key) => [key, new Set<string>()])) as Record<CatalogKey, Set<string>>
  const ranks = game.rules.rankOrder
  const monsterIds = new Set(game.monsters.map((monster) => monster.id))

  const ref = (key: CatalogKey, id: string, where: string) => {
    used[key].add(id)
    if (!catalogs[key].has(id)) errors.push(`${where}: unknown ${key} id "${id}"`)
  }
  const rank = (value: string, where: string) => {
    if (!ranks.includes(value)) errors.push(`${where}: rank "${value}" is not in rules.rankOrder`)
  }
  const unique = (label: string, values: (string | number)[], where: string) => {
    for (const value of duplicates(values)) errors.push(`${where}: duplicate ${label} "${value}"`)
  }
  const icon = (folder: string, iconAssetKey: string, where: string) => {
    const file = join(ASSET_DIR, game.id, folder, `${iconAssetKey}.png`)
    if (!existsSync(file)) errors.push(`${where}: icon file ${file} does not exist`)
  }

  if (game.id !== dir.split(/[\\/]/).pop()) errors.push(`${at("game.json")}: id "${game.id}" does not match its folder`)
  for (const key of CATALOG_KEYS) unique(`${key} id`, game[key].map((entry) => entry.id), at("game.json"))
  unique("rank", ranks, at("game.json"))
  unique("monster id", game.monsters.map((monster) => monster.id), at("monsters.json"))
  unique("libraryId", game.monsters.map((monster) => monster.libraryId), at("monsters.json"))
  unique("recipe id", game.recipes.map((recipe) => recipe.id), at("recipes.json"))

  const { drawn, width, height } = game.familyIconFrame
  if (drawn.x + drawn.width > width || drawn.y + drawn.height > height)
    errors.push(`${at("game.json")}: familyIconFrame.drawn goes beyond the ${width}×${height} icon`)
  for (const family of game.families) icon("families", family.iconAssetKey, at("game.json", family.id))
  for (const kind of ["weathers", "seasons"] as const) {
    for (const entry of game[kind]) if (entry.iconAssetKey !== undefined) icon(kind, entry.iconAssetKey, at("game.json", entry.id))
  }
  for (const location of game.locations) {
    for (const [season, weathers] of Object.entries(location.weathersBySeason ?? {})) {
      ref("seasons", season, at("game.json", location.id))
      for (const id of weathers) ref("weathers", id, at("game.json", location.id))
    }
  }
  for (const type of game.equipmentTypes) icon("equipment", type.iconAssetKey, at("game.json", type.id))
  for (const event of game.events) {
    ref("eventKinds", event.kind, at("game.json", event.id))
    if (event.regionId !== undefined) ref("regions", event.regionId, at("game.json", event.id))
  }
  for (const group of game.monsterGroups) {
    const where = at("game.json", group.id)
    unique("group member", group.monsterIds, where)
    for (const id of group.monsterIds) if (!monsterIds.has(id)) errors.push(`${where}: unknown group member "${id}"`)
  }

  const sheetEffect = (effect: SheetEffect, where: string) => {
    for (const id of Object.keys(effect.resistanceBonus ?? {})) ref("resistanceCategories", id, where)
  }
  for (const trait of game.traits) if (trait.sheetEffect) sheetEffect(trait.sheetEffect, at("game.json", trait.id))
  const sizeVariants = game.rules.sizeVariants ?? []
  unique("size variant", sizeVariants.map((variant) => variant.size), at("game.json", "rules.sizeVariants"))
  for (const variant of sizeVariants) sheetEffect(variant, at("game.json", "rules.sizeVariants"))
  const stages = game.resistanceStages
  // Stages are not referenced by id: a resistance value reaches one.
  for (const stage of stages) used.resistanceStages.add(stage.id)
  if (stages.some((stage, index) => index > 0 && stage.min <= stages[index - 1].min))
    errors.push(`${at("game.json")}: resistanceStages are not in strictly ascending min order`)

  for (const skill of game.skills) {
    const where = at("skills.json", skill.id)
    for (const tier of skill.tiers) {
      if (tier.type === "ability") ref("abilities", tier.abilityId, where)
      else ref("traits", tier.traitId, where)
    }
    if (skill.tiers.some((tier, index) => index > 0 && tier.points < skill.tiers[index - 1].points))
      errors.push(`${where}: tiers are not in ascending points order`)
    unique("tier", skill.tiers.map((tier) => (tier.type === "ability" ? `ability ${tier.abilityId}` : `trait ${tier.traitId}`)), where)
  }

  for (const monster of game.monsters) {
    const where = at("monsters.json", monster.id)
    ref("families", monster.familyId, where)
    rank(monster.rank, where)
    ref("skills", monster.skillId, where)
    for (const trait of monster.traits) {
      ref("traits", trait.traitId, where)
      if (trait.size !== undefined && trait.size !== monster.size && !sizeVariants.some((variant) => variant.size === trait.size))
        errors.push(`${where}: trait "${trait.traitId}" is tied to size "${trait.size}", which the monster cannot have`)
    }
    unique("trait", monster.traits.map((trait) => `${trait.traitId} ${trait.level ?? 1} ${trait.size ?? ""}`), where)
    for (const id of monster.equipment ?? []) ref("equipmentTypes", id, where)
    for (const [id, resistance] of Object.entries(monster.resistances)) {
      ref("resistanceCategories", id, where)
      // A game with stages gives values, one without names each resistance: never both.
      if ((typeof resistance === "number") !== stages.length > 0)
        errors.push(`${where}: resistance "${id}" is ${typeof resistance === "number" ? "a value, but the game declares no resistanceStages" : "named, but the game gives values"}`)
    }
    for (const obtainment of monster.obtainments) {
      if (obtainment.type === "event") {
        ref("events", obtainment.eventId, where)
        continue
      }
      ref("locations", obtainment.locationId, where)
      if (obtainment.type === "egg") {
        for (const id of obtainment.eggColours) ref("eggColours", id, where)
        unique("egg colour", obtainment.eggColours, where)
        if (obtainment.storyStage !== undefined) ref("storyStages", obtainment.storyStage, where)
        continue
      }
      for (const situation of obtainment.when ?? []) {
        if (situation.timeOfDay !== undefined) ref("timesOfDay", situation.timeOfDay, where)
        if (situation.season !== undefined) ref("seasons", situation.season, where)
        if (situation.weather !== undefined) ref("weathers", situation.weather, where)
        if (situation.storyStage !== undefined) ref("storyStages", situation.storyStage, where)
      }
    }
    unique("scout location", monster.obtainments.flatMap((o) => (o.type === "scout" ? [o.locationId] : [])), where)
    unique("egg location", monster.obtainments.flatMap((o) => (o.type === "egg" ? [o.locationId] : [])), where)
    icon("monsters", monster.iconAssetKey, where)
  }

  const normalSynthesis = game.rules.normalSynthesis
  const ruleWhere = at("game.json", "rules.normalSynthesis")
  if (normalSynthesis.kind === "libraryOrder") {
    unique("resultMonsterIds entry", normalSynthesis.resultMonsterIds, ruleWhere)
    for (const id of normalSynthesis.resultMonsterIds) if (!monsterIds.has(id)) errors.push(`${ruleWhere}: unknown monster "${id}"`)
    unique("familyMix pair", normalSynthesis.familyMix.map(({ families }) => [...families].sort().join(" × ")), ruleWhere)
    for (const { families, result } of normalSynthesis.familyMix) {
      for (const familyId of [...families, result]) ref("families", familyId, ruleWhere)
      if (families[0] === families[1]) errors.push(`${ruleWhere}: familyMix pairs "${families[0]}" with itself`)
    }
  } else {
    unique("table pair", normalSynthesis.table.map(({ families }) => families.join(" × ")), ruleWhere)
    for (const { families, results } of normalSynthesis.table) {
      for (const familyId of families) ref("families", familyId, ruleWhere)
      if (families[0] === families[1]) errors.push(`${ruleWhere}: table pairs "${families[0]}" with itself`)
      for (const [rankValue, id] of Object.entries(results)) {
        rank(rankValue, ruleWhere)
        if (!monsterIds.has(id)) errors.push(`${ruleWhere}: unknown monster "${id}"`)
      }
    }
  }

  for (const recipe of game.recipes) {
    const where = at("recipes.json", recipe.id)
    if (!monsterIds.has(recipe.result)) errors.push(`${where}: unknown result monster "${recipe.result}"`)
    for (const parent of recipe.parents) {
      if (parent.type === "monster") {
        if (!monsterIds.has(parent.monsterId)) errors.push(`${where}: unknown parent monster "${parent.monsterId}"`)
        continue
      }
      if (parent.type === "group") {
        ref("monsterGroups", parent.groupId, where)
        continue
      }
      ref("families", parent.familyId, where)
      if (parent.minRank !== undefined) rank(parent.minRank, where)
      if (parent.maxRank !== undefined) rank(parent.maxRank, where)
      if (parent.minRank !== undefined && parent.maxRank !== undefined && ranks.indexOf(parent.minRank) > ranks.indexOf(parent.maxRank))
        errors.push(`${where}: minRank "${parent.minRank}" is above maxRank "${parent.maxRank}"`)
    }
  }

  for (const key of CATALOG_KEYS) {
    const unused = [...catalogs[key]].filter((id) => !used[key].has(id))
    if (unused.length) warnings.push(`${at("game.json")}: ${key} declared but unused: ${unused.join(", ")}`)
  }

  checkTranslations(game, catalogs)
}

function checkTranslations(game: GameData, catalogs: Record<CatalogKey, Set<string>>): void {
  for (const file of readdirSync(I18N_DIR).filter((name) => name.endsWith(".json"))) {
    const path = join(I18N_DIR, file)
    const app = readJson(path) as { games?: Record<string, unknown> }
    if (!app.games?.[game.id]) warnings.push(`${path}: missing games.${game.id}`)
  }

  const dir = join(I18N_DIR, game.id)
  if (!existsSync(dir)) {
    warnings.push(`${dir}: no translations for this game`)
    return
  }
  const expected: Record<string, Set<string>> = {
    ...catalogs,
    monsters: new Set(game.monsters.map((monster) => monster.id)),
    abilityDescriptions: catalogs.abilities,
    traitDescriptions: catalogs.traits,
  }
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".json"))) {
    const path = join(dir, file)
    const sections = readJson(path) as Record<string, Record<string, string>>
    for (const [section, ids] of Object.entries(expected)) {
      const names = sections[section] ?? {}
      const missing = [...ids].filter((id) => !names[id])
      const extra = Object.keys(names).filter((id) => !ids.has(id))
      if (missing.length) warnings.push(`${path}: ${section} missing translations: ${missing.join(", ")}`)
      if (extra.length) warnings.push(`${path}: ${section} translations for unknown ids: ${extra.join(", ")}`)
    }
    const unknownSections = Object.keys(sections).filter((section) => !(section in expected))
    if (unknownSections.length) warnings.push(`${path}: unknown sections: ${unknownSections.join(", ")}`)
  }
}

const games = readdirSync(DATA_DIR, { withFileTypes: true }).filter((entry) => entry.isDirectory())

for (const game of games) {
  const dir = join(DATA_DIR, game.name)
  const files: Record<string, unknown> = {}
  let schemaValid = true

  for (const [file, validate] of Object.entries(validators)) {
    const path = join(dir, file)
    try {
      files[file] = readJson(path)
    } catch (error) {
      errors.push(`${path}: ${(error as Error).message}`)
      schemaValid = false
      continue
    }
    if (validate(files[file])) continue
    schemaValid = false
    for (const error of validate.errors ?? [])
      errors.push(`${path} ${locate(files[file], error.instancePath)}: ${error.message} ${JSON.stringify(error.params)}`)
  }

  if (!schemaValid) continue
  checkReferences(dir, {
    ...(files["game.json"] as Omit<GameData, "monsters" | "recipes" | "skills">),
    monsters: files["monsters.json"] as GameData["monsters"],
    recipes: files["recipes.json"] as GameData["recipes"],
    skills: files["skills.json"] as GameData["skills"],
  })
  console.log(`checked ${dir}`)
}

for (const warning of warnings) console.warn(`⚠ ${warning}`)
for (const error of errors) console.error(`✗ ${error}`)

if (errors.length > 0) {
  console.error(`\n${errors.length} error(s), ${warnings.length} warning(s)`)
  process.exit(1)
}
console.log(`\n✓ no errors, ${warnings.length} warning(s)`)
