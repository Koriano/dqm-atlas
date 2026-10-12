export interface FocusSize {
  width: number
  height: number
}

export interface FocusItem {
  id: string
  size: FocusSize
}

export interface FocusTree extends FocusItem {
  branches: FocusTree[]
}

export interface FocusOptions {
  gapX: number
  gapY: number
}

export interface PlacedItem extends FocusItem {
  x: number
  y: number
}

/** Tallest node of each level, level 0 being the nodes right next to the focus. */
function levelHeights(trees: FocusTree[]): number[] {
  const heights: number[] = []
  const visit = (tree: FocusTree, level: number) => {
    heights[level] = Math.max(heights[level] ?? 0, tree.size.height)
    tree.branches.forEach((branch) => visit(branch, level + 1))
  }
  trees.forEach((tree) => visit(tree, 0))
  return heights
}

/**
 * Places a forest of trees growing away from the focus: each node is centred over the span of its own branches and
 * every level is one row, so nothing wraps. `levelTop(level, height)` gives the y of a node on that level.
 */
function placeForest(trees: FocusTree[], gapX: number, levelTop: (level: number, height: number) => number): PlacedItem[] {
  const spans = new Map<FocusTree, number>()
  const span = (tree: FocusTree): number => {
    const branches = tree.branches.reduce((sum, branch) => sum + span(branch), 0) + gapX * Math.max(0, tree.branches.length - 1)
    const result = Math.max(tree.size.width, branches)
    spans.set(tree, result)
    return result
  }
  const placed: PlacedItem[] = []
  const place = (row: FocusTree[], left: number, level: number) => {
    let x = left
    for (const tree of row) {
      const width = spans.get(tree) ?? 0
      placed.push({ id: tree.id, size: tree.size, x: x + (width - tree.size.width) / 2, y: levelTop(level, tree.size.height) })
      const branchesWidth = tree.branches.reduce((sum, branch) => sum + (spans.get(branch) ?? 0), 0) + gapX * Math.max(0, tree.branches.length - 1)
      place(tree.branches, x + (width - branchesWidth) / 2, level + 1)
      x += width + gapX
    }
  }
  const total = trees.reduce((sum, tree) => sum + span(tree), 0) + gapX * Math.max(0, trees.length - 1)
  place(trees, -total / 2, 0)
  return placed
}

/**
 * Ancestors grow upwards from the focus (each level bottom-aligned), descendants downwards (each level top-aligned),
 * everything centred on x = 0.
 */
export function focusLayout(parents: FocusTree[], focus: FocusItem, children: FocusTree[], options: FocusOptions): PlacedItem[] {
  const { gapX, gapY } = options

  const parentHeights = levelHeights(parents)
  const parentBottoms: number[] = []
  let bottom = -gapY
  parentHeights.forEach((height, level) => {
    parentBottoms[level] = bottom
    bottom -= height + gapY
  })
  const placedParents = placeForest(parents, gapX, (level, height) => parentBottoms[level] - height)

  const childHeights = levelHeights(children)
  const childTops: number[] = []
  let top = focus.size.height + gapY
  childHeights.forEach((height, level) => {
    childTops[level] = top
    top += height + gapY
  })
  const placedChildren = placeForest(children, gapX, (level) => childTops[level])

  return [...placedParents, { ...focus, x: -focus.size.width / 2, y: 0 }, ...placedChildren]
}
