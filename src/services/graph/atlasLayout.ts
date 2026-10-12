import type { GameData } from "../../domain/game"
import type { MonsterSize, Rank } from "../../domain/monster"

export interface AtlasOptions {
  /** Width of one icon slot; an icon is one slot wide and 1–3 slots tall. */
  slot: number
  slotsBySize: Record<MonsterSize, number>
  /** Icons per line inside a family × rank cell. */
  perRow: number
  gap: number
  columnGap: number
  rowGap: number
  /** Room kept above the grid for family labels and left of it for rank labels. */
  headerHeight: number
  sideWidth: number
}

export interface AtlasBox {
  x: number
  y: number
  width: number
  height: number
}

export interface AtlasLayout {
  monsters: (AtlasBox & { monsterId: string })[]
  families: (AtlasBox & { familyId: string })[]
  ranks: (AtlasBox & { rank: Rank })[]
  /** Table-like separators, halfway through the gaps: below the header and between rows, right of the rank labels and between columns. */
  rowDividers: number[]
  columnDividers: number[]
  width: number
  height: number
}

/**
 * Families as columns, ranks as rows. Inside a cell, monsters in library order drop into the
 * shortest of `perRow` stacks, so tall (M/G) icons never overlap their neighbours.
 */
export function atlasLayout(game: GameData, options: AtlasOptions): AtlasLayout {
  const { slot, slotsBySize, perRow, gap, columnGap, rowGap, headerHeight, sideWidth } = options
  const columnWidth = perRow * slot + (perRow - 1) * gap

  const cells = new Map<string, { monsterId: string; dx: number; dy: number; height: number }[]>()
  const cellHeights = new Map<string, number>()
  for (const monster of [...game.monsters].sort((a, b) => a.libraryId - b.libraryId)) {
    const key = `${monster.familyId}|${monster.rank}`
    const placed = cells.get(key) ?? []
    const stacks = Array.from({ length: perRow }, (_, i) => Math.max(0, ...placed.filter((p) => p.dx === i * (slot + gap)).map((p) => p.dy + p.height + gap)))
    const stack = stacks.indexOf(Math.min(...stacks))
    const height = slotsBySize[monster.size] * slot
    placed.push({ monsterId: monster.id, dx: stack * (slot + gap), dy: stacks[stack], height })
    cells.set(key, placed)
    cellHeights.set(key, Math.max(cellHeights.get(key) ?? 0, stacks[stack] + height))
  }

  const rowHeights = game.rules.rankOrder.map((rank) => Math.max(slot, ...game.families.map((family) => cellHeights.get(`${family.id}|${rank}`) ?? 0)))
  const rowTops: number[] = []
  let y = headerHeight + rowGap / 2
  for (const height of rowHeights) {
    rowTops.push(y)
    y += height + rowGap
  }
  const totalHeight = y - rowGap / 2
  const columnLeft = (index: number) => sideWidth + columnGap / 2 + index * (columnWidth + columnGap)
  const width = columnLeft(game.families.length) - columnGap / 2

  const monsters: AtlasLayout["monsters"] = []
  game.families.forEach((family, column) => {
    game.rules.rankOrder.forEach((rank, row) => {
      for (const placed of cells.get(`${family.id}|${rank}`) ?? []) {
        monsters.push({ monsterId: placed.monsterId, x: columnLeft(column) + placed.dx, y: rowTops[row] + placed.dy, width: slot, height: placed.height })
      }
    })
  })

  return {
    monsters,
    families: game.families.map((family, column) => ({ familyId: family.id, x: columnLeft(column), y: 0, width: columnWidth, height: headerHeight })),
    ranks: game.rules.rankOrder.map((rank, row) => ({ rank, x: 0, y: rowTops[row], width: sideWidth, height: rowHeights[row] })),
    rowDividers: rowTops.map((top) => top - rowGap / 2),
    columnDividers: game.families.map((_, column) => columnLeft(column) - columnGap / 2),
    width,
    height: totalHeight,
  }
}
