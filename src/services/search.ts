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

/** The normalised words of a query. */
export function searchWords(query: string): string[] {
  return normalizeForSearch(query).split(" ").filter(Boolean)
}

/** True when every word appears in one of the names, already normalised (in any language). */
export function matchesSearch(words: string[], names: string[]): boolean {
  return words.length === 0 || names.some((name) => words.every((word) => name.includes(word)))
}
