/** Lower-case, accent-free, punctuation-free form used to compare names across languages. */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/[^a-z0-9?]+/g, " ")
    .trim()
}

/** True when every word of the query appears in one of the names (in any language). */
export function matchesSearch(query: string, names: string[]): boolean {
  const words = normalizeForSearch(query).split(" ").filter(Boolean)
  if (words.length === 0) return true
  const haystacks = names.map(normalizeForSearch)
  return haystacks.some((name) => words.every((word) => name.includes(word)))
}
