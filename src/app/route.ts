import { GAME_IDS } from "../data"
import type { GameId } from "../domain/game"

/** The page address only names a game and the monster whose tree is open: `#/<gameId>/<monsterId>`. */
export interface Route {
  gameId: GameId
  monsterId: string | null
}

/** A malformed escape (`%E0%A4%A`) is kept as written: it names nothing, like any other unknown id. */
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

export function readRoute(): Route | null {
  const [, gameId, monsterId] = window.location.hash.split("/").map(decodeSegment)
  const known = GAME_IDS.find((id) => id === gameId)
  return known ? { gameId: known, monsterId: monsterId || null } : null
}

/** The default game's atlas has no hash at all. */
export function routeHash({ gameId, monsterId }: Route): string {
  if (monsterId) return `#/${gameId}/${encodeURIComponent(monsterId)}`
  return gameId === GAME_IDS[0] ? "" : `#/${gameId}`
}
