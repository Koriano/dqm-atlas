/**
 * Counts the lines a text takes once wrapped at its spaces, as the browser does, in the page's font at `fontSize` px.
 * The text is measured, not guessed from its length: the same note is shorter or longer in another language.
 */
export function createLineCounter(fontSize: number): (text: string, width: number) => number {
  const context = document.createElement("canvas").getContext("2d")
  const counted = new Map<string, number>()
  return (text, width) => {
    if (!context) return 1
    const key = `${width}|${text}`
    const known = counted.get(key)
    if (known !== undefined) return known
    context.font = `${fontSize}px ${getComputedStyle(document.documentElement).fontFamily}`
    let lines = 1
    let line = ""
    for (const word of text.split(" ")) {
      const longer = line ? `${line} ${word}` : word
      if (line && context.measureText(longer).width > width) {
        lines += 1
        line = word
      } else line = longer
    }
    counted.set(key, lines)
    return lines
  }
}
