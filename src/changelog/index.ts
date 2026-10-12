import type { Language } from "../i18n"

/** Display order of the kinds within a release. */
export const CHANGE_KINDS = ["feature", "fix"] as const
export type ChangeKind = (typeof CHANGE_KINDS)[number]

/** One file per release, `<YYYY-MM-DD>.json`: the user-facing changes of that day by kind, one sentence per language. */
export type ReleaseFile = Partial<Record<ChangeKind, Record<Language, string>[]>>

export interface Release {
  /** Release day, `YYYY-MM-DD`, read from the file name. */
  date: string
  changes: ReleaseFile
}

const files = import.meta.glob<ReleaseFile>("./*.json", { eager: true, import: "default" })

/** Every release, most recent first. This module is loaded on demand: importing it pulls every release file. */
export const RELEASES: Release[] = Object.entries(files)
  .map(([path, changes]) => ({ date: path.slice(2, -5), changes }))
  .sort((a, b) => b.date.localeCompare(a.date))

function parseDay(date: string): Date {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(year, month - 1, day)
}

/** "il y a 3 j" / "3 days ago": how long ago the given day was, in the largest fitting unit. */
export function relativeDay(date: string, language: Language, now = new Date()): string {
  const days = Math.max(0, Math.floor((now.getTime() - parseDay(date).getTime()) / 86_400_000))
  const format = new Intl.RelativeTimeFormat(language, { numeric: "auto", style: "short" })
  if (days < 30) return format.format(-days, "day")
  if (days < 365) return format.format(-Math.floor(days / 30), "month")
  return format.format(-Math.floor(days / 365), "year")
}

export function fullDay(date: string, language: Language): string {
  return new Intl.DateTimeFormat(language, { dateStyle: "long" }).format(parseDay(date))
}
