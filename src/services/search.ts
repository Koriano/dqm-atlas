/** Lower-case, accent-free, punctuation-free form used to compare names across languages; katakana reads as hiragana. */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ\u3099\u309a]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/[ァ-ヶ]/g, (kana) => String.fromCharCode(kana.charCodeAt(0) - 0x60))
    .replace(/[^\p{L}\p{N}?]+/gu, " ")
    .trim()
}

/** True when every word of the query appears in one of the names (in any language). */
export function matchesSearch(query: string, names: string[]): boolean {
  const words = normalizeForSearch(query).split(" ").filter(Boolean)
  if (words.length === 0) return true
  const haystacks = names.map(normalizeForSearch)
  return haystacks.some((name) => words.every((word) => name.includes(word)))
}
