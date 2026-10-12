import type { GameId } from "../domain/game"
import en from "./en.json"
import fr from "./fr.json"

export const LANGUAGES = ["fr", "en"] as const
export type Language = (typeof LANGUAGES)[number]

export type AppMessages = typeof fr

/** Entity names of one game in one language: section (same key as the game.json catalog, plus `monsters`) → id → name. */
export type GameNames = Record<string, Record<string, string>>

const appMessages: Record<Language, AppMessages> = { fr, en }

const gameNameFiles = import.meta.glob<GameNames>("./*/*.json", { import: "default" })

/** Replaces `{name}` placeholders. */
export function formatText(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match))
}

export function appText(language: Language): AppMessages {
  return appMessages[language]
}

export function loadGameNames(gameId: GameId, language: Language): Promise<GameNames> {
  const load = gameNameFiles[`./${gameId}/${language}.json`]
  if (!load) return Promise.reject(new Error(`No ${language} names for game "${gameId}"`))
  return load()
}

export function detectLanguage(preferred: readonly string[] = navigator.languages): Language {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0]
    const match = LANGUAGES.find((language) => language === base)
    if (match) return match
  }
  return "en"
}
